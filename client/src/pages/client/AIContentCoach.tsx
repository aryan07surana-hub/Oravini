import { useState, useRef, useEffect } from "react";
import { PageTourButton } from "@/components/ui/TourGuide";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Clock, Trash2, PlusCircle,
} from "lucide-react";

const GOLD = "#d4b461";

type Mood = "weak" | "decent" | "strong" | "idle" | "thinking";

type ChatMessage = {
  role: "coach" | "user";
  content: string;
  analysis?: AnalysisData | null;
  competitorData?: any;
  scriptResult?: { script: string; label: string; explanation?: string; extras?: string[] };
  brandData?: any;
  roadmapData?: any;
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
  { id: "brand", label: "Brand Builder", icon: User },
  { id: "roadmap", label: "AI Roadmap", icon: Map },
];

const TONES = [
  { id: "funny", label: "😂 Funny", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  { id: "serious", label: "🎤 Serious", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { id: "educational", label: "📚 Educational", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  { id: "sales", label: "💰 Sales", color: "text-green-400 border-green-500/30 bg-green-500/10" },
  { id: "story", label: "📖 Story", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  { id: "emotional", label: "😢 Emotional", color: "text-pink-400 border-pink-500/30 bg-pink-500/10" },
];

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

function CoachBubble({ msg, onFixLine }: { msg: ChatMessage; onFixLine: (line: string) => void }) {
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
        </div>

        {a && (
          <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-4">
              <ScoreRing score={a.overallScore}/>
              <div className="flex-1 space-y-1.5">
                {Object.entries(a.scores).map(([k,v])=>(
                  <ScoreBar key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} value={v as number}/>
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
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-400"/> Drop-off warnings
                </p>
                {a.dropoffs.map((d,i)=>(
                  <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="text-orange-400 shrink-0">~{d.second}s</span>
                    <span>{d.reason}</span>
                    <Badge style={{ fontSize:9,background:d.severity==="high"?"#f8717122":"#fb923c22",color:d.severity==="high"?"#f87171":"#fb923c",border:"none" }}>{d.severity}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {msg.scriptResult && <ScriptResultCard result={msg.scriptResult}/>}
        {msg.brandData && <BrandResultCard data={msg.brandData}/>}
        {msg.roadmapData && <RoadmapCard data={msg.roadmapData}/>}

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

  const { data: coachHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/history?tool=coach"],
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

  // Brand builder state
  const [brandForm, setBrandForm] = useState({ niche: "", target: "", goal: "", currentBio: "", handle: "" });
  const [buildingBrand, setBuildingBrand] = useState(false);

  // Roadmap state
  const [roadmapForm, setRoadmapForm] = useState({ niche: "", goal: "", currentFollowers: "", mainProblem: "" });
  const [buildingRoadmap, setBuildingRoadmap] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  // Pre-fill from Jarvis navigation (URL params)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("script");
    if (s) {
      setScript(decodeURIComponent(s));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (hasGreeted) return;
    setHasGreeted(true);
    const greetings = [
      "Yo 👋 how are you doing? What are we creating today?\n\nDrop your script, idea, or Instagram link — let's make it better 🔥",
      "Let's build something viral today 🔥 Drop your script or idea and I'll break it down for you.",
      "Yo! Ready to make some fire content? Paste your script below and I'll tell you EXACTLY what to fix 👇",
    ];
    setMessages([{ role:"coach", content:greetings[Math.floor(Math.random()*greetings.length)], timestamp:Date.now() }]);
  }, []);

  const addCoachMsg = (content:string, extras?:{ analysis?:AnalysisData|null; competitorData?:any; scriptResult?:any; brandData?:any; roadmapData?:any }) =>
    setMessages(prev=>[...prev,{ role:"coach",content,...(extras||{}),timestamp:Date.now() }]);
  const addUserMsg = (content:string) =>
    setMessages(prev=>[...prev,{ role:"user",content,timestamp:Date.now() }]);

  const sendToCoach = async (userMsg:string, scriptToAnalyze?:string) => {
    if (!userMsg.trim() && !scriptToAnalyze) return;
    addUserMsg(scriptToAnalyze ? `[Script] ${scriptToAnalyze.slice(0,100)}…` : userMsg);
    setThinking(true); setMood("thinking");
    try {
      const minDelay = new Promise<void>(resolve => setTimeout(resolve, 15000));
      const history = messages.slice(-8).map(m=>({ role:m.role==="coach"?"assistant":"user",content:m.content }));
      const [data] = await Promise.all([
        apiRequest("POST","/api/coach/chat",{ message:userMsg||"Analyze this script",script:scriptToAnalyze||(userMsg.length>40?userMsg:undefined),mode,goal,history }),
        minDelay,
      ]);
      setMood(data.mood==="strong"?"strong":data.mood==="weak"?"weak":"decent");
      addCoachMsg(data.reply||"Let me check that out…",{ analysis:data.analysis||null });
    } catch(e:any) {
      if (e instanceof ApiError && e.status === 402) {
        setCreditError(e.message);
      } else {
        toast({ title:"Coach is down",description:e.message,variant:"destructive" });
      }
      setMood("idle");
    }
    finally { setThinking(false); }
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
    setThinking(true); setMood("thinking");
    const actionLabels:Record<string,string> = {
      hooks:"Generate Hooks",viral:"Make It Viral",retention:"Retention Warning",
      clarify:"Improve Clarity",emotion:"Add Emotion",shorten:"Shorten/Tighten",
    };
    addUserMsg(`${actionLabels[action] || action} my content`);
    try {
      if (action==="hooks") {
        const data = await apiRequest("POST","/api/virality/hooks",{ script,platform:"instagram" });
        const hooks = data.hooks||[];
        addCoachMsg(
          `Here are ${hooks.length} scroll-stopping hooks — pick the one that feels most like YOU 🎣\n\n${hooks.map((h:string,i:number)=>`${i+1}. "${h}"`).join("\n")}\n\nTest these and let me know how they hit 🔥`,
        );
        setMood("strong");
      } else if (action==="viral") {
        const lastAnalysis = [...messages].reverse().find(m=>m.analysis);
        const data = await apiRequest("POST","/api/coach/improve-script",{ script,goal,issues:lastAnalysis?.analysis?.issues||[] });
        addCoachMsg("Okay here's your improved script 🔥 I fixed the hook, tightened pacing, and made the payoff hit harder:",{
          scriptResult:{ script:data.script||"",label:"✨ VIRAL REWRITE",explanation:"Compare this with your original — notice the hook is sharper and the ending has more punch." }
        });
        setMood("strong");
      } else if (action==="retention") {
        sendToCoach("Do a retention analysis — where will people drop off and why?",script);
        return;
      } else if (action==="clarify") {
        const data = await apiRequest("POST","/api/coach/clarify",{ script });
        addCoachMsg(`Okay I stripped out all the confusing parts 🧹 Your message is way clearer now:\n\n${data.explanation||""}`,{
          scriptResult:{ script:data.script||"",label:"💡 CLARITY REWRITE",extras:data.removed||[] }
        });
        setMood("decent");
      } else if (action==="emotion") {
        const data = await apiRequest("POST","/api/coach/add-emotion",{ script });
        addCoachMsg(`Injected some emotion into this 💉 People will actually FEEL something now:\n\n${data.explanation||""}`,{
          scriptResult:{ script:data.script||"",label:"❤️ EMOTIONAL VERSION",extras:data.triggers||[] }
        });
        setMood("strong");
      } else if (action==="shorten") {
        const data = await apiRequest("POST","/api/coach/shorten",{ script });
        addCoachMsg(`Cut out all the fluff ✂️ Tighter, faster, more watchable:\n\n${data.explanation||""}`,{
          scriptResult:{ script:data.script||"",label:"✂️ TIGHTENED VERSION",extras:data.cutLines||[] }
        });
        setMood("decent");
      }
    } catch(e:any) { toast({ title:"Action failed",description:e.message,variant:"destructive" }); setMood("idle"); }
    finally { setThinking(false); }
  };

  const handleTone = async (tone:string) => {
    if (!script.trim()) { toast({ title:"Add your script first!",description:"Paste your content then select a tone." }); return; }
    const toneLabel = TONES.find(t=>t.id===tone)?.label||tone;
    addUserMsg(`Rewrite my script in ${toneLabel} mode`);
    setThinking(true); setMood("thinking");
    try {
      const data = await apiRequest("POST","/api/coach/tone",{ script,tone });
      addCoachMsg(`Done 🎭 Here's your script in ${toneLabel} mode:\n\n${data.whatChanged||""}`,{
        scriptResult:{ script:data.script||"",label:`${toneLabel.toUpperCase()} MODE` }
      });
      setMood("strong");
    } catch(e:any) { toast({ title:"Tone failed",description:e.message,variant:"destructive" }); setMood("idle"); }
    finally { setThinking(false); }
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
      addCoachMsg(`Okay I built your complete brand strategy 🏆 You've got a unique angle — here's everything you need to stand out in ${brandForm.niche}:`,{ brandData:data });
      setMood("strong");
    } catch(e:any) { toast({ title:"Brand builder failed",description:e.message,variant:"destructive" }); setMood("idle"); }
    finally { setBuildingBrand(false); setThinking(false); }
  };

  const buildRoadmap = async () => {
    if (!roadmapForm.niche||!roadmapForm.goal) {
      toast({ title:"Fill in your niche and goal",description:"These are required to generate your roadmap." }); return;
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
    try {
      const data = await apiRequest("POST","/api/coach/fix-line",{ line,goal,context:"Instagram Reel" });
      addCoachMsg(
        `Here are 3 better versions of that line 💪\n\n${data.rewrites?.map((r:string,i:number)=>`${i+1}. "${r}"`).join("\n")||""}\n\n${data.explanation||""}`,
      );
    } catch(e:any) { toast({ title:"Fix failed",description:e.message,variant:"destructive" }); }
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const msg=chatInput; setChatInput(""); sendToCoach(msg);
  };

  const isScriptMode = ["breakdown","pre-post"].includes(mode);

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background flex flex-col" style={{ maxHeight:"100vh" }}>
        {/* Header */}
        <div className="border-b border-border px-6 py-3 flex items-center gap-4 shrink-0" data-tour="coach-header">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color:GOLD }}/>
            <h1 className="text-lg font-bold text-foreground">AI Content Coach</h1>
          </div>
          <Badge style={{ background:"#d4b46122",color:GOLD,borderColor:"#d4b46130",fontSize:10 }} className="border">BETA</Badge>
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
                Your AI content mentor — drop a script and I'll tell you exactly what to fix.
              </p>
            </div>

            {/* Modes */}
            <div className="p-3 border-b border-border" data-tour="coach-modes">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mode</p>
              <div className="space-y-1">
                {MODES.map(m=>{
                  const Icon=m.icon, active=mode===m.id;
                  return (
                    <button key={m.id} onClick={()=>setMode(m.id)} data-testid={`mode-${m.id}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${active?"bg-primary/15 text-primary border border-primary/30":"text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"}`}>
                      <Icon className="w-3.5 h-3.5"/> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions (script modes only) */}
            {isScriptMode && (
              <div className="p-3 border-b border-border space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</p>
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
                      className="w-full h-8 text-[11px] justify-start gap-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50">
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
          </div>

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

          {/* ── Center: Chat ── */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg,i)=>(
                msg.role==="coach"?(
                  <CoachBubble key={i} msg={msg} onFixLine={handleFixLine}/>
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

            {/* ── Bottom Input Area (context-aware) ── */}
            <div className="border-t border-border p-4 shrink-0 space-y-3">

              {/* Script breakdown / pre-post */}
              {isScriptMode && (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Script / Hook / Idea</label>
                  <Textarea value={script} onChange={e=>setScript(e.target.value)} placeholder="Paste your script, hook, or content idea here…" className="min-h-20 text-sm bg-zinc-900/80 border-zinc-700/60 resize-none" data-testid="textarea-script"/>
                  <AiRefineButton text={script} onAccept={setScript} context="social media script or hook" />
                  <Button onClick={()=>{ if(!script.trim()){toast({title:"Add your script first!"});return;} sendToCoach("Analyze my content",script); }} disabled={thinking||!script.trim()} className="w-full h-9 font-semibold" style={{ background:GOLD,color:"#000" }} data-testid="btn-analyze-script">
                    {thinking?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<Brain className="w-4 h-4 mr-2"/>}
                    {mode==="pre-post"?"Pre-Post Check":"Analyze My Content"}
                  </Button>
                </div>
              )}

              {/* Competitor mode */}
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

              {/* Brand builder mode */}
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

              {/* Roadmap mode */}
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
  );
}
