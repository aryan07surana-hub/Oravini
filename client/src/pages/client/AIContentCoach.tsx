import { useState, useRef, useEffect } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles, Zap, Wand2, RefreshCw, Target, TrendingUp, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Copy, Check, Send, Instagram,
  Flame, Brain, BarChart2, ArrowRight, MessageCircle, Loader2, Play,
} from "lucide-react";

const GOLD = "#d4b461";

type Mood = "weak" | "decent" | "strong" | "idle" | "thinking";

type ChatMessage = {
  role: "coach" | "user";
  content: string;
  analysis?: AnalysisData | null;
  competitorData?: any;
  timestamp: number;
};

type AnalysisData = {
  overallScore: number;
  scores: { hook: number; clarity: number; emotion: number; pacing: number; retention: number; payoff: number };
  issues: Array<{ line: string; problem: string; fix: string; severity: string }>;
  strengths: string[];
  dropoffs: Array<{ second: number; reason: string; severity: string }>;
  verdict: string;
};

const GOALS = [
  { id: "viral", label: "🔥 Go Viral", color: "border-red-500/40 text-red-400 bg-red-500/10" },
  { id: "sales", label: "💰 Drive Sales", color: "border-green-500/40 text-green-400 bg-green-500/10" },
  { id: "engagement", label: "❤️ Boost Engagement", color: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
];

const MODES = [
  { id: "breakdown", label: "Script Breakdown", icon: Brain },
  { id: "pre-post", label: "Pre-Post Check", icon: Play },
  { id: "competitor", label: "Competitor Intel", icon: Instagram },
];

// ── Animated Coach Character ────────────────────────────────────────────────
function CoachCharacter({ mood, thinking }: { mood: Mood; thinking: boolean }) {
  const face =
    mood === "strong" ? "🔥" :
    mood === "decent" ? "😏" :
    mood === "weak" ? "😐" :
    thinking ? "🤔" : "🤙";

  const glowColor =
    mood === "strong" ? "rgba(52,211,153,0.6)" :
    mood === "decent" ? "rgba(212,180,97,0.6)" :
    mood === "weak" ? "rgba(248,113,113,0.5)" :
    "rgba(212,180,97,0.3)";

  const ringColor =
    mood === "strong" ? "#34d399" :
    mood === "decent" ? GOLD :
    mood === "weak" ? "#f87171" : GOLD;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <style>{`
        @keyframes coach-float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes coach-think {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes coach-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes coach-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-14px) scale(1.08); }
          60% { transform: translateY(-6px) scale(1.03); }
        }
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      <div className="relative" style={{
        animation: thinking ? "coach-think 0.8s ease-in-out infinite" : "coach-float 3.5s ease-in-out infinite",
      }}>
        {/* Outer glow ring */}
        <div style={{
          width: 88, height: 88,
          borderRadius: "50%",
          boxShadow: `0 0 32px ${glowColor}, 0 0 60px ${glowColor}50`,
          background: `radial-gradient(circle, ${ringColor}22 0%, transparent 70%)`,
          position: "absolute", inset: -8,
        }} />

        {/* Spinning ring when thinking */}
        {thinking && (
          <div style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            border: `2px dashed ${ringColor}80`,
            animation: "coach-ring-spin 1.2s linear infinite",
          }} />
        )}

        {/* Main character circle */}
        <div style={{
          width: 72, height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1a1a 0%, #111 100%)",
          border: `2.5px solid ${ringColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32,
          cursor: "default",
          position: "relative",
          zIndex: 1,
        }}>
          {face}
        </div>
      </div>

      {/* Status label */}
      <div className="flex items-center gap-1.5 mt-1">
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: thinking ? GOLD : mood === "strong" ? "#34d399" : mood === "weak" ? "#f87171" : GOLD,
          boxShadow: `0 0 6px ${thinking ? GOLD : mood === "strong" ? "#34d399" : "#f87171"}`,
          animation: thinking ? "typing-dot 0.8s ease infinite" : "none",
        }} />
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: GOLD }}>
          {thinking ? "Thinking..." : mood === "strong" ? "Loving this 🔥" : mood === "weak" ? "Needs work" : "Coach"}
        </span>
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: GOLD, opacity: 0.7,
          animation: `typing-dot 1s ease ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Score Ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#34d399" : score >= 55 ? GOLD : score >= 35 ? "#fb923c" : "#f87171";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={86} height={86} viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={radius} fill="none" stroke="#222" strokeWidth="7" />
        <circle cx="43" cy="43" r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 43 43)"
          style={{ transition: "stroke-dashoffset 0.9s ease" }} />
        <text x="43" y="39" textAnchor="middle" fill="white" fontSize="16" fontWeight="900">{score}</text>
        <text x="43" y="52" textAnchor="middle" fill="#666" fontSize="8">/100</text>
      </svg>
      <span className="text-[10px] font-bold" style={{ color }}>
        {score >= 75 ? "Viral Ready 🔥" : score >= 55 ? "Decent" : score >= 35 ? "Needs Work" : "Weak"}
      </span>
    </div>
  );
}

// ── Score Bar ───────────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const color = value >= 7 ? "#34d399" : value >= 5 ? GOLD : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 99, transition: "width 0.7s ease" }} />
      </div>
      <span className="text-[11px] font-bold w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Issue Card ──────────────────────────────────────────────────────────────
function IssueCard({ issue, onFix, fixing }: { issue: any; onFix: () => void; fixing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = issue.severity === "high" ? "#f87171" : issue.severity === "medium" ? "#fb923c" : GOLD;
  return (
    <div style={{ borderLeft: `3px solid ${borderColor}` }} className="bg-zinc-900/60 rounded-r-lg p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-300 truncate">"{issue.line}"</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{issue.problem}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge style={{ fontSize: 9, background: `${borderColor}22`, color: borderColor, borderColor: `${borderColor}40` }} className="border">
            {issue.severity}
          </Badge>
          <button onClick={() => setExpanded(v => !v)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="bg-zinc-800/60 rounded p-2">
            <p className="text-[10px] text-zinc-500 mb-1">✨ Better version:</p>
            <p className="text-[11px] text-zinc-200">"{issue.fix}"</p>
          </div>
          <Button size="sm" onClick={onFix} disabled={fixing}
            className="h-6 text-[10px] px-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
            {fixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            <span className="ml-1">{fixing ? "Fixing…" : "Fix This Line"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Coach Message Bubble ─────────────────────────────────────────────────────
function CoachBubble({ msg, onFixLine, onFixLineResult }: { msg: ChatMessage; onFixLine: (line: string) => void; onFixLineResult?: any }) {
  const [copied, setCopied] = useState(false);
  const [fixingLine, setFixingLine] = useState<string | null>(null);
  const a = msg.analysis;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFix = async (line: string) => {
    setFixingLine(line);
    await onFixLine(line);
    setFixingLine(null);
  };

  return (
    <div className="flex items-start gap-3">
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#111", border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
        🤙
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* Speech bubble */}
        <div style={{ border: `1px solid ${GOLD}33`, background: "rgba(212,180,97,0.04)" }} className="rounded-2xl rounded-tl-sm px-4 py-3 relative">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          <button onClick={() => handleCopy(msg.content)} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-400 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Analysis panel */}
        {a && (
          <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 space-y-4">
            {/* Score + metrics */}
            <div className="flex items-start gap-4">
              <ScoreRing score={a.overallScore} />
              <div className="flex-1 space-y-1.5">
                {Object.entries(a.scores).map(([k, v]) => (
                  <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v as number} />
                ))}
              </div>
            </div>

            {/* Verdict */}
            {a.verdict && (
              <div className="bg-zinc-800/50 rounded-lg p-3 border-l-2" style={{ borderColor: GOLD }}>
                <p className="text-[11px] text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Verdict</p>
                <p className="text-xs text-zinc-300">{a.verdict}</p>
              </div>
            )}

            {/* Issues */}
            {a.issues?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Issues ({a.issues.length})
                </p>
                {a.issues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} fixing={fixingLine === issue.line}
                    onFix={() => handleFix(issue.line)} />
                ))}
              </div>
            )}

            {/* Strengths */}
            {a.strengths?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> What's working
                </p>
                {a.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                    <span className="text-green-400 mt-0.5">✓</span> {s}
                  </div>
                ))}
              </div>
            )}

            {/* Drop-offs */}
            {a.dropoffs?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> Drop-off warnings
                </p>
                {a.dropoffs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="text-orange-400 shrink-0">~{d.second}s</span>
                    <span>{d.reason}</span>
                    <Badge style={{ fontSize: 9, background: d.severity === "high" ? "#f8717122" : "#fb923c22", color: d.severity === "high" ? "#f87171" : "#fb923c", border: "none" }}>
                      {d.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Competitor data */}
        {msg.competitorData?.profile && (
          <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-bold text-zinc-200">@{msg.competitorData.profile.handle}</span>
              <Badge style={{ fontSize: 10, background: "#e879a022", color: "#e879a0", border: "none" }}>
                {msg.competitorData.profile.posts} posts analyzed
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-zinc-200">{msg.competitorData.profile.avgViews.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">avg views</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-zinc-200">{msg.competitorData.profile.avgLikes.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">avg likes</p>
              </div>
            </div>
            {msg.competitorData.topPatterns?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Top patterns</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.competitorData.topPatterns.map((p: string, i: number) => (
                    <Badge key={i} style={{ fontSize: 10, background: "#d4b46122", color: GOLD, borderColor: "#d4b46130" }} className="border">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {msg.competitorData.stealThis && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Steal this tactic 👀</p>
                <p className="text-xs text-zinc-300">{msg.competitorData.stealThis}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AIContentCoach() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [script, setScript] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [goal, setGoal] = useState("viral");
  const [mode, setMode] = useState("breakdown");
  const [mood, setMood] = useState<Mood>("idle");
  const [thinking, setThinking] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [improving, setImproving] = useState(false);
  const [improvedScript, setImprovedScript] = useState("");
  const [fixResult, setFixResult] = useState<any>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Auto-greet on first load
  useEffect(() => {
    if (hasGreeted) return;
    setHasGreeted(true);
    const greetings = [
      "Yo 👋 how are you doing? What are we creating today?",
      "Let's build something viral today 🔥 Drop your script or idea and I'll break it down.",
      "Yo! Ready to make some fire content? Drop your script, hook, or idea below 👇",
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    setMessages([{ role: "coach", content: greeting, timestamp: Date.now() }]);
  }, []);

  const addCoachMessage = (content: string, analysis?: AnalysisData | null, competitorData?: any) => {
    setMessages(prev => [...prev, { role: "coach", content, analysis, competitorData, timestamp: Date.now() }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { role: "user", content, timestamp: Date.now() }]);
  };

  const sendToCoach = async (userMsg: string, scriptToAnalyze?: string) => {
    if (!userMsg.trim() && !scriptToAnalyze) return;
    addUserMessage(scriptToAnalyze ? `[Script Submitted]\n${scriptToAnalyze.slice(0, 120)}...` : userMsg);
    setThinking(true);
    setMood("thinking");
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === "coach" ? "assistant" : "user", content: m.content }));
      const data = await apiRequest("POST", "/api/coach/chat", {
        message: userMsg || "Analyze this script for me",
        script: scriptToAnalyze || (userMsg.length > 40 ? userMsg : undefined),
        mode, goal, history,
      });
      const newMood: Mood = data.mood === "strong" ? "strong" : data.mood === "weak" ? "weak" : "decent";
      setMood(newMood);
      addCoachMessage(data.reply || "Let me check that out…", data.analysis || null);
    } catch (e: any) {
      toast({ title: "Coach is down", description: e.message, variant: "destructive" });
      setMood("idle");
    } finally {
      setThinking(false);
    }
  };

  const analyzeScript = () => {
    if (!script.trim()) { toast({ title: "Add your script first!", description: "Paste your content below then hit analyze." }); return; }
    sendToCoach("Analyze my content", script);
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    sendToCoach(msg);
  };

  const improveScript = async () => {
    if (!script.trim()) return;
    setImproving(true);
    try {
      const lastAnalysis = [...messages].reverse().find(m => m.analysis);
      const data = await apiRequest("POST", "/api/coach/improve-script", {
        script, goal, issues: lastAnalysis?.analysis?.issues || [],
      });
      setImprovedScript(data.script || "");
      addCoachMessage("Okay here's your improved script 🔥 I fixed the hook, tightened the pacing, and made the payoff hit harder. Compare it with yours:");
    } catch (e: any) {
      toast({ title: "Improve failed", description: e.message, variant: "destructive" });
    } finally { setImproving(false); }
  };

  const analyzeCompetitor = async () => {
    if (!competitorUrl.trim()) return;
    const url = competitorUrl;
    setCompetitorUrl("");
    addUserMessage(`Analyze competitor: ${url}`);
    setThinking(true);
    setMood("thinking");
    try {
      const data = await apiRequest("POST", "/api/coach/competitor", { url });
      setMood(data.mood === "strong" ? "strong" : "decent");
      addCoachMessage(data.reply || "Here's what I found 👀", null, data);
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
      setMood("idle");
    } finally { setThinking(false); }
  };

  const handleFixLine = async (line: string) => {
    try {
      const data = await apiRequest("POST", "/api/coach/fix-line", { line, goal, context: "Instagram Reel" });
      setFixResult(data);
      addCoachMessage(
        `Okay here are 3 better versions of that line 💪\n\n${data.rewrites?.map((r: string, i: number) => `${i + 1}. "${r}"`).join("\n") || ""}\n\n${data.explanation || ""}`,
        null
      );
    } catch (e: any) {
      toast({ title: "Fix failed", description: e.message, variant: "destructive" });
    }
  };

  const generateHooks = async () => {
    if (!script.trim()) return;
    addUserMessage("Generate better hooks for my content");
    setThinking(true);
    try {
      const data = await apiRequest("POST", "/api/virality/hooks", { script, platform: "instagram" });
      const hooks = data.hooks || [];
      addCoachMessage(
        `Okay here are ${hooks.length} scroll-stopping hooks — pick the one that feels most like YOU:\n\n${hooks.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}\n\nYo these are way better than generic openers. Test one and let me know how it hits 🔥`,
        null
      );
    } catch (e: any) {
      toast({ title: "Hook gen failed", description: e.message, variant: "destructive" });
    } finally { setThinking(false); }
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background flex flex-col" style={{ maxHeight: "100vh" }}>
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
            <h1 className="text-lg font-bold text-foreground">AI Content Coach</h1>
          </div>
          <Badge style={{ background: "#d4b46122", color: GOLD, borderColor: "#d4b46130", fontSize: 10 }} className="border">
            BETA
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            {GOALS.map(g => (
              <button key={g.id} onClick={() => setGoal(g.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${goal === g.id ? g.color : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
                data-testid={`goal-${g.id}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left: Character + Mode + Input ── */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-zinc-950/50">
            {/* Character */}
            <div className="flex flex-col items-center py-8 px-4 border-b border-border">
              <CoachCharacter mood={mood} thinking={thinking} />
              <p className="text-[11px] text-zinc-500 text-center mt-4 leading-relaxed px-2">
                Your AI content mentor. Drop a script and I'll tell you exactly what to fix.
              </p>
            </div>

            {/* Mode tabs */}
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mode</p>
              <div className="space-y-1">
                {MODES.map(m => {
                  const Icon = m.icon;
                  const active = mode === m.id;
                  return (
                    <button key={m.id} onClick={() => setMode(m.id)} data-testid={`mode-${m.id}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${active ? "bg-primary/15 text-primary border border-primary/30" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="p-3 border-b border-border space-y-2">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</p>
              <Button size="sm" onClick={generateHooks} disabled={thinking || !script.trim()}
                className="w-full h-8 text-[11px] justify-start gap-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50"
                data-testid="btn-generate-hooks">
                <Zap className="w-3.5 h-3.5 text-yellow-400" /> Generate Hooks
              </Button>
              <Button size="sm" onClick={improveScript} disabled={improving || !script.trim()}
                className="w-full h-8 text-[11px] justify-start gap-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50"
                data-testid="btn-improve-script">
                {improving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-purple-400" />}
                Make It Viral
              </Button>
              <Button size="sm" onClick={analyzeScript} disabled={thinking || !script.trim()}
                className="w-full h-8 text-[11px] justify-start gap-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50"
                data-testid="btn-retention-warning">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" /> Retention Warning
              </Button>
            </div>

            {/* Competitor URL (shown in competitor mode) */}
            {mode === "competitor" && (
              <div className="p-3 space-y-2">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Competitor URL</p>
                <Input
                  value={competitorUrl}
                  onChange={e => setCompetitorUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && analyzeCompetitor()}
                  placeholder="instagram.com/competitor"
                  className="h-8 text-xs bg-zinc-900 border-zinc-700"
                  data-testid="input-competitor-url"
                />
                <Button size="sm" onClick={analyzeCompetitor} disabled={thinking || !competitorUrl.trim()}
                  className="w-full h-8 text-[11px]" style={{ background: GOLD, color: "#000" }}
                  data-testid="btn-analyze-competitor">
                  <Instagram className="w-3.5 h-3.5 mr-1.5" /> Analyze
                </Button>
              </div>
            )}
          </div>

          {/* ── Center: Chat ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, i) => (
                msg.role === "coach" ? (
                  <CoachBubble key={i} msg={msg} onFixLine={handleFixLine} />
                ) : (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-sm bg-zinc-800 border border-zinc-700/50 rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )
              ))}
              {thinking && (
                <div className="flex items-start gap-3">
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#111", border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    🤙
                  </div>
                  <div style={{ border: `1px solid ${GOLD}33`, background: "rgba(212,180,97,0.04)" }} className="rounded-2xl rounded-tl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Script Input ── */}
            <div className="border-t border-border p-4 space-y-3 shrink-0">
              {/* Improved script result */}
              {improvedScript && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">✨ Improved Script</p>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" onClick={() => { setScript(improvedScript); setImprovedScript(""); }}
                        className="h-6 text-[10px] px-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30">
                        Use This
                      </Button>
                      <button onClick={() => setImprovedScript("")} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{improvedScript}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Script / Hook / Idea</label>
                  <Textarea
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    placeholder="Paste your script, hook, or content idea here..."
                    className="min-h-24 text-sm bg-zinc-900/80 border-zinc-700/60 resize-none"
                    data-testid="textarea-script"
                  />
                </div>
                <Button onClick={analyzeScript} disabled={thinking || !script.trim()}
                  className="h-10 font-semibold" style={{ background: GOLD, color: "#000" }}
                  data-testid="btn-analyze-script">
                  {thinking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                  Analyze My Content
                </Button>
              </div>

              {/* Chat input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                  placeholder="Ask Coach anything... (e.g. &quot;how do I improve my hook?&quot;)"
                  className="flex-1 h-9 text-sm bg-zinc-900/80 border-zinc-700/60"
                  disabled={thinking}
                  data-testid="input-chat"
                />
                <Button onClick={handleChat} disabled={thinking || !chatInput.trim()} size="sm"
                  className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                  data-testid="btn-send-chat">
                  <Send className="w-4 h-4 text-zinc-300" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
