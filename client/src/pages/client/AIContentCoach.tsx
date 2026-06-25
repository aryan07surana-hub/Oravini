import { useState, useRef, useEffect } from "react";
import { PageTourButton } from "@/components/ui/TourGuide";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSurvey } from "@/hooks/use-survey";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiError } from "@/lib/queryClient";
import CreditErrorBanner from "@/components/CreditErrorBanner";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import {
  Sparkles, Zap, Wand2, RefreshCw, Target, TrendingUp, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Copy, Check, Send, Instagram,
  Flame, Brain, BarChart2, Loader2, Play, Scissors, Heart, BookOpen,
  DollarSign, Laugh, BookMarked, Map, User, ChevronRight, Star,
  Clock, Trash2, PlusCircle, Settings, Activity, TrendingDown,
  Package, History, Smartphone, Music2, PlayCircle, X as XIcon,
} from "lucide-react";

const GOLD = "#d4b461";

// ── Swap this with your Loom or YouTube embed URL ────────────────────────────
// Loom:    "https://www.loom.com/embed/YOUR_VIDEO_ID?autoplay=1&hide_owner=true"
// YouTube: "https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1&rel=0"
const COACH_INTRO_VIDEO_SRC = "https://www.loom.com/embed/REPLACE_WITH_YOUR_LOOM_ID?autoplay=1&hide_owner=true&hide_share=true&hide_title=true";
const COACH_WELCOME_STORAGE_KEY = "oravini_coach_welcome_seen";

type Mood = "weak" | "decent" | "strong" | "idle" | "thinking";

type ScriptVersion = {
  id: string;
  script: string;
  score: number | null;
  label: string;
  ts: number;
};

type ChatMessage = {
  role: "coach" | "user";
  content: string;
  analysis?: AnalysisData | null;
  competitorData?: any;
  scriptResult?: { script: string; label: string; explanation?: string; extras?: string[] };
  brandData?: any;
  roadmapData?: any;
  postPackage?: any;
  agentSteps?: string[];
  timestamp: number;
};

type AnalysisData = {
  overallScore: number;
  scores: { clarity: number; persuasion: number; ctaStrength: number; brandVoice: number };
  issues: Array<{ line: string; problem: string; fix: string; severity: string }>;
  strengths: string[];
  dropoffs: Array<{ second: number; reason: string; severity: string }>;
  verdict: string;
  retentionScore?: number;
};

