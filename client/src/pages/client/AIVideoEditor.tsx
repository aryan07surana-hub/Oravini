import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Clapperboard, Sparkles, Zap, BookOpen, DollarSign, Smile, Film, GraduationCap, User,
  Target, Copy, Check, ChevronDown, ChevronUp, Loader2, Link2, FileText, Lightbulb,
  Scissors, Clock, Volume2, Eye, ListChecks, Shuffle, Wand2, Music, Layers, Star,
  TrendingUp, Play, RotateCcw, Hash
} from "lucide-react";

const MODES = [
  { id: "viral", label: "Viral", emoji: "🔥", icon: Zap, desc: "Fast cuts, bold captions, maximum energy", color: "from-red-500/20 to-orange-500/10 border-red-500/30" },
  { id: "story", label: "Story", emoji: "🎬", icon: Film, desc: "Narrative arc, emotional beats", color: "from-purple-500/20 to-purple-500/5 border-purple-500/30" },
  { id: "sales", label: "Sales", emoji: "💰", icon: DollarSign, desc: "Problem → solution → CTA", color: "from-green-500/20 to-green-500/5 border-green-500/30" },
  { id: "funny", label: "Funny", emoji: "😂", icon: Smile, desc: "Timing, punchlines, reaction cuts", color: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30" },
  { id: "cinematic", label: "Cinematic", emoji: "🎥", icon: Clapperboard, desc: "B-roll heavy, dramatic pacing", color: "from-blue-500/20 to-blue-500/5 border-blue-500/30" },
  { id: "educational", label: "Educational", emoji: "📚", icon: GraduationCap, desc: "Numbered points, clarity first", color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30" },
  { id: "personal_brand", label: "Personal Brand", emoji: "🚀", icon: User, desc: "Authentic voice, trust-building", color: "from-primary/20 to-primary/5 border-primary/30" },
];

const GOALS = [
  { id: "viral", label: "Go Viral", emoji: "⚡", desc: "Shares & saves" },
  { id: "followers", label: "Get Followers", emoji: "👥", desc: "Build audience" },
  { id: "sales", label: "Sell Product", emoji: "💳", desc: "Drive purchases" },
  { id: "brand", label: "Build Brand", emoji: "🏆", desc: "Authority & trust" },
];

const TEMPLATES = [
  {
    id: "hook-reel",
    mode: "viral",
    emoji: "🔥",
    name: "The Hook Reel",
    duration: "15–30s",
    tagline: "Grab attention, deliver one insight, leave them wanting more",
    structure: [
      { label: "Pattern Interrupt", time: "0–3s", note: "Bold statement or shocking fact — no intros" },
      { label: "Problem Hook", time: "3–8s", note: "What are they missing or doing wrong?" },
      { label: "Value Drop", time: "8–22s", note: "The insight/solution they didn't know" },
      { label: "Follow CTA", time: "22–30s", note: "Give them a reason to follow right now" },
    ],
    hooks: ["Nobody tells you this about X...", "I gained 10k followers by doing ONE thing...", "Stop doing X — here's why it's killing your growth"],
  },
  {
    id: "story-arc",
    mode: "story",
    emoji: "🎬",
    name: "The Story Arc",
    duration: "30–60s",
    tagline: "Emotion first, insight second — make them feel before they think",
    structure: [
      { label: "Open with Conflict", time: "0–5s", note: "Start mid-story — drop them in the action" },
      { label: "Build Tension", time: "5–20s", note: "Show the struggle — audience relates here" },
      { label: "Turning Point", time: "20–40s", note: "The realization or discovery" },
      { label: "Resolution + Lesson", time: "40–55s", note: "What changed and what they can apply" },
      { label: "CTA", time: "55–60s", note: "Invite them to share their own story" },
    ],
    hooks: ["I almost quit until I realized...", "This one moment changed everything for me...", "Nobody believed me when I said..."],
  },
  {
    id: "sales-convert",
    mode: "sales",
    emoji: "💰",
    name: "The Sales Converter",
    duration: "45–60s",
    tagline: "Drive decisions — every second moves them closer to yes",
    structure: [
      { label: "Pain Hook", time: "0–5s", note: "Name the exact frustration they feel daily" },
      { label: "Agitate Problem", time: "5–15s", note: "Make the pain feel more real and urgent" },
      { label: "Introduce Solution", time: "15–30s", note: "Your product/service as the obvious answer" },
      { label: "Social Proof", time: "30–45s", note: "Result, testimonial, or transformation" },
      { label: "CTA + Urgency", time: "45–60s", note: "Clear next step — link in bio, DM, etc." },
    ],
    hooks: ["If you're still struggling with X, this is why...", "We helped 100 people fix X in 30 days...", "Stop wasting money on X that doesn't work..."],
  },
  {
    id: "funny-timing",
    mode: "funny",
    emoji: "😂",
    name: "The Comedy Reel",
    duration: "15–30s",
    tagline: "Timing is the edit — set up, pause, punchline, reaction",
    structure: [
      { label: "Relatable Setup", time: "0–5s", note: "Situation everyone recognizes immediately" },
      { label: "Escalation", time: "5–12s", note: "Build the absurdity — audience anticipates" },
      { label: "Pause (Beat)", time: "12–14s", note: "Hold for 1-2s before punchline — this is key" },
      { label: "Punchline + Reaction", time: "14–22s", note: "The unexpected twist or callback" },
      { label: "Tag", time: "22–30s", note: "Quick second punch or caption callback" },
    ],
    hooks: ["When you finally do X and it actually works...", "POV: You tried X and then...", "Nobody talks about what happens when you..."],
  },
  {
    id: "cinematic-reveal",
    mode: "cinematic",
    emoji: "🎥",
    name: "The Cinematic Reveal",
    duration: "30–60s",
    tagline: "Visual storytelling — show, don't tell. Make it beautiful",
    structure: [
      { label: "Atmospheric Open", time: "0–5s", note: "B-roll establishing shot, no talking yet" },
      { label: "Slow Reveal", time: "5–20s", note: "Voiceover over visuals — build curiosity" },
      { label: "Climax Moment", time: "20–40s", note: "The visual payoff — music sync cut here" },
      { label: "Text Overlay Lesson", time: "40–55s", note: "On-screen text delivers the takeaway" },
      { label: "Silent CTA", time: "55–60s", note: "Minimal text CTA — let the visual do the work" },
    ],
    hooks: ["The moment everything changed...", "What most people never see...", "This is what X actually looks like..."],
  },
  {
    id: "educational-breakdown",
    mode: "educational",
    emoji: "📚",
    name: "The Tutorial Breakdown",
    duration: "30–60s",
    tagline: "Teach one thing perfectly — structure beats entertainment here",
    structure: [
      { label: "Promise Hook", time: "0–4s", note: "Tell them exactly what they'll learn by the end" },
      { label: "Point 1 + Example", time: "4–18s", note: "First concept with a concrete example" },
      { label: "Point 2 + Example", time: "18–32s", note: "Second concept — keep it bite-sized" },
      { label: "Point 3 + Example", time: "32–46s", note: "Third concept — use visuals if possible" },
      { label: "Recap + Save CTA", time: "46–60s", note: "Summarize 3 points, tell them to save this" },
    ],
    hooks: ["3 things I wish I knew about X...", "Here's how X actually works in 60 seconds...", "The X framework that changed everything..."],
  },
  {
    id: "personal-brand",
    mode: "personal_brand",
    emoji: "🚀",
    name: "The Brand Builder",
    duration: "30–60s",
    tagline: "Make them know, like, and trust you — in under a minute",
    structure: [
      { label: "Who You Are Hook", time: "0–5s", note: "Direct camera address — establish identity fast" },
      { label: "Personal Story", time: "5–20s", note: "Real moment that shows your values" },
      { label: "Core Belief", time: "20–35s", note: "Your unique point of view on the topic" },
      { label: "Value Give", time: "35–50s", note: "One actionable thing they can use today" },
      { label: "Community CTA", time: "50–60s", note: "Invite them into your world — follow + comment" },
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
  hook: "bg-red-500",
  body: "bg-blue-500",
  payoff: "bg-green-500",
  cta: "bg-primary",
  transition: "bg-muted-foreground",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors p-1">
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
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 34}`}
          strokeDashoffset={`${2 * Math.PI * 34 * (1 - score / 100)}`}
          strokeLinecap="round" />
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

export default function AIVideoEditor({ useAdmin }: { useAdmin?: boolean }) {
  const { toast } = useToast();
  const Layout = useAdmin ? AdminLayout : ClientLayout;

  const [inputType, setInputType] = useState<"url" | "script" | "describe">("script");
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState("viral");
  const [goal, setGoal] = useState("viral");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("");
  const [duration, setDuration] = useState("");
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { inputType, mode, goal, audience, style, duration };
      if (inputType === "url") payload.instagramUrl = inputValue;
      else if (inputType === "script") payload.script = inputValue;
      else payload.description = inputValue;
      return await apiRequest("POST", "/api/video/analyze", payload);
    },
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("timeline");
    },
    onError: (err: any) => toast({ title: "Analysis failed", description: err.message, variant: "destructive" }),
  });

  const canAnalyze = inputValue.trim().length > 5;
  const selectedMode = MODES.find(m => m.id === mode);

  const handleAnalyze = () => {
    if (!canAnalyze) return toast({ title: "Add some content first", description: "Paste a URL, script, or describe your video", variant: "destructive" });
    analyzeMutation.mutate();
  };

  const TABS = [
    { id: "timeline", label: "Edit Plan", icon: Scissors },
    { id: "captions", label: "Captions", icon: Hash },
    { id: "hooks", label: "Hooks", icon: Zap },
    { id: "visuals", label: "Visuals", icon: Eye },
    { id: "checklist", label: "Checklist", icon: ListChecks },
    { id: "variations", label: "Variations", icon: Shuffle },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Clapperboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">AI Video Editor</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Paste your script or link — AI builds your full edit plan</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid="btn-templates"
            onClick={() => setShowTemplates(v => !v)}
            className="border-primary/30 text-primary hover:bg-primary/10 gap-2"
          >
            <Layers className="w-4 h-4" />
            Template Library
            {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Template Library */}
        {showTemplates && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">7 proven video structures — click to expand</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEMPLATES.map(t => (
                <div key={t.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/10 transition-colors"
                    onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                    data-testid={`template-${t.id}`}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{t.name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">{t.duration}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.tagline}</p>
                    </div>
                    {expandedTemplate === t.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {expandedTemplate === t.id && (
                    <div className="border-t border-card-border px-4 pb-4 space-y-3">
                      <div className="space-y-2 mt-3">
                        {t.structure.map((s, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-14 flex-shrink-0 text-center">
                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{s.time}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{s.label}</p>
                              <p className="text-[11px] text-muted-foreground">{s.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-muted/10 rounded-xl p-3">
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-2">Example Hooks</p>
                        <div className="space-y-1">
                          {t.hooks.map((h, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-primary text-xs mt-0.5">›</span>
                              <p className="text-xs text-foreground italic">"{h}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs"
                        onClick={() => {
                          setMode(t.mode);
                          const hookText = t.hooks[0];
                          setInputValue(hookText);
                          setInputType("script");
                          setShowTemplates(false);
                          toast({ title: `${t.name} template loaded`, description: "Edit the hook and click Analyze" });
                        }}
                      >
                        Use this template
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Zone */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          {/* Input type tabs */}
          <div className="flex border-b border-card-border">
            {([
              { id: "script", label: "Paste Script", icon: FileText },
              { id: "url", label: "Instagram URL", icon: Link2 },
              { id: "describe", label: "Describe Video", icon: Lightbulb },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                data-testid={`input-type-${id}`}
                onClick={() => { setInputType(id); setInputValue(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${inputType === id ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/10"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {inputType === "url" && (
              <div>
                <Input
                  data-testid="input-url"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="https://www.instagram.com/reel/... or Google Drive link"
                  className="bg-background border-border text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-2">Instagram reels: AI extracts caption, likes, views and uses that data. Google Drive: paste link + describe content below.</p>
              </div>
            )}
            {inputType === "script" && (
              <Textarea
                data-testid="input-script"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Paste your video script, voiceover, or raw content idea here..."
                className="bg-background border-border text-sm min-h-[120px] resize-none"
              />
            )}
            {inputType === "describe" && (
              <Textarea
                data-testid="input-describe"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder='Describe your video idea or say how you want it to feel... e.g. "Make it Alex Hormozi style — fast cuts, bold captions, high energy, about why most people fail at sales"'
                className="bg-background border-border text-sm min-h-[120px] resize-none"
              />
            )}

            {/* Config row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target Audience (optional)</p>
                <Input
                  data-testid="input-audience"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. fitness beginners, entrepreneurs 25-40..."
                  className="bg-background border-border text-xs h-8"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Style Reference (optional)</p>
                <Input
                  data-testid="input-style"
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  placeholder="e.g. Alex Hormozi, MrBeast, Gary Vee..."
                  className="bg-background border-border text-xs h-8"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mode + Goal Selectors */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Editing Mode</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  data-testid={`mode-${m.id}`}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${mode === m.id ? `bg-gradient-to-br ${m.color}` : "border-card-border bg-card hover:bg-muted/10"}`}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Goal</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  data-testid={`goal-${g.id}`}
                  onClick={() => setGoal(g.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${goal === g.id ? "bg-primary/10 border-primary/40 text-primary" : "border-card-border bg-card hover:bg-muted/10 text-muted-foreground"}`}
                >
                  <span className="text-lg">{g.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{g.label}</p>
                    <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <Button
          data-testid="btn-analyze"
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending || !canAnalyze}
          className="w-full h-12 text-sm font-black bg-primary text-black hover:bg-primary/90 gap-2"
        >
          {analyzeMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> AI is building your edit plan…</>
          ) : (
            <><Wand2 className="w-4 h-4" /> Edit For Me — Generate Full Edit Plan</>
          )}
        </Button>

        {/* Loading State */}
        {analyzeMutation.isPending && (
          <div className="bg-card border border-card-border rounded-2xl p-6 space-y-3">
            {["Analyzing your content structure...", "Identifying cut points and dead space...", "Building your edit timeline...", "Generating captions, hooks & visuals..."].map((step, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {result && !analyzeMutation.isPending && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <div className="flex items-start gap-5">
                <ScoreRing score={result.overallScore ?? 0} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold border">
                      {selectedMode?.emoji} {selectedMode?.label} Mode
                    </Badge>
                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground capitalize">
                      Goal: {GOALS.find(g => g.id === goal)?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
                  {result.styleGuide && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {Object.entries(result.styleGuide).map(([k, v]) => (
                        <div key={k} className="bg-muted/10 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-xs text-foreground font-medium">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Result tabs */}
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
              <div className="flex border-b border-card-border overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    data-testid={`tab-result-${id}`}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === id ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/10"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5 space-y-4">

                {/* Timeline Tab */}
                {activeTab === "timeline" && (
                  <div className="space-y-4">
                    <SectionHeader icon={Play} title="Edit Timeline" desc="Timestamped cut-by-cut instructions for your editor" color="from-blue-500/20 to-blue-500/5 border-blue-500/30" />

                    {/* Visual timeline bar */}
                    {result.timeline?.length > 0 && (
                      <div className="space-y-1 mb-4">
                        <div className="flex gap-0.5 h-6 rounded-lg overflow-hidden">
                          {result.timeline.map((seg: any, i: number) => (
                            <div
                              key={i}
                              className={`flex-1 ${TYPE_COLORS[seg.type] || "bg-muted"} opacity-80 hover:opacity-100 transition-opacity relative group cursor-default`}
                              title={`${seg.startLabel}–${seg.endLabel}: ${seg.label} (${seg.action})`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap mt-2">
                          {["hook", "body", "payoff", "cta", "transition"].map(t => (
                            <div key={t} className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-sm ${TYPE_COLORS[t]}`} />
                              <span className="text-[10px] text-muted-foreground capitalize">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline segments */}
                    <div className="space-y-2">
                      {(result.timeline || []).map((seg: any, i: number) => (
                        <div key={i} data-testid={`timeline-seg-${i}`} className="flex items-start gap-3 p-3 bg-muted/10 rounded-xl border border-muted/20">
                          <div className="flex-shrink-0 text-center w-20">
                            <p className="text-[10px] font-mono text-primary">{seg.startLabel}–{seg.endLabel}</p>
                            <div className={`w-full mt-1 h-1.5 rounded-full ${TYPE_COLORS[seg.type] || "bg-muted"} opacity-60`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-xs font-bold text-foreground">{seg.label}</p>
                              <Badge className={`text-[9px] px-1.5 py-0 border ${ACTION_COLORS[seg.action] || "bg-muted text-muted-foreground border-muted"}`}>
                                {seg.action}
                              </Badge>
                              {seg.energyLevel && (
                                <span className="text-[10px] text-muted-foreground">Energy: {seg.energyLevel}/10</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{seg.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cut suggestions */}
                    {result.cuts?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                          <Scissors className="w-3.5 h-3.5 text-red-400" /> Cut Suggestions
                        </p>
                        <div className="space-y-2">
                          {result.cuts.map((c: any, i: number) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${c.severity === "high" ? "bg-red-500/10 border-red-500/20" : c.severity === "medium" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-muted/10 border-muted/20"}`}>
                              <div className="flex-shrink-0 w-16 text-center">
                                <p className="text-[10px] font-mono text-foreground">{c.timestamp}</p>
                                <Badge className={`mt-1 text-[9px] px-1.5 py-0 border-0 ${c.severity === "high" ? "bg-red-500/20 text-red-400" : c.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"}`}>
                                  {c.severity}
                                </Badge>
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-foreground font-medium">{c.reason}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">→ {c.fix}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Captions Tab */}
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
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-foreground">Post Caption</p>
                          <CopyButton text={result.captions.postCaption} />
                        </div>
                        <div className="p-4 bg-muted/10 rounded-xl border border-muted/20">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.captions.postCaption}</p>
                        </div>
                      </div>
                    )}

                    {result.captions?.hashtags?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-foreground">Hashtags</p>
                          <CopyButton text={result.captions.hashtags.join(" ")} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.captions.hashtags.map((h: string, i: number) => (
                            <span key={i} className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 font-medium">{h}</span>
                          ))}
                        </div>
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

                {/* Hooks Tab */}
                {activeTab === "hooks" && (
                  <div className="space-y-5">
                    <SectionHeader icon={Zap} title="Hook Optimizer" desc="Upgraded first-3-second hooks to stop the scroll" color="from-yellow-500/20 to-yellow-500/5 border-yellow-500/30" />

                    {result.hook && (
                      <>
                        <div className="p-4 bg-muted/10 rounded-xl border border-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current Hook</p>
                            <Badge variant="outline" className="text-xs border-muted-foreground/30">
                              Score: {result.hook.score}/10
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground italic">"{result.hook.current}"</p>
                        </div>

                        {result.hook.improved?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                              <Star className="w-3.5 h-3.5 text-primary" /> Upgraded Hooks
                            </p>
                            <div className="space-y-2">
                              {result.hook.improved.map((h: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl">
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-black text-primary">{i + 1}</span>
                                  </div>
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
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-blue-400" /> Audio Recommendations
                        </p>
                        <div className="space-y-2">
                          {result.audio.map((a: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                              <Volume2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-foreground">{a.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{a.mood} · {a.why}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Visuals Tab */}
                {activeTab === "visuals" && (
                  <div className="space-y-4">
                    <SectionHeader icon={Eye} title="Visual Enhancement" desc="Zoom, B-roll, text overlays and effects — timestamped" color="from-cyan-500/20 to-cyan-500/5 border-cyan-500/30" />
                    <div className="space-y-2">
                      {(result.visuals || []).map((v: any, i: number) => {
                        const typeIcon: Record<string, any> = { zoom: TrendingUp, broll: Film, "text-overlay": FileText, transition: Shuffle, effect: Sparkles };
                        const Icon = typeIcon[v.type] || Sparkles;
                        const typeColor: Record<string, string> = { zoom: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", broll: "text-purple-400 bg-purple-500/10 border-purple-500/20", "text-overlay": "text-blue-400 bg-blue-500/10 border-blue-500/20", transition: "text-green-400 bg-green-500/10 border-green-500/20", effect: "text-primary bg-primary/10 border-primary/20" };
                        return (
                          <div key={i} className="flex items-start gap-3 p-3 bg-muted/10 rounded-xl border border-muted/20">
                            <div className="flex-shrink-0 text-center w-14">
                              <p className="text-[10px] font-mono text-primary">{v.timestamp}</p>
                              <div className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold ${typeColor[v.type] || "text-muted-foreground bg-muted border-muted"}`}>
                                <Icon className="w-2.5 h-2.5" />{v.type}
                              </div>
                            </div>
                            <p className="text-xs text-foreground flex-1 mt-1">{v.description}</p>
                          </div>
                        );
                      })}
                      {!result.visuals?.length && <p className="text-xs text-muted-foreground text-center py-4">No visual suggestions generated.</p>}
                    </div>
                  </div>
                )}

                {/* Checklist Tab */}
                {activeTab === "checklist" && (
                  <div className="space-y-4">
                    <SectionHeader icon={ListChecks} title="Editing Checklist" desc="Step-by-step guide to complete your edit" color="from-green-500/20 to-green-500/5 border-green-500/30" />
                    <div className="space-y-2">
                      {(result.checklist || []).map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/10 rounded-xl border border-muted/20">
                          <div className="w-5 h-5 rounded border border-muted-foreground/30 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                    {result.checklist?.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-muted-foreground/20 text-muted-foreground text-xs"
                        onClick={() => navigator.clipboard.writeText((result.checklist || []).join("\n"))}
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" /> Copy Full Checklist
                      </Button>
                    )}
                  </div>
                )}

                {/* Variations Tab */}
                {activeTab === "variations" && (
                  <div className="space-y-4">
                    <SectionHeader icon={Shuffle} title="Content Variations" desc="3 different versions of the same video — A/B test your content" color="from-orange-500/20 to-orange-500/5 border-orange-500/30" />
                    <div className="space-y-3">
                      {(result.variations || []).map((v: any, i: number) => (
                        <div key={i} className="bg-card border border-card-border rounded-2xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-black text-primary">V{i + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{v.name}</p>
                              {v.targetPlatform && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground mt-0.5">{v.targetPlatform}</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{v.description}</p>
                          {v.changes?.length > 0 && (
                            <div className="space-y-1">
                              {v.changes.map((c: string, j: number) => (
                                <div key={j} className="flex items-start gap-2">
                                  <span className="text-primary text-xs mt-0.5 flex-shrink-0">→</span>
                                  <p className="text-xs text-foreground">{c}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {!result.variations?.length && <p className="text-xs text-muted-foreground text-center py-4">No variations generated.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Re-analyze with different settings */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResult(null); setActiveTab("timeline"); }}
              className="w-full border-muted-foreground/20 text-muted-foreground text-xs gap-2"
              data-testid="btn-reset"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start Over / Try Different Mode
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