const GOALS = [
  { id: "viral", label: "🔥 Go Viral", color: "border-red-500/40 text-red-400 bg-red-500/10" },
  { id: "sales", label: "💰 Drive Sales", color: "border-green-500/40 text-green-400 bg-green-500/10" },
  { id: "engagement", label: "❤️ Boost Engagement", color: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
];

const MODES = [
  { id: "breakdown", label: "Script Breakdown", icon: Brain, sub: "Score & improve your script" },
  { id: "pre-post", label: "Pre-Post Check", icon: Play, sub: "Predict performance before posting" },
  { id: "competitor", label: "Competitor Intel", icon: Instagram, sub: "Spy on what's working in your niche" },
  { id: "brand", label: "Brand Builder", icon: User, sub: "Craft your unique voice & style" },
  { id: "roadmap", label: "AI Roadmap", icon: Map, sub: "30-day content plan for growth" },
];

const TONES = [
  { id: "funny", label: "😂 Funny", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  { id: "serious", label: "🎤 Serious", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { id: "educational", label: "📚 Educational", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  { id: "sales", label: "💰 Sales", color: "text-green-400 border-green-500/30 bg-green-500/10" },
  { id: "story", label: "📖 Story", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  { id: "emotional", label: "😢 Emotional", color: "text-pink-400 border-pink-500/30 bg-pink-500/10" },
];

const PLATFORMS = [
  { id: "reels", label: "Reels", icon: Smartphone, note: "60-90s · hook in 1s" },
  { id: "tiktok", label: "TikTok", icon: Music2, note: "15-60s · trend-driven" },
  { id: "shorts", label: "Shorts", icon: Play, note: "60s max · value-first" },
] as const;

// ── Animated Coach Character ────────────────────────────────────────────────
function CoachCharacter({ mood, thinking }: { mood: Mood; thinking: boolean }) {
  const face = mood === "strong" ? "🔥" : mood === "decent" ? "😏" : mood === "weak" ? "😐" : thinking ? "🤔" : "🤙";
  const glowColor = mood === "strong" ? "rgba(52,211,153,0.6)" : mood === "decent" ? "rgba(212,180,97,0.6)" : mood === "weak" ? "rgba(248,113,113,0.5)" : "rgba(212,180,97,0.3)";
  const ringColor = mood === "strong" ? "#34d399" : mood === "decent" ? GOLD : mood === "weak" ? "#f87171" : GOLD;
  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <style>{`
        @keyframes coach-float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
        @keyframes coach-think { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes coach-ring-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes typing-dot { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }
      `}</style>
      <div className="relative" style={{ animation: thinking ? "coach-think 0.8s ease-in-out infinite" : "coach-float 3.5s ease-in-out infinite" }}>
        <div style={{ width:88,height:88,borderRadius:"50%",boxShadow:`0 0 32px ${glowColor},0 0 60px ${glowColor}50`,background:`radial-gradient(circle,${ringColor}22 0%,transparent 70%)`,position:"absolute",inset:-8 }} />
        {thinking && <div style={{ position:"absolute",inset:-4,borderRadius:"50%",border:`2px dashed ${ringColor}80`,animation:"coach-ring-spin 1.2s linear infinite" }} />}
        <div style={{ width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#1a1a1a 0%,#111 100%)",border:`2.5px solid ${ringColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,position:"relative",zIndex:1 }}>
          {face}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <div style={{ width:7,height:7,borderRadius:"50%",background:thinking?GOLD:mood==="strong"?"#34d399":mood==="weak"?"#f87171":GOLD,boxShadow:`0 0 6px ${thinking?GOLD:mood==="strong"?"#34d399":"#f87171"}`,animation:thinking?"typing-dot 0.8s ease infinite":"none" }} />
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: GOLD }}>
          {thinking ? "Thinking..." : mood === "strong" ? "Loving this 🔥" : mood === "weak" ? "Needs work" : "Coach"}
        </span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0,1,2].map(i => <div key={i} style={{ width:7,height:7,borderRadius:"50%",background:GOLD,opacity:0.7,animation:`typing-dot 1s ease ${i*0.2}s infinite` }} />)}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36, circ = 2*Math.PI*radius, offset = circ-(score/100)*circ;
  const color = score>=75?"#34d399":score>=55?GOLD:score>=35?"#fb923c":"#f87171";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={86} height={86} viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={radius} fill="none" stroke="#222" strokeWidth="7"/>
        <circle cx="43" cy="43" r={radius} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 43 43)" style={{transition:"stroke-dashoffset 0.9s ease"}}/>
        <text x="43" y="39" textAnchor="middle" fill="white" fontSize="16" fontWeight="900">{score}</text>
        <text x="43" y="52" textAnchor="middle" fill="#666" fontSize="8">/100</text>
      </svg>
      <span className="text-[10px] font-bold" style={{ color }}>{score>=75?"Viral Ready 🔥":score>=55?"Decent":score>=35?"Needs Work":"Weak"}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct=(value/10)*100, color=value>=7?"#34d399":value>=5?GOLD:"#f87171";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div style={{ width:`${pct}%`,background:color,height:"100%",borderRadius:99,transition:"width 0.7s ease" }}/>
      </div>
      <span className="text-[11px] font-bold w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

function IssueCard({ issue, onFix, fixing }: { issue: any; onFix: ()=>void; fixing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = issue.severity==="high"?"#f87171":issue.severity==="medium"?"#fb923c":GOLD;
  return (
    <div style={{ borderLeft:`3px solid ${borderColor}` }} className="bg-zinc-900/60 rounded-r-lg p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-300 truncate">"{issue.line}"</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{issue.problem}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge style={{ fontSize:9,background:`${borderColor}22`,color:borderColor,borderColor:`${borderColor}40` }} className="border">{issue.severity}</Badge>
          <button onClick={()=>setExpanded(v=>!v)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            {expanded?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="bg-zinc-800/60 rounded p-2">
            <p className="text-[10px] text-zinc-500 mb-1">✨ Better version:</p>
            <p className="text-[11px] text-zinc-200">"{issue.fix}"</p>
          </div>
          <Button size="sm" onClick={onFix} disabled={fixing} className="h-6 text-[10px] px-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
            {fixing?<Loader2 className="w-3 h-3 animate-spin"/>:<Wand2 className="w-3 h-3"/>}
            <span className="ml-1">{fixing?"Fixing…":"Fix This Line"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function ScriptResultCard({ result }: { result: { script: string; label: string; explanation?: string; extras?: string[] } }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-zinc-900/80 border border-zinc-700/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-primary uppercase tracking-wider">{result.label}</p>
        <button onClick={()=>{navigator.clipboard.writeText(result.script);setCopied(true);setTimeout(()=>setCopied(false),2000)}} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          {copied?<Check className="w-3.5 h-3.5 text-green-400"/>:<Copy className="w-3.5 h-3.5"/>}
        </button>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
        <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">{result.script}</p>
      </div>
      {result.explanation && (
        <div className="border-l-2 border-primary/40 pl-3">
          <p className="text-[11px] text-zinc-400 italic">{result.explanation}</p>
        </div>
      )}
      {result.extras && result.extras.length > 0 && (
        <div className="space-y-1">
          {result.extras.map((e,i)=>(
            <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
              <span style={{color:GOLD}} className="mt-0.5 shrink-0">›</span>{e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentStepsTag({ steps }: { steps: string[] }) {
  if (!steps?.length) return null;
  const labels: Record<string, string> = {
    analyze_script: "📊 Analyzed",
    generate_hooks: "🎣 Generated hooks",
    rewrite_viral: "✨ Rewrote script",
    retention_check: "📉 Checked retention",
    fix_line: "✏️ Fixed line",
    tone_shift: "🎭 Shifted tone",
  };
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {steps.map((s, i) => (
        <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border" style={{ color: GOLD, borderColor: `${GOLD}40`, background: `${GOLD}10` }}>
          {labels[s] || s}
        </span>
      ))}
    </div>
  );
}

function BrandResultCard({ data }: { data: any }) {
  const [tab, setTab] = useState<"profile"|"strategy"|"pillars">("profile");
  if (!data) return null;
  return (
    <div className="bg-zinc-900/80 border border-zinc-700/60 rounded-xl overflow-hidden">
      <div className="flex border-b border-zinc-800">
        {(["profile","strategy","pillars"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all ${tab===t?"text-primary border-b-2 border-primary bg-primary/5":"text-zinc-500 hover:text-zinc-300"}`}>
            {t==="profile"?"Profile":t==="strategy"?"Strategy":"Pillars"}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {tab==="profile" && (
          <>
            {data.bioRewrite && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">✨ Bio Rewrite</p>
                <div className="bg-zinc-800/60 rounded-lg p-3 flex items-start justify-between gap-2">
                  <p className="text-xs text-zinc-200 flex-1">{data.bioRewrite}</p>
                  <button onClick={()=>navigator.clipboard.writeText(data.bioRewrite)} className="text-zinc-600 hover:text-zinc-400 shrink-0"><Copy className="w-3.5 h-3.5"/></button>
                </div>
              </div>
            )}
            {data.usernameIdeas?.length>0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Username Ideas</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.usernameIdeas.map((u:string,i:number)=>(
                    <Badge key={i} style={{fontSize:10,background:"#d4b46122",color:GOLD,borderColor:"#d4b46130"}} className="border">@{u}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.profilePicAdvice && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Profile Picture</p>
                <p className="text-[11px] text-zinc-300">{data.profilePicAdvice}</p>
              </div>
            )}
            {data.highlightStrategy?.length>0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Highlight Strategy</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.highlightStrategy.map((h:string,i:number)=>(
                    <Badge key={i} style={{fontSize:10,background:"#ffffff08",color:"#aaa",borderColor:"#ffffff15"}} className="border">{h}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {tab==="strategy" && (
          <>
            {data.toneAndVoice && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tone & Voice</p>
                <p className="text-[11px] text-zinc-300">{data.toneAndVoice}</p>
              </div>
            )}
            {data.audiencePsychology && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Audience Psychology</p>
                <p className="text-[11px] text-zinc-300">{data.audiencePsychology}</p>
              </div>
            )}
            {data.postingPlan && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Posting Plan</p>
                <p className="text-[11px] text-zinc-300">{data.postingPlan}</p>
              </div>
            )}
            {data.uniqueAngle && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Your Unique Angle 🎯</p>
                <p className="text-[11px] text-zinc-300">{data.uniqueAngle}</p>
              </div>
            )}
          </>
        )}
        {tab==="pillars" && data.contentPillars?.length>0 && (
          <div className="space-y-3">
            {data.contentPillars.map((p:any,i:number)=>(
              <div key={i} className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
                <p className="text-[11px] font-bold text-zinc-200">Pillar {i+1}: {p.pillar}</p>
                <p className="text-[11px] text-zinc-400">{p.description}</p>
                <p className="text-[10px] text-primary italic">e.g. {p.example}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoadmapCard({ data }: { data: any }) {
  const [activeWeek, setActiveWeek] = useState(0);
  if (!data?.weeks) return null;
  const week = data.weeks[activeWeek];
  return (
    <div className="bg-zinc-900/80 border border-zinc-700/60 rounded-xl overflow-hidden">
      {data.overview && (
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800">
          <p className="text-[11px] text-zinc-300 leading-relaxed">{data.overview}</p>
        </div>
      )}
      <div className="flex border-b border-zinc-800">
        {data.weeks.map((_:any,i:number)=>(
          <button key={i} onClick={()=>setActiveWeek(i)} className={`flex-1 px-2 py-2.5 text-[11px] font-bold transition-all ${activeWeek===i?"text-primary border-b-2 border-primary bg-primary/5":"text-zinc-500 hover:text-zinc-300"}`}>
            Wk {i+1}
          </button>
        ))}
      </div>
      {week && (
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-zinc-200">{week.theme}</p>
            <p className="text-[11px] text-zinc-400">{week.goal}</p>
          </div>
          {week.dailyTasks?.length>0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Daily Tasks</p>
              {week.dailyTasks.map((task:string,i:number)=>(
                <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                  <span className="text-[10px] text-zinc-600 mt-0.5 font-bold shrink-0">Day {i+1}</span>
                  <span>{task}</span>
                </div>
              ))}
            </div>
          )}
          {week.challenge && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-0.5">🎯 Week Challenge</p>
              <p className="text-[11px] text-zinc-300">{week.challenge}</p>
            </div>
          )}
          {week.metric && (
            <div className="flex items-center gap-2 text-[11px]">
              <BarChart2 className="w-3.5 h-3.5 text-zinc-500 shrink-0"/>
              <span className="text-zinc-400">Track: {week.metric}</span>
            </div>
          )}
        </div>
      )}
      {data.keyHabits?.length>0 && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-zinc-800 pt-3">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Key Habits</p>
          {data.keyHabits.map((h:string,i:number)=>(
            <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
              <Star className="w-3 h-3 text-primary shrink-0 mt-0.5"/>{h}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score Trend Mini Chart ──────────────────────────────────────────────────
function ScoreTrendChart({ scores }: { scores: any[] }) {
  if (!scores || scores.length < 2) return null;
  const pts = scores.slice(0, 10).reverse();
  const vals = pts.map((s: any) => s.overall_score);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 10;
  const W = 200, H = 40;
  const xStep = W / (pts.length - 1);
  const toY = (v: number) => H - ((v - min) / range) * (H - 4) - 2;
  const path = pts.map((s: any, i: number) => `${i === 0 ? "M" : "L"} ${(i * xStep).toFixed(1)} ${toY(s.overall_score).toFixed(1)}`).join(" ");
  const lastScore = vals[vals.length - 1];
  const prevScore = vals[vals.length - 2];
  const trend = lastScore - prevScore;
  const avgScore = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Score Trend</p>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold" style={{ color: GOLD }}>avg {avgScore}</span>
          <span className={`text-[9px] font-bold ${trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-zinc-500"}`}>
            {trend > 0 ? `+${trend}` : trend}
          </span>
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.3" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${((pts.length-1)*xStep).toFixed(1)} ${H} L 0 ${H} Z`} fill="url(#trendGrad)" />
        <path d={path} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((s: any, i: number) => (
          <circle key={i} cx={(i * xStep).toFixed(1)} cy={toY(s.overall_score).toFixed(1)} r="2.5"
            fill={s.overall_score >= 70 ? "#34d399" : s.overall_score >= 45 ? GOLD : "#f87171"} />
        ))}
      </svg>
    </div>
  );
}

// ── Profile Chip ───────────────────────────────────────────────────────────
function ProfileChip({ profile, onEdit }: { profile: any; onEdit: () => void }) {
  if (!profile) return null;
  const tierLabel = profile.follower_tier === "macro" ? "100k+" : profile.follower_tier === "micro" ? "10-100k" : "<10k";
  return (
    <button onClick={onEdit} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 hover:border-zinc-500 transition-all group">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
        <User className="w-3 h-3" style={{ color: GOLD }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-semibold text-zinc-200 truncate">{profile.niche || "Set your niche"}</p>
        <p className="text-[9px] text-zinc-500">{profile.platform || "instagram"} · {tierLabel}</p>
      </div>
      {profile.avg_overall > 0 && (
        <span className="text-[10px] font-bold shrink-0" style={{ color: GOLD }}>{Number(profile.avg_overall).toFixed(0)} avg</span>
      )}
      <Settings className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
    </button>
  );
}

// ── Profile Setup Modal ────────────────────────────────────────────────────
function ProfileSetupModal({ profile, onSave, onClose }: { profile: any; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    niche: profile?.niche || "",
    platform: profile?.platform || "instagram",
    goal: profile?.goal || "",
    follower_tier: profile?.follower_tier || "nano",
    content_style: profile?.content_style || "",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Your Creator Profile</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
        </div>
        <p className="text-[11px] text-zinc-400">Coach uses this to give you personalized, niche-specific feedback every session.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Niche</label>
            <Input value={form.niche} onChange={e=>setForm(f=>({...f,niche:e.target.value}))} placeholder="e.g. fitness for busy moms, personal finance" className="h-8 text-xs bg-zinc-800 border-zinc-700"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Platform</label>
              <select value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))} className="w-full h-8 text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 text-zinc-200">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Follower Count</label>
              <select value={form.follower_tier} onChange={e=>setForm(f=>({...f,follower_tier:e.target.value}))} className="w-full h-8 text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 text-zinc-200">
                <option value="nano">Under 10k (Nano)</option>
                <option value="micro">10k–100k (Micro)</option>
                <option value="macro">100k+ (Macro)</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Main Goal</label>
            <Input value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder="e.g. get clients, grow to 50k, monetize" className="h-8 text-xs bg-zinc-800 border-zinc-700"/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Content Style (optional)</label>
            <Input value={form.content_style} onChange={e=>setForm(f=>({...f,content_style:e.target.value}))} placeholder="e.g. educational, storytelling, humor" className="h-8 text-xs bg-zinc-800 border-zinc-700"/>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={onClose} variant="outline" className="flex-1 h-9 text-xs border-zinc-700 text-zinc-400">Cancel</Button>
          <Button onClick={()=>onSave(form)} className="flex-1 h-9 text-xs font-semibold" style={{ background: GOLD, color: "#000" }}>Save Profile</Button>
        </div>
      </div>
    </div>
  );
}

// ── Welcome Video Modal ───────────────────────────────────────────────────────
function WelcomeVideoModal({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={dismiss} />
      <div
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.28s cubic-bezier(0.32,0.72,0,1)",
          maxWidth: 640,
        }}
        className="relative w-full bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background:`${GOLD}15`, border:`1px solid ${GOLD}30` }}>🤙</div>
            <div>
              <h2 className="text-[15px] font-black text-white leading-tight">Welcome to AI Content Coach</h2>
              <p className="text-[11px] text-white/40 mt-0.5">Watch this 2-min walkthrough — then start creating.</p>
            </div>
          </div>
          <button onClick={dismiss}
            className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0 ml-4">
            <XIcon className="w-3.5 h-3.5"/>
          </button>
        </div>

        {/* Video embed */}
        <div className="px-6">
          <div className="relative w-full rounded-xl overflow-hidden bg-zinc-950 border border-white/6" style={{ aspectRatio:"16/9" }}>
            <iframe
              src={COACH_INTRO_VIDEO_SRC}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="AI Content Coach — Walkthrough"
            />
          </div>
        </div>

        {/* What's inside quick list */}
        <div className="px-6 py-4 grid grid-cols-2 gap-2">
          {[
            { icon:"🎯", text:"Score your hook before posting" },
            { icon:"📦", text:"Get caption, hashtags & story tease" },
            { icon:"📊", text:"See where viewers drop off" },
            { icon:"🔥", text:"Quick rewrites in one click" },
          ].map(({icon,text}) => (
            <div key={text} className="flex items-center gap-2 text-[11px] text-white/50">
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t border-white/6">
          <p className="text-[10px] text-white/20">Won't auto-play again. Hit "Watch intro" anytime to rewatch.</p>
          <Button onClick={dismiss}
            className="h-9 px-5 font-bold text-sm shrink-0"
            style={{ background:GOLD, color:"#000" }}>
            Let's go →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Post Package Card ────────────────────────────────────────────────────────
function PostPackageCard({ data }: { data: any }) {
  const [copied, setCopied] = useState<string | null>(null);
  const cp = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => cp(text, k)} className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
      {copied === k ? <><Check className="w-3 h-3 text-green-400"/>Copied</> : <><Copy className="w-3 h-3"/>Copy</>}
    </button>
  );
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 space-y-4">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/>Post Package</p>
      {data.caption && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Caption</p><CopyBtn text={data.caption} k="caption"/></div>
          <p className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-800/40 rounded-lg p-3 whitespace-pre-wrap">{data.caption}</p>
        </div>
      )}
      {data.hashtags?.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Hashtags ({data.hashtags.length})</p>
            <CopyBtn text={data.hashtags.map((h: string) => `#${h.replace('#','')}`).join(' ')} k="hashtags"/>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.hashtags.map((h: string, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">#{h.replace('#','')}</span>)}
          </div>
        </div>
      )}
      {data.firstComment && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">First Comment</p><CopyBtn text={data.firstComment} k="comment"/></div>
          <p className="text-[11px] text-zinc-300 bg-zinc-800/40 rounded-lg p-3">{data.firstComment}</p>
        </div>
      )}
      {data.storyTease && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Story Tease</p><CopyBtn text={data.storyTease} k="story"/></div>
          <p className="text-[11px] text-zinc-300 bg-zinc-800/40 rounded-lg p-3 italic">"{data.storyTease}"</p>
        </div>
      )}
      {data.bestTimeToPost && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background:`${GOLD}10`, border:`1px solid ${GOLD}20` }}>
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color:GOLD }}/>
          <span className="text-[11px] text-zinc-400">Best time: </span>
          <span className="text-[11px] font-semibold" style={{ color:GOLD }}>{data.bestTimeToPost}</span>
        </div>
      )}
    </div>
  );
}

const POST_ANALYSIS_CHIPS = [
  { id: "hooks", label: "Generate Hooks", icon: "⚡" },
  { id: "viral", label: "Make it Viral", icon: "🔥" },
  { id: "shorten", label: "Shorten It", icon: "✂️" },
  { id: "clarify", label: "Fix Weakest Line", icon: "🎯" },
];

function CoachBubble({ msg, onFixLine, onQuickAction, isLast }: { msg: ChatMessage; onFixLine: (line: string) => void; onQuickAction?: (id: string) => void; isLast?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [fixingLine, setFixingLine] = useState<string|null>(null);
  const a = msg.analysis;
  const handleFix = async (line: string) => { setFixingLine(line); await onFixLine(line); setFixingLine(null); };
  return (
    <div className="flex items-start gap-3">
      <div style={{ width:32,height:32,borderRadius:"50%",background:"#111",border:`1.5px solid ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>🤙</div>
      <div className="flex-1 min-w-0 space-y-3">
        <div style={{ border:`1px solid ${GOLD}33`,background:"rgba(212,180,97,0.04)" }} className="rounded-2xl rounded-tl-sm px-4 py-3 relative">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          <button onClick={()=>{navigator.clipboard.writeText(msg.content);setCopied(true);setTimeout(()=>setCopied(false),2000)}} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-400 transition-colors">
            {copied?<Check className="w-3.5 h-3.5 text-green-400"/>:<Copy className="w-3.5 h-3.5"/>}
          </button>
          {msg.agentSteps?.length ? <AgentStepsTag steps={msg.agentSteps} /> : null}
        </div>

        {a && (
          <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-4">
              <ScoreRing score={a.overallScore}/>
              <div className="flex-1 space-y-1.5">
                {Object.entries(a.scores).map(([k,v])=>(
                  <ScoreBar key={k} label={k.replace(/([A-Z])/g,' $1').replace(/^./,(s:string)=>s.toUpperCase())} value={v as number}/>
                ))}
              </div>
            </div>
            {a.verdict && (
              <div className="bg-zinc-800/50 rounded-lg p-3 border-l-2" style={{ borderColor: GOLD }}>
                <p className="text-[11px] text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Verdict</p>
                <p className="text-xs text-zinc-300">{a.verdict}</p>
              </div>
            )}
            {a.issues?.length>0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400"/> Issues ({a.issues.length})
                </p>
                {a.issues.map((issue,i)=><IssueCard key={i} issue={issue} fixing={fixingLine===issue.line} onFix={()=>handleFix(issue.line)}/>)}
              </div>
            )}
            {a.strengths?.length>0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400"/> What's working
                </p>
                {a.strengths.map((s,i)=>(
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                    <span className="text-green-400 mt-0.5">✓</span>{s}
                  </div>
                ))}
              </div>
            )}
            {a.dropoffs?.length>0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-400"/> Retention Map
                </p>
                {/* Visual timeline bar */}
                <div className="relative h-5 rounded-full overflow-hidden bg-zinc-800/50">
                  <div className="absolute inset-0 rounded-full" style={{ background:"linear-gradient(to right,#34d39944,#d4b46144,#f8717144)" }}/>
                  {a.dropoffs.map((d: any,i: number)=>{
                    const pct=Math.min((d.second/90)*100,97);
                    const col=d.severity==="high"?"#f87171":d.severity==="medium"?"#fb923c":"#fbbf24";
                    return (
                      <div key={i} title={`${d.second}s: ${d.reason}`}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-default"
                        style={{ left:`${pct}%` }}>
                        <div className="w-3 h-3 rounded-full border-2 border-zinc-900" style={{ background:col }}/>
                      </div>
                    );
                  })}
                  {/* Second labels */}
                  <div className="absolute bottom-0 left-1 text-[8px] text-zinc-600">0s</div>
                  <div className="absolute bottom-0 right-1 text-[8px] text-zinc-600">90s</div>
                </div>
                {/* Detail list */}
                <div className="space-y-1">
                  {a.dropoffs.map((d: any,i: number)=>(
                    <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="text-orange-400 shrink-0 font-mono w-8">~{d.second}s</span>
                      <span className="flex-1">{d.reason}</span>
                      <Badge style={{ fontSize:9,background:d.severity==="high"?"#f8717122":"#fb923c22",color:d.severity==="high"?"#f87171":"#fb923c",border:"none" }}>{d.severity}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {msg.scriptResult && <ScriptResultCard result={msg.scriptResult}/>}
        {msg.brandData && <BrandResultCard data={msg.brandData}/>}
        {msg.roadmapData && <RoadmapCard data={msg.roadmapData}/>}
        {msg.postPackage && <PostPackageCard data={msg.postPackage}/>}

        {isLast && onQuickAction && msg.analysis && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {POST_ANALYSIS_CHIPS.map(chip=>(
              <button key={chip.id} onClick={()=>onQuickAction(chip.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 hover:text-white transition-all">
                <span>{chip.icon}</span>{chip.label}
              </button>
            ))}
          </div>
        )}

        {msg.competitorData?.profile && (
          <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-400"/>
              <span className="text-sm font-bold text-zinc-200">@{msg.competitorData.profile.handle}</span>
              <Badge style={{ fontSize:10,background:"#e879a022",color:"#e879a0",border:"none" }}>{msg.competitorData.profile.posts} posts</Badge>
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
            {msg.competitorData.topPatterns?.length>0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Top patterns</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.competitorData.topPatterns.map((p:string,i:number)=>(
                    <Badge key={i} style={{ fontSize:10,background:"#d4b46122",color:GOLD,borderColor:"#d4b46130" }} className="border">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {msg.competitorData.whatWorks?.length>0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">What works for them</p>
                {msg.competitorData.whatWorks.map((w:string,i:number)=>(
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                    <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0"/>{w}
                  </div>
                ))}
              </div>
            )}
            {msg.competitorData.gaps?.length>0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Gaps you can exploit</p>
                {msg.competitorData.gaps.map((g:string,i:number)=>(
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                    <Target className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0"/>{g}
                  </div>
                ))}
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
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [script, setScript] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [goal, setGoal] = useState("viral");
  const [mode, setMode] = useState("breakdown");
  const [mood, setMood] = useState<Mood>("idle");
  const [thinking, setThinking] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showTones, setShowTones] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ── Welcome modal — show once per browser, "Watch again" button reopens it ─
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(COACH_WELCOME_STORAGE_KEY));
  const dismissWelcome = () => { localStorage.setItem(COACH_WELCOME_STORAGE_KEY, "1"); setShowWelcome(false); };

  // ── New feature state ──────────────────────────────────────────────────────
  const [platform, setPlatform] = useState<"reels" | "tiktok" | "shorts">("reels");
  const [hookScore, setHookScore] = useState<{ score: number; label: string; color: string; weakness: string } | null>(null);
  const [hookScoring, setHookScoring] = useState(false);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [buildingPackage, setBuildingPackage] = useState(false);
  const pendingVersionId = useRef<string | null>(null);

  const { data: coachHistoryRaw } = useQuery<any[]>({ queryKey: ["/api/ai/history?tool=coach"] });
  const coachHistory = coachHistoryRaw ?? [];

  const { data: coachProfile, refetch: refetchProfile } = useQuery<any>({
    queryKey: ["/api/coach/profile"],
    retry: false,
  });

  const { data: scoreHistory } = useQuery<any[]>({
    queryKey: ["/api/coach/scores"],
    retry: false,
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/coach/profile", data),
    onSuccess: () => {
      refetchProfile();
      qc.invalidateQueries({ queryKey: ["/api/coach/scores"] });
      toast({ title: "Profile saved", description: "Coach will personalize feedback to your niche." });
      setShowProfileModal(false);
    },
  });

  const saveSession = () => {
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length < 1) return;
    const firstUserMsg = userMessages[0].content.replace(/^\[Script\] /, "").slice(0, 80);
    apiRequest("POST", "/api/ai/history", {
      tool: "coach",
      title: firstUserMsg + (firstUserMsg.length >= 80 ? "…" : ""),
      inputs: { mode, goal, script: script.slice(0, 300) },
      output: { messageCount: messages.length, preview: messages.slice(-3).map(m => ({ role: m.role, content: m.content.slice(0, 120) })) },
    }).then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=coach"] })).catch(() => {});
  };

  const startNewSession = () => {
    saveSession();
    setMessages([]);
    setScript("");
    setHasGreeted(false);
    setMood("idle");
    setCreditError(null);
  };

  const survey = useSurvey();

  const [brandForm, setBrandForm] = useState({ niche: "", target: "", goal: "", currentBio: "", handle: "" });
  const [buildingBrand, setBuildingBrand] = useState(false);
  const [roadmapForm, setRoadmapForm] = useState({ niche: "", goal: "", currentFollowers: "", mainProblem: "" });
  const [buildingRoadmap, setBuildingRoadmap] = useState(false);

  useEffect(() => {
    if (!survey.hasData) return;
    setBrandForm(f => ({ ...f, niche: f.niche || survey.niche, goal: f.goal || survey.primaryGoal }));
    setRoadmapForm(f => ({ ...f, niche: f.niche || survey.niche, goal: f.goal || survey.primaryGoal, currentFollowers: f.currentFollowers || survey.followerCount, mainProblem: f.mainProblem || survey.topStruggle }));
  }, [survey.hasData]);

  const [hubPrefillTopic, setHubPrefillTopic] = useState<string | null>(null);
  const [pendingAutoAnalyze, setPendingAutoAnalyze] = useState<string | null>(null);

  useEffect(() => {
    const prefill = sessionStorage.getItem("coach_prefill");
    const topic = sessionStorage.getItem("coach_prefill_topic");
    if (prefill) {
      setScript(prefill);
      if (topic) setHubPrefillTopic(topic);
      setPendingAutoAnalyze(prefill);
      sessionStorage.removeItem("coach_prefill");
      sessionStorage.removeItem("coach_prefill_topic");
    }
  }, []);

  // Auto-trigger analysis once greeting is shown and hub script is loaded
  useEffect(() => {
    if (!pendingAutoAnalyze || !hasGreeted || messages.length === 0 || thinking) return;
    const toAnalyze = pendingAutoAnalyze;
    setPendingAutoAnalyze(null);
    const t = setTimeout(() => {
      sendToAgent(
        `Analyze this script${hubPrefillTopic ? ` built from competitor intelligence for "${hubPrefillTopic}"` : ""}. Score it across hook, clarity, persuasion, and CTA — then tell me exactly what to fix to make it go viral.`,
        toAnalyze
      );
    }, 500);
    return () => clearTimeout(t);
  }, [pendingAutoAnalyze, hasGreeted, messages.length]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  // ── Live hook scorer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!script.trim()) { setHookScore(null); return; }
    const firstSentence = script.split(/[\n.!?]/)[0].trim();
    if (firstSentence.length < 8) { setHookScore(null); return; }
    const timer = setTimeout(async () => {
      setHookScoring(true);
      try {
        const d = await apiRequest("POST", "/api/coach/score-hook", { hook: firstSentence, platform });
        setHookScore({
          score: d.score,
          label: d.label,
          color: d.score >= 75 ? "#34d399" : d.score >= 50 ? GOLD : "#f87171",
          weakness: d.weakness || "",
        });
      } catch {} finally { setHookScoring(false); }
    }, 900);
    return () => clearTimeout(timer);
  }, [script, platform]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("script");
    if (s) {
      const decoded = decodeURIComponent(s);
      window.history.replaceState({}, "", window.location.pathname);
      let i = 0;
      setScript("");
      const timer = setInterval(() => { i++; setScript(decoded.slice(0, i)); if (i >= decoded.length) clearInterval(timer); }, 16);
      return () => clearInterval(timer);
    }
  }, []);

  useEffect(() => {
    if (hasGreeted) return;
    setHasGreeted(true);
    const niche = coachProfile?.niche;
    const sessions = coachProfile?.total_sessions || 0;

    // Special greeting when arriving with a hub script
    if (pendingAutoAnalyze && hubPrefillTopic) {
      setMessages([{
        role: "coach",
        content: `Script loaded from your Daily Intel Hub 🎯\n\nTopic: "${hubPrefillTopic}"\n\nThis was built from real competitor data. Analyzing it now — scoring your hook, clarity, persuasion, and CTA, then giving you exact fixes 👇`,
        timestamp: Date.now()
      }]);
      return;
    }

    const greetings = sessions > 0 && niche
      ? [`Yo, welcome back 👋 Last time your avg score was ${Number(coachProfile?.avg_overall || 0).toFixed(0)}/100. Let's push that higher — drop a script 🔥`]
      : [
          "Yo 👋 What are we creating today?\n\nPaste your script below and I'll score it, find every weak point, and tell you exactly how to fix it 🔥",
          "Let's build something viral 🔥 Paste your script or hook below — I'll break it down completely.",
          "Ready to coach you 💪 Drop your script below and I'll give you scores, issues, and a full rewrite.",
        ];
    setMessages([{ role:"coach", content:greetings[Math.floor(Math.random()*greetings.length)], timestamp:Date.now() }]);
  }, [coachProfile]);

  const addCoachMsg = (content:string, extras?:{ analysis?:AnalysisData|null; competitorData?:any; scriptResult?:any; brandData?:any; roadmapData?:any; postPackage?:any; agentSteps?:string[] }) =>
    setMessages(prev=>[...prev,{ role:"coach",content,...(extras||{}),timestamp:Date.now() }]);
  const addUserMsg = (content:string) =>
    setMessages(prev=>[...prev,{ role:"user",content,timestamp:Date.now() }]);

  // ── Primary: agent endpoint (Claude tool calling) ─────────────────────────
  const sendToAgent = async (userMsg:string, scriptToAnalyze?:string) => {
    if (!userMsg.trim() && !scriptToAnalyze) return;

    // Version tracking — save script version before sending
    if (scriptToAnalyze) {
      const vId = `v-${Date.now()}`;
      setVersions(prev => {
        if (prev.length > 0 && prev[prev.length-1].script === scriptToAnalyze) {
          pendingVersionId.current = prev[prev.length-1].id;
          return prev;
        }
        pendingVersionId.current = vId;
        return [...prev, { id: vId, script: scriptToAnalyze, score: null, label: `v${prev.length + 1}`, ts: Date.now() }];
      });
    }

    addUserMsg(scriptToAnalyze ? `[Script] ${scriptToAnalyze.slice(0,100)}…` : userMsg);
    setThinking(true); setMood("thinking");
    try {
      const history = messages.slice(-8).map(m=>({ role:m.role==="coach"?"assistant":"user",content:m.content }));
      const data = await apiRequest("POST","/api/coach/agent",{
        message: userMsg,
        script: scriptToAnalyze,
        mode,
        goal,
        platform,
        history,
      });

      // Tag version with score
      if (data.analysis?.overallScore && pendingVersionId.current) {
        const vid = pendingVersionId.current;
        setVersions(prev => prev.map(v => v.id === vid ? { ...v, score: data.analysis.overallScore } : v));
        pendingVersionId.current = null;
      }

      setMood(data.mood==="strong"?"strong":data.mood==="weak"?"weak":"decent");
      addCoachMsg(data.reply||"Let me check that out…",{
        analysis: data.analysis||null,
        scriptResult: data.scriptResult||null,
        agentSteps: data.agentSteps||[],
      });
      qc.invalidateQueries({ queryKey: ["/api/coach/scores"] });
      qc.invalidateQueries({ queryKey: ["/api/coach/profile"] });
    } catch(e:any) {
      if (e instanceof ApiError && e.status === 402) {
        setCreditError(e.message);
      } else if (e instanceof ApiError && e.status === 401) {
        toast({ title:"Session expired",description:"Please log in again",variant:"destructive" });
      } else {
        toast({ title:"Coach is down",description:e.message||"Try again in a moment",variant:"destructive" });
      }
      setMood("idle");
    }
    finally { setThinking(false); }
  };

  // ── Post Package builder ──────────────────────────────────────────────────
  const buildPostPackage = async () => {
    if (!script.trim()) { toast({ title:"Add your script first!" }); return; }
    setBuildingPackage(true);
    try {
      const data = await apiRequest("POST", "/api/coach/post-package", {
        script,
        platform,
        niche: coachProfile?.niche || "content creation",
      });
      addCoachMsg("Here's your full post package 📦", { postPackage: data });
    } catch(e:any) {
      if (e instanceof ApiError && e.status === 402) setCreditError(e.message);
      else toast({ title: "Package build failed", variant: "destructive" });
    } finally { setBuildingPackage(false); }
  };

  const restoreSession = (item: any) => {
    saveSession();
    const inp = item.inputs || {};
    const out = item.output || {};
    setScript(inp.script || "");
    if (inp.mode) setMode(inp.mode);
    if (inp.goal) setGoal(inp.goal);
    const restoredMsgs: ChatMessage[] = (out.preview || []).map((m: any) => ({
      role: m.role === "assistant" ? "coach" : m.role,
      content: m.content,
      timestamp: Date.now(),
    }));
    setMessages(restoredMsgs.length > 0 ? restoredMsgs : [{ role: "coach", content: "Session restored! Continue where you left off 🔄", timestamp: Date.now() }]);
    setMood("idle");
    setCreditError(null);
    setHasGreeted(true);
    toast({ title: "Session restored", description: `"${item.title?.slice(0, 40)}"` });
  };

  const handleQuickAction = async (action:string) => {
    if (!script.trim()) { toast({ title:"Add your script first!",description:"Paste your content then try again." }); return; }
    const actionMsg: Record<string,string> = {
      hooks:"Generate 5 viral hooks for my content",
      viral:"Do a full viral rewrite of my script",
      retention:"Do a retention analysis — where will people drop off and why?",
      clarify:"Improve the clarity of my script — cut the confusion",
      emotion:"Add emotion and vulnerability to make people feel something",
      shorten:"Shorten and tighten my script — cut all the fluff",
    };
    await sendToAgent(actionMsg[action] || action, script);
  };

  const handleTone = async (tone:string) => {
    if (!script.trim()) { toast({ title:"Add your script first!" }); return; }
    await sendToAgent(`Rewrite my script in ${tone} mode`, script);
  };

  const analyzeCompetitor = async () => {
    if (!competitorUrl.trim()) return;
    const url = competitorUrl; setCompetitorUrl("");
    addUserMsg(`Analyze competitor: ${url}`);
    setThinking(true); setMood("thinking");
    try {
      const data = await apiRequest("POST","/api/coach/competitor",{ url });
      setMood(data.mood==="strong"?"strong":"decent");
      addCoachMsg(data.reply||"Here's what I found 👀",{ competitorData:data });
    } catch(e:any) { toast({ title:"Scrape failed",description:e.message,variant:"destructive" }); setMood("idle"); }
    finally { setThinking(false); }
  };

  const buildBrand = async () => {
    if (!brandForm.niche||!brandForm.target||!brandForm.goal) {
      toast({ title:"Fill in all fields",description:"Niche, target audience, and goal are required." }); return;
    }
    addUserMsg(`Build my personal brand — Niche: ${brandForm.niche}, Target: ${brandForm.target}, Goal: ${brandForm.goal}`);
    setBuildingBrand(true); setThinking(true); setMood("thinking");
    try {
      const data = await apiRequest("POST","/api/coach/brand",brandForm);
      addCoachMsg(`Okay I built your complete brand strategy 🏆 Here's everything you need to stand out in ${brandForm.niche}:`,{ brandData:data });
      setMood("strong");
    } catch(e:any) { toast({ title:"Brand builder failed",description:e.message,variant:"destructive" }); setMood("idle"); }
    finally { setBuildingBrand(false); setThinking(false); }
  };

  const buildRoadmap = async () => {
    if (!roadmapForm.niche||!roadmapForm.goal) {
      toast({ title:"Fill in your niche and goal" }); return;
    }
    addUserMsg(`Create my growth roadmap — Niche: ${roadmapForm.niche}, Goal: ${roadmapForm.goal}, Problem: ${roadmapForm.mainProblem||"getting started"}`);
    setBuildingRoadmap(true); setThinking(true); setMood("thinking");
    try {
      const data = await apiRequest("POST","/api/coach/roadmap",roadmapForm);
      addCoachMsg(`Your 30-day growth roadmap is ready 🗺️ Follow this and you WILL see results. No excuses 💪`,{ roadmapData:data });
      setMood("strong");
    } catch(e:any) { toast({ title:"Roadmap failed",description:e.message,variant:"destructive" }); setMood("idle"); }
    finally { setBuildingRoadmap(false); setThinking(false); }
  };

  const handleFixLine = async (line:string) => {
    await sendToAgent(`Fix this specific line for me: "${line}"`, script || undefined);
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const msg=chatInput; setChatInput(""); sendToAgent(msg, script && script.trim().length > 20 ? script : undefined);
  };

  const isScriptMode = ["breakdown","pre-post"].includes(mode);

  return (
    <ClientLayout>
      {showProfileModal && (
        <ProfileSetupModal
          profile={coachProfile}
          onSave={(data) => profileMutation.mutate(data)}
          onClose={() => setShowProfileModal(false)}
        />
      )}
      <div className="min-h-screen bg-background flex flex-col" style={{ maxHeight:"100vh" }}>
        {/* Header */}
        <div className="border-b border-border px-6 py-3 flex items-center gap-4 shrink-0" data-tour="coach-header">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color:GOLD }}/>
            <h1 className="text-lg font-bold text-foreground">AI Content Coach</h1>
          </div>
          <Badge style={{ background:"#d4b46122",color:GOLD,borderColor:"#d4b46130",fontSize:10 }} className="border">AGENT</Badge>
          <div className="ml-auto flex items-center gap-2">
            {GOALS.map(g=>(
              <button key={g.id} onClick={()=>setGoal(g.id)} data-testid={`goal-${g.id}`}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${goal===g.id?g.color:"border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                {g.label}
              </button>
            ))}
            <PageTourButton pageKey="ai-coach" />
          </div>
        </div>

        {creditError && (
          <div className="px-6 py-3 shrink-0">
            <CreditErrorBanner message={creditError} />
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Sidebar ── */}
          <div className="w-64 shrink-0 border-r border-border flex flex-col bg-zinc-950/50 overflow-y-auto">
            {/* Character */}
            <div className="flex flex-col items-center py-6 px-4 border-b border-border">
              <CoachCharacter mood={mood} thinking={thinking}/>
              <p className="text-[11px] text-zinc-500 text-center mt-3 leading-relaxed px-2">
                Your AI content agent — drops scripts, I do everything automatically.
              </p>
            </div>

            {/* Profile chip */}
            <div className="px-3 pt-3 pb-2 border-b border-border">
              <ProfileChip profile={coachProfile} onEdit={() => setShowProfileModal(true)} />
              {!coachProfile?.niche && (
                <button onClick={() => setShowProfileModal(true)} className="w-full mt-1.5 text-[10px] text-center py-1 rounded-lg border border-dashed border-zinc-700 text-zinc-600 hover:text-zinc-400 hover:border-zinc-500 transition-all">
                  + Set your niche for personalized coaching
                </button>
              )}
            </div>

            {/* Score trend */}
            {scoreHistory && scoreHistory.length >= 2 && (
              <div className="px-3 py-3 border-b border-border">
                <ScoreTrendChart scores={scoreHistory} />
              </div>
            )}

            {/* Platform */}
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Platform</p>
              <div className="flex gap-1">
                {PLATFORMS.map(p => {
                  const Icon = p.icon;
                  const active = platform === p.id;
                  return (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      title={p.note}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${active ? "border text-primary bg-primary/10" : "border border-transparent text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"}`}
                      style={active ? { borderColor: `${GOLD}40`, background: `${GOLD}12`, color: GOLD } : {}}>
                      <Icon className="w-3.5 h-3.5"/>
                      <span className="text-[9px] font-semibold">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modes */}
            <div className="p-3 border-b border-border" data-tour="coach-modes">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mode</p>
              <div className="space-y-1">
                {MODES.map(m=>{
                  const Icon=m.icon, active=mode===m.id;
                  return (
                    <button key={m.id} onClick={()=>setMode(m.id)} data-testid={`mode-${m.id}`}
                      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${active?"bg-primary/15 border border-primary/30":"text-zinc-400 hover:bg-zinc-800/50"}`}>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${active?"text-primary":"text-zinc-500"}`}/>
                      <div className="min-w-0">
                        <p className={`text-[12px] font-medium leading-tight ${active?"text-primary":"text-zinc-300"}`}>{m.label}</p>
                        <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">{m.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions (script modes only) */}
            {isScriptMode && (
              <div className="p-3 border-b border-border space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</p>
                {!script.trim() && (
                  <div className="px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-center">
                    <p className="text-[10px] text-zinc-600">Paste your script below first ↓</p>
                  </div>
                )}
                {[
                  { id:"hooks", icon:Zap, label:"Generate Hooks", color:"text-yellow-400" },
                  { id:"viral", icon:Flame, label:"Make It Viral", color:"text-red-400" },
                  { id:"retention", icon:BarChart2, label:"Retention Warning", color:"text-blue-400" },
                  { id:"clarify", icon:BookOpen, label:"Improve Clarity", color:"text-purple-400" },
                  { id:"emotion", icon:Heart, label:"Add Emotion", color:"text-pink-400" },
                  { id:"shorten", icon:Scissors, label:"Shorten / Tighten", color:"text-orange-400" },
                ].map(a=>{
                  const Icon=a.icon;
                  return (
                    <Button key={a.id} size="sm" onClick={()=>handleQuickAction(a.id)} disabled={thinking||!script.trim()}
                      data-testid={`btn-action-${a.id}`}
                      className="w-full h-8 text-[11px] justify-start gap-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 disabled:opacity-30">
                      <Icon className={`w-3.5 h-3.5 ${a.color}`}/>{a.label}
                    </Button>
                  );
                })}

                {/* Tone modes */}
                <button onClick={()=>setShowTones(v=>!v)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-all border border-zinc-700/40 mt-1">
                  <span className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-zinc-500"/>Tone Modes</span>
                  {showTones?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
                </button>
                {showTones && (
                  <div className="grid grid-cols-2 gap-1 pl-1">
                    {TONES.map(t=>(
                      <button key={t.id} onClick={()=>handleTone(t.id)} disabled={thinking||!script.trim()}
                        data-testid={`btn-tone-${t.id}`}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all disabled:opacity-40 ${t.color}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Script Version History */}
            {versions.length > 0 && (
              <div className="p-3 border-b border-border">
                <button onClick={() => setShowVersions(v => !v)}
                  className="w-full flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors mb-1">
                  <span className="flex items-center gap-1.5"><History className="w-3 h-3"/>Versions ({versions.length})</span>
                  {showVersions ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                </button>
                {showVersions && (
                  <div className="space-y-0.5 mt-1">
                    {versions.map((v, i) => (
                      <button key={v.id} onClick={() => setScript(v.script)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 text-left transition-colors ${i === versions.length-1 ? "bg-zinc-800/30" : ""}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-semibold text-zinc-400 shrink-0">{v.label}</span>
                          <span className="text-[9px] text-zinc-700 truncate">{new Date(v.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                        </div>
                        {v.score !== null
                          ? <span className="text-[10px] font-bold shrink-0" style={{ color: v.score >= 75 ? "#34d399" : v.score >= 50 ? GOLD : "#f87171" }}>{v.score}</span>
                          : <span className="text-[9px] text-zinc-700 shrink-0">—</span>
                        }
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Session History */}
            <div className="p-3 border-b border-border" data-tour="coach-sessions">
              <button
                onClick={() => setShowSessionHistory(v => !v)}
                className="w-full flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors mb-1"
                data-testid="toggle-coach-history"
              >
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />Sessions ({coachHistory.length})</span>
                {showSessionHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showSessionHistory && (
                <div className="space-y-1 max-h-48 overflow-y-auto mt-1">
                  {coachHistory.length === 0 ? (
                    <p className="text-[10px] text-zinc-600 text-center py-3">No saved sessions yet</p>
                  ) : (
                    coachHistory.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => restoreSession(item)} data-testid={`restore-session-${item.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-zinc-300 truncate leading-snug">{item.title}</p>
                          <p className="text-[9px] text-zinc-600">{new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {item.output?.messageCount ?? 0} msgs</p>
                        </div>
                        <button
                          className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                          onClick={e => { e.stopPropagation(); apiRequest("DELETE", `/api/ai/history/${item.id}`).then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=coach"] })).catch(() => {}); }}
                          data-testid={`delete-session-${item.id}`}
                          title="Delete session"
                        ><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={startNewSession}
                className="w-full mt-2 h-7 text-[10px] border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 gap-1.5"
                data-testid="btn-new-session"
              >
                <PlusCircle className="w-3 h-3" />New Session
              </Button>
            </div>
          </div>

          {/* ── Center: Chat ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat top bar with Watch intro button */}
            <div className="flex items-center justify-end px-4 py-2 border-b border-border/40 shrink-0">
              <button
                onClick={() => setShowWelcome(true)}
                className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5"/>
                Watch intro
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg,i)=>(
                msg.role==="coach"?(
                  <CoachBubble key={i} msg={msg} onFixLine={handleFixLine} onQuickAction={handleQuickAction} isLast={i===messages.length-1}/>
                ):(
                  <div key={i} className="flex justify-end">
                    <div className="max-w-sm bg-zinc-800 border border-zinc-700/50 rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )
              ))}
              {thinking && (
                <div className="flex items-start gap-3">
                  <div style={{ width:32,height:32,borderRadius:"50%",background:"#111",border:`1.5px solid ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>🤙</div>
                  <div style={{ border:`1px solid ${GOLD}33`,background:"rgba(212,180,97,0.04)" }} className="rounded-2xl rounded-tl-sm">
                    <TypingDots/>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* ── Bottom Input Area ── */}
            <div className="border-t border-border p-4 shrink-0 space-y-3">

              {isScriptMode && (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Script / Hook / Idea</label>
                  {hubPrefillTopic && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#d4b461]/25 bg-[#d4b461]/8 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-[#d4b461] shrink-0">FROM HUB</span>
                        <span className="text-[11px] text-white/60 truncate">{hubPrefillTopic}</span>
                      </div>
                      <button onClick={() => setHubPrefillTopic(null)} className="shrink-0 text-white/25 hover:text-white/60 text-xs">✕</button>
                    </div>
                  )}
                  <Textarea value={script} onChange={e=>setScript(e.target.value)} placeholder="Paste your script, hook, or content idea here…" className="min-h-20 text-sm bg-zinc-900/80 border-zinc-700/60 resize-none" data-testid="textarea-script"/>

                  {/* Hook score bar */}
                  {script.trim() && (
                    <div className="flex items-center justify-between px-0.5">
                      <p className="text-[10px] text-zinc-600">Hook strength</p>
                      {hookScoring
                        ? <span className="text-[10px] text-zinc-700 animate-pulse">scoring…</span>
                        : hookScore
                          ? <div className="flex items-center gap-2">
                              {hookScore.weakness && <span className="text-[10px] text-zinc-600 truncate max-w-[120px]" title={hookScore.weakness}>{hookScore.weakness}</span>}
                              <div className="w-14 h-1 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width:`${hookScore.score}%`, background:hookScore.color }}/>
                              </div>
                              <span className="text-[10px] font-bold shrink-0" style={{ color:hookScore.color }}>{hookScore.score}</span>
                            </div>
                          : null
                      }
                    </div>
                  )}

                  <AiRefineButton text={script} onAccept={setScript} context="social media script or hook" />
                  <Button onClick={()=>{ if(!script.trim()){toast({title:"Add your script first!"});return;} sendToAgent("Analyze my content and give me everything I need to improve it", script); }} disabled={thinking||!script.trim()} className="w-full h-9 font-semibold" style={{ background:GOLD,color:"#000" }} data-testid="btn-analyze-script">
                    {thinking?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<Brain className="w-4 h-4 mr-2"/>}
                    {mode==="pre-post"?"Pre-Post Check":"Analyze My Content"}
                  </Button>
                  {script.trim() && (
                    <Button onClick={buildPostPackage} disabled={buildingPackage||thinking} variant="outline"
                      className="w-full h-8 text-[11px] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 gap-1.5">
                      {buildingPackage?<Loader2 className="w-3 h-3 animate-spin"/>:<Package className="w-3 h-3"/>}
                      Generate Post Package
                    </Button>
                  )}
                </div>
              )}

              {mode==="competitor" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Competitor Instagram URL or @handle</label>
                  <div className="flex gap-2">
                    <Input value={competitorUrl} onChange={e=>setCompetitorUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyzeCompetitor()} placeholder="instagram.com/competitor or @handle" className="flex-1 h-9 text-sm bg-zinc-900/80 border-zinc-700/60" data-testid="input-competitor-url"/>
                    <Button onClick={analyzeCompetitor} disabled={thinking||!competitorUrl.trim()} className="h-9 px-4 font-semibold shrink-0" style={{ background:GOLD,color:"#000" }} data-testid="btn-analyze-competitor">
                      {thinking?<Loader2 className="w-4 h-4 animate-spin"/>:<Instagram className="w-4 h-4"/>}
                    </Button>
                  </div>
                </div>
              )}

              {mode==="brand" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Niche *</label>
                      <Input value={brandForm.niche} onChange={e=>setBrandForm(f=>({...f,niche:e.target.value}))} placeholder="e.g. fitness for busy moms" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-brand-niche"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Target Audience *</label>
                      <Input value={brandForm.target} onChange={e=>setBrandForm(f=>({...f,target:e.target.value}))} placeholder="e.g. women 25-40 who want to lose weight" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-brand-target"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Goal *</label>
                      <Input value={brandForm.goal} onChange={e=>setBrandForm(f=>({...f,goal:e.target.value}))} placeholder="e.g. get clients, grow to 100k" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-brand-goal"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Current Bio (optional)</label>
                      <Input value={brandForm.currentBio} onChange={e=>setBrandForm(f=>({...f,currentBio:e.target.value}))} placeholder="Your current Instagram bio" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-brand-bio"/>
                    </div>
                  </div>
                  <Button onClick={buildBrand} disabled={buildingBrand||thinking||!brandForm.niche||!brandForm.target||!brandForm.goal} className="w-full h-9 font-semibold" style={{ background:GOLD,color:"#000" }} data-testid="btn-build-brand">
                    {buildingBrand?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<User className="w-4 h-4 mr-2"/>}
                    Build My Brand Strategy
                  </Button>
                </div>
              )}

              {mode==="roadmap" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Niche *</label>
                      <Input value={roadmapForm.niche} onChange={e=>setRoadmapForm(f=>({...f,niche:e.target.value}))} placeholder="e.g. personal finance" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-roadmap-niche"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">30-Day Goal *</label>
                      <Input value={roadmapForm.goal} onChange={e=>setRoadmapForm(f=>({...f,goal:e.target.value}))} placeholder="e.g. hit 10k followers" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-roadmap-goal"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Current Followers</label>
                      <Input value={roadmapForm.currentFollowers} onChange={e=>setRoadmapForm(f=>({...f,currentFollowers:e.target.value}))} placeholder="e.g. 500" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-roadmap-followers"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Biggest Problem</label>
                      <Input value={roadmapForm.mainProblem} onChange={e=>setRoadmapForm(f=>({...f,mainProblem:e.target.value}))} placeholder="e.g. hooks aren't working" className="h-8 text-xs bg-zinc-900/80 border-zinc-700/60" data-testid="input-roadmap-problem"/>
                    </div>
                  </div>
                  <Button onClick={buildRoadmap} disabled={buildingRoadmap||thinking||!roadmapForm.niche||!roadmapForm.goal} className="w-full h-9 font-semibold" style={{ background:GOLD,color:"#000" }} data-testid="btn-build-roadmap">
                    {buildingRoadmap?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<Map className="w-4 h-4 mr-2"/>}
                    Generate My 30-Day Roadmap
                  </Button>
                </div>
              )}

              {/* Chat input — always visible */}
              <div className="flex gap-2" data-tour="coach-chat-input">
                <Input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleChat()}
                  placeholder="Ask Coach anything… (e.g. &quot;how do I improve my hook?&quot;)"
                  className="flex-1 h-9 text-sm bg-zinc-900/80 border-zinc-700/60" disabled={thinking} data-testid="input-chat"/>
                <Button onClick={handleChat} disabled={thinking||!chatInput.trim()} size="sm" className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700" data-testid="btn-send-chat">
                  <Send className="w-4 h-4 text-zinc-300"/>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>

    {/* ── Welcome Video Modal — shows once, user can reopen via "Watch intro" ── */}
    {showWelcome && <WelcomeVideoModal onClose={dismissWelcome}/>}
  );
}
