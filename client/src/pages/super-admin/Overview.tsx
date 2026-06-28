import SuperAdminLayout from "./Layout";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Zap, Building2, Sun, ChevronDown, ChevronUp, Star,
  Plus, Minus, Check, Trophy, Target, TrendingUp,
  Timer, Play, Pause, RotateCcw, Flame, Edit2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const GOLD = "#d4b461";

// ── Day system ────────────────────────────────────────────────────────────────
type DayType = "management" | "founder" | "light";

const DAY_MAP: Record<number, DayType> = {
  0: "light",
  1: "management",
  2: "founder",
  3: "management",
  4: "founder",
  5: "management",
  6: "founder",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Storage helpers ────────────────────────────────────────────────────────────
function toKey(d: Date) { return d.toISOString().slice(0, 10); }
function toWeekKey(d: Date) {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function ls<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }

// ── Day config ────────────────────────────────────────────────────────────────
const DAY_CONFIG = {
  management: {
    label: "Management Day", sub: "Run the machine", color: "#3b82f6", icon: Building2,
    description: "Maintain revenue, client delivery, and sales. Reactive day. End the day recording content from what happened.",
    morning: { title: "Morning — High Energy", emoji: "☀️", items: [
      { text: "Sales calls — prioritise booked leads first", tag: "consulting" },
      { text: "Lead follow-ups + DM outreach", tag: "outreach" },
      { text: "Client communication — calls, WhatsApp, updates", tag: "consulting" },
      { text: "Close open deals", tag: "consulting" },
    ]},
    afternoon: { title: "Afternoon — Delivery", emoji: "🌤️", items: [
      { text: "Client delivery — strategy, reviews, feedback loops", tag: "consulting" },
      { text: "Check funnels + lead flow + metrics", tag: "ops" },
      { text: "Fix any bottlenecks", tag: "ops" },
      { text: "Review team work / delegate", tag: "ops" },
    ]},
    evening: { title: "Evening — Learn + Create", emoji: "🌙", items: [
      { text: "Record content — use today's call moments as fuel (min 1 reel)", tag: "content" },
      { text: "Review a sales call — improve scripts", tag: "skill" },
      { text: "Study persuasion / messaging", tag: "skill" },
      { text: "Outreach — DMs before sleep", tag: "outreach" },
    ]},
    allowed: ["Calls", "WhatsApp / Slack", "Sales conversations", "Content recording", "Outreach"],
    blocked: ["Deep system building", "Big strategy rabbit holes", "Oravini feature work"],
  },
  founder: {
    label: "Founder Day", sub: "Build the machine", color: GOLD, icon: Zap,
    description: "Increase leverage and scale. Deep thinking and building day — no reactive work. Build Oravini, systems, record thought leadership content.",
    morning: { title: "Morning — Deep Work", emoji: "☀️", items: [
      { text: "Oravini — build features, fix bugs, ship improvements", tag: "oravini" },
      { text: "Business strategy — how to get more clients", tag: "strategy" },
      { text: "Offer improvement + market positioning", tag: "strategy" },
      { text: "Market research + competitor funnels", tag: "research" },
    ]},
    afternoon: { title: "Afternoon — Systems", emoji: "🌤️", items: [
      { text: "Oravini — automation, AI tools, CRM systems", tag: "oravini" },
      { text: "Lead generation system building", tag: "systems" },
      { text: "Funnel / VSL / SOP creation", tag: "systems" },
      { text: "Zapier / Make automations", tag: "systems" },
    ]},
    evening: { title: "Evening — Content + Growth", emoji: "🌙", items: [
      { text: "Record content — thought leadership, Oravini demos, founder journey (min 1 reel)", tag: "content" },
      { text: "Outreach — DMs before sleep", tag: "outreach" },
      { text: "Study business models + watch breakdowns", tag: "skill" },
    ]},
    allowed: ["Deep work", "Oravini building", "Strategy thinking", "System building", "Content recording", "Outreach"],
    blocked: ["Client calls", "Reactive client chats", "Slack rabbit holes"],
  },
  light: {
    label: "Light Day", sub: "Reflect & recharge", color: "#22c55e", icon: Sun,
    description: "Low pressure — but not zero. Review, plan, set the week up to win.",
    morning: { title: "Morning — Reflection", emoji: "☀️", items: [
      { text: "Review the full week — Consulting, Oravini, Content", tag: "review" },
      { text: "What generated revenue? What wasted time?", tag: "review" },
      { text: "What content performed best?", tag: "review" },
      { text: "Light reading from your library", tag: "learning" },
    ]},
    afternoon: { title: "Afternoon — Planning", emoji: "🌤️", items: [
      { text: "Plan next week — set Management Day priorities", tag: "planning" },
      { text: "Set Oravini build goals for Founder Days", tag: "planning" },
      { text: "Plan content ideas for the week", tag: "content" },
      { text: "Optional: batch content recording", tag: "content" },
    ]},
    evening: { title: "Evening — Reset", emoji: "🌙", items: [
      { text: "Outreach — even Sunday, even just 5 DMs", tag: "outreach" },
      { text: "Optional sales calls if high-intent leads are waiting", tag: "consulting" },
      { text: "Strategic thinking — where is the business in 90 days?", tag: "strategy" },
      { text: "Early night — Monday is a Management Day, show up charged", tag: "recovery" },
    ]},
    allowed: ["Light reading", "Week review", "Planning", "Optional sales calls", "Optional content"],
    blocked: ["Heavy Oravini building", "Stressful reactive work"],
  },
};

const NON_NEGOTIABLES = [
  { icon: "📣", text: "Outreach — every single day, no exceptions" },
  { icon: "🎥", text: "Record minimum 1 piece of content daily (Reels first)" },
  { icon: "📊", text: "Check numbers — revenue, leads, metrics, every day" },
];

const WEEKLY_REVIEW_QUESTIONS = [
  "What generated revenue this week?",
  "What wasted time — what should I cut?",
  "What should I build next in Oravini?",
  "What content performed best?",
  "Where is the bottleneck right now?",
];

const TAG_COLORS: Record<string, string> = {
  consulting: "#3b82f6", oravini: GOLD, content: "#a855f7", outreach: "#f97316",
  ops: "#06b6d4", skill: "#22c55e", strategy: GOLD, research: "#ec4899",
  systems: "#06b6d4", review: "#ef4444", learning: "#22c55e", planning: "#3b82f6", recovery: "#6b7280",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function PeriodBlock({ period, defaultOpen = false }: {
  period: { title: string; emoji: string; items: { text: string; tag: string }[] };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
        <span className="text-base">{period.emoji}</span>
        <span className="font-semibold text-sm text-foreground flex-1 text-left">{period.title}</span>
        <span className="text-xs text-muted-foreground mr-2">{period.items.length} tasks</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          {period.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: TAG_COLORS[item.tag] || GOLD }} />
              <span className="text-sm text-foreground flex-1 leading-relaxed">{item.text}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: `${TAG_COLORS[item.tag] || GOLD}22`, color: TAG_COLORS[item.tag] || GOLD }}>
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Overview() {
  const [now, setNow] = useState(new Date());
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dow = now.getDay();
  const dayType = DAY_MAP[dow];
  const cfg = DAY_CONFIG[dayType];
  const Icon = cfg.icon;
  const isSaturday = dow === 6;
  const todayKey = toKey(now);
  const weekKey = toWeekKey(now);
  const hour = now.getHours();
  const currentPeriod = hour < 12 ? 0 : hour < 17 ? 1 : 2;

  function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  }

  // ── Top 3 for today ──────────────────────────────────────────────────────────
  const top3Key = `sa_top3_${todayKey}`;
  const [top3, setTop3] = useState<{ text: string; done: boolean }[]>(() => ls(top3Key, []));
  const [newTop3, setNewTop3] = useState("");
  useEffect(() => { lsSet(top3Key, top3); }, [top3, top3Key]);

  function addTop3() {
    if (!newTop3.trim() || top3.length >= 3) return;
    setTop3(prev => [...prev, { text: newTop3.trim(), done: false }]);
    setNewTop3("");
  }

  // ── Weekly goals ─────────────────────────────────────────────────────────────
  const goalsKey = `sa_goals_${weekKey}`;
  interface Goal { text: string; done: boolean; pillar: string; }
  const [goals, setGoals] = useState<Goal[]>(() => ls(goalsKey, [
    { text: "", done: false, pillar: "consulting" },
    { text: "", done: false, pillar: "oravini" },
    { text: "", done: false, pillar: "content" },
  ]));
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [goalDraft, setGoalDraft] = useState("");
  useEffect(() => { lsSet(goalsKey, goals); }, [goals, goalsKey]);

  // ── Revenue / leads snapshot ──────────────────────────────────────────────────
  const revenueKey = `sa_revenue_${weekKey}`;
  interface Revenue { leads: number; calls: number; closed: number; revenue: string; }
  const [rev, setRev] = useState<Revenue>(() => ls(revenueKey, { leads: 0, calls: 0, closed: 0, revenue: "" }));
  const [editingRev, setEditingRev] = useState(false);
  const [revDraft, setRevDraft] = useState<Revenue>({ leads: 0, calls: 0, closed: 0, revenue: "" });
  useEffect(() => { lsSet(revenueKey, rev); }, [rev, revenueKey]);

  // ── Content streak + weekly tracker ──────────────────────────────────────────
  const contentKey = `sa_content_${todayKey}`;
  const [contentDone, setContentDone] = useState<boolean>(() => ls(contentKey, false));
  useEffect(() => { lsSet(contentKey, contentDone); }, [contentDone, contentKey]);

  function getWeekContentDays() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - ((now.getDay() + 6) % 7) + i);
      const key = `sa_content_${toKey(d)}`;
      return { day: DAY_NAMES[(i + 1) % 7] || DAY_NAMES[i], date: toKey(d), done: ls(key, false) as boolean };
    });
  }
  const weekContent = getWeekContentDays();
  const streak = (() => {
    let count = 0;
    const d = new Date(now);
    while (true) {
      const k = `sa_content_${toKey(d)}`;
      if (!ls(k, false)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  // ── Brain dump ───────────────────────────────────────────────────────────────
  const brainKey = `sa_brain_${todayKey}`;
  const [brain, setBrain] = useState<string>(() => ls(brainKey, ""));
  useEffect(() => { lsSet(brainKey, brain); }, [brain, brainKey]);

  // ── Week's wins ──────────────────────────────────────────────────────────────
  const winsKey = `sa_wins_${weekKey}`;
  const [wins, setWins] = useState<string[]>(() => ls(winsKey, []));
  const [newWin, setNewWin] = useState("");
  useEffect(() => { lsSet(winsKey, wins); }, [wins, winsKey]);

  // ── Pomodoro ─────────────────────────────────────────────────────────────────
  const MODES = [
    { label: "25 min", seconds: 25 * 60 },
    { label: "50 min", seconds: 50 * 60 },
    { label: "5 min break", seconds: 5 * 60 },
  ];
  const [pomMode, setPomMode] = useState(0);
  const [pomLeft, setPomLeft] = useState(MODES[0].seconds);
  const [pomRunning, setPomRunning] = useState(false);
  const pomRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pomRunning) {
      pomRef.current = setInterval(() => {
        setPomLeft(prev => {
          if (prev <= 1) { setPomRunning(false); clearInterval(pomRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(pomRef.current!);
    }
    return () => clearInterval(pomRef.current!);
  }, [pomRunning]);

  function pomReset() { setPomRunning(false); setPomLeft(MODES[pomMode].seconds); }
  function pomSwitch(i: number) { setPomMode(i); setPomRunning(false); setPomLeft(MODES[i].seconds); }

  function fmtPom(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const pomPct = (pomLeft / MODES[pomMode].seconds) * 100;

  const PILLAR_COLORS: Record<string, string> = { consulting: "#3b82f6", oravini: GOLD, content: "#a855f7" };
  const PILLAR_LABELS: Record<string, string> = { consulting: "Consulting", oravini: "Oravini", content: "Content" };

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Live Header ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border relative overflow-hidden" style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}06` }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: cfg.color, transform: "translate(35%,-35%)" }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-[0.03]" style={{ background: cfg.color, transform: "translate(-30%,30%)" }} />
          </div>

          <div className="px-8 pt-8 pb-6 relative">
            {/* Date + clock row */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-medium text-muted-foreground tracking-wide">
                {FULL_DAYS[dow]}, {MONTHS[now.getMonth()]} {now.getDate()}
              </p>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums" style={{ color: cfg.color }}>{fmtTime(now)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}
                </p>
              </div>
            </div>

            {/* Big day label */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}20` }}>
                <Icon className="w-5 h-5" style={{ color: cfg.color }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>

            <h1 className="text-5xl font-black tracking-tight leading-none text-foreground mb-3">
              {dayType === "management" ? "Run The Machine." : dayType === "founder" ? "Build The Machine." : "Reflect & Recharge."}
            </h1>

            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              {cfg.description}
            </p>

            {/* Focus pill */}
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              <Icon className="w-4 h-4" />
              Today's focus: {cfg.sub}
            </div>
          </div>
        </div>

        {/* ── Non-Negotiables ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Daily Non-Negotiables — Every Day, No Exceptions</p>
          <div className="space-y-2">
            {NON_NEGOTIABLES.map((n, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border">
                <span className="text-base">{n.icon}</span>
                <span className="text-sm font-medium text-foreground">{n.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top 3 for today ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Top 3 for Today" sub="The 3 things that MUST happen today. Nothing else matters until these are done." />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {[0, 1, 2].map(i => {
              const item = top3[i];
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border border-border" style={{ color: GOLD, borderColor: `${GOLD}40` }}>
                    {i + 1}
                  </div>
                  {item ? (
                    <>
                      <Checkbox checked={item.done} onCheckedChange={() => setTop3(prev => prev.map((t, j) => j === i ? { ...t, done: !t.done } : t))} />
                      <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</span>
                      <button onClick={() => setTop3(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground/40 italic">
                      {i === 0 ? "Most important task..." : i === 1 ? "Second priority..." : "Third priority..."}
                    </span>
                  )}
                </div>
              );
            })}
            {top3.length < 3 && (
              <div className="flex gap-2 pt-1 border-t border-border">
                <Input value={newTop3} onChange={e => setNewTop3(e.target.value)} placeholder="Add a top priority..." className="h-8 text-sm" onKeyDown={e => e.key === "Enter" && addTop3()} />
                <Button size="sm" onClick={addTop3} className="h-8 px-3"><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Today's Schedule ────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Today's Schedule" />
          <div className="space-y-2">
            <PeriodBlock period={cfg.morning} defaultOpen={currentPeriod === 0} />
            <PeriodBlock period={cfg.afternoon} defaultOpen={currentPeriod === 1} />
            <PeriodBlock period={cfg.evening} defaultOpen={currentPeriod === 2} />
          </div>
        </div>

        {/* ── Rules ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">✔ Do today</p>
            <div className="space-y-1.5">{cfg.allowed.map((r, i) => <p key={i} className="text-xs text-foreground">{r}</p>)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">❌ Avoid today</p>
            <div className="space-y-1.5">{cfg.blocked.map((r, i) => <p key={i} className="text-xs text-foreground">{r}</p>)}</div>
          </div>
        </div>

        {/* ── Pomodoro ────────────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Focus Timer" sub="Use for deep work blocks on Founder Days or client prep on Management Days." />
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-center gap-2 mb-5">
              {MODES.map((m, i) => (
                <button key={i} onClick={() => pomSwitch(i)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                  style={pomMode === i ? { background: GOLD, color: "#0a0910", borderColor: GOLD } : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={cfg.color} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - pomPct / 100)}`}
                    strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums text-foreground">{fmtPom(pomLeft)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPomRunning(v => !v)} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ background: GOLD, color: "#0a0910" }}>
                  {pomRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {pomRunning ? "Pause" : pomLeft === MODES[pomMode].seconds ? "Start" : "Resume"}
                </button>
                <button onClick={pomReset} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content streak + weekly tracker ─────────────────────────────── */}
        <div>
          <SectionHeader title="Content Tracker" sub="Record minimum 1 reel every single day." />
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5" style={{ color: streak > 0 ? "#f97316" : "var(--muted-foreground)" }} />
                <span className="text-2xl font-bold text-foreground">{streak}</span>
                <span className="text-sm text-muted-foreground">day streak</span>
              </div>
              <button
                onClick={() => setContentDone(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
                style={contentDone
                  ? { background: "#22c55e22", borderColor: "#22c55e", color: "#22c55e" }
                  : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                {contentDone ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {contentDone ? "Recorded today ✓" : "Not recorded yet"}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekContent.map((d, i) => (
                <div key={i} className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">{d.day}</p>
                  <div className="w-full aspect-square rounded-lg flex items-center justify-center text-xs"
                    style={{ background: d.done ? "#22c55e22" : "var(--background)", border: d.date === todayKey ? "1.5px solid #22c55e" : "1px solid var(--border)" }}>
                    {d.done ? <Check className="w-3 h-3 text-green-400" /> : <span className="text-muted-foreground/30 text-[10px]">–</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Revenue / Leads Snapshot ─────────────────────────────────────── */}
        <div>
          <SectionHeader title="This Week's Numbers" sub="Update these as the week progresses." />
          <div className="rounded-xl border border-border bg-card p-4">
            {editingRev ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {(["leads","calls","closed"] as (keyof Revenue)[]).map(k => (
                    <div key={k} className="space-y-1">
                      <p className="text-xs text-muted-foreground capitalize">{k === "closed" ? "Deals closed" : k === "calls" ? "Calls booked" : "Leads this week"}</p>
                      <Input type="number" min={0} value={revDraft[k] as number} onChange={e => setRevDraft(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Revenue (₹ or $)</p>
                    <Input value={revDraft.revenue} onChange={e => setRevDraft(p => ({ ...p, revenue: e.target.value }))} className="h-8 text-sm" placeholder="e.g. ₹50,000" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setRev(revDraft); setEditingRev(false); }} className="flex-1">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingRev(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {[
                    { label: "Leads", value: rev.leads, icon: Target, color: "#3b82f6" },
                    { label: "Calls", value: rev.calls, icon: TrendingUp, color: GOLD },
                    { label: "Closed", value: rev.closed, icon: Trophy, color: "#22c55e" },
                    { label: "Revenue", value: rev.revenue || "—", icon: TrendingUp, color: "#a855f7" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-lg bg-background border border-border p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setRevDraft(rev); setEditingRev(true); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Update numbers
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Weekly Goals ────────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Weekly Goals" sub={`Week of ${toWeekKey(now)} — one goal per pillar`} />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {goals.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PILLAR_COLORS[g.pillar] }} />
                <span className="text-xs font-semibold flex-shrink-0 w-20" style={{ color: PILLAR_COLORS[g.pillar] }}>{PILLAR_LABELS[g.pillar]}</span>
                {editingGoal === i ? (
                  <div className="flex gap-2 flex-1">
                    <Input value={goalDraft} onChange={e => setGoalDraft(e.target.value)} className="h-7 text-sm flex-1" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") { setGoals(prev => prev.map((x, j) => j === i ? { ...x, text: goalDraft } : x)); setEditingGoal(null); } if (e.key === "Escape") setEditingGoal(null); }} />
                    <button onClick={() => { setGoals(prev => prev.map((x, j) => j === i ? { ...x, text: goalDraft } : x)); setEditingGoal(null); }} className="text-green-400"><Check className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <Checkbox checked={g.done} onCheckedChange={() => setGoals(prev => prev.map((x, j) => j === i ? { ...x, done: !x.done } : x))} />
                    <span className={`flex-1 text-sm cursor-pointer ${g.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                      onClick={() => { setGoalDraft(g.text); setEditingGoal(i); }}>
                      {g.text || <span className="text-muted-foreground/40 italic">Click to set goal...</span>}
                    </span>
                    <button onClick={() => { setGoalDraft(g.text); setEditingGoal(i); }} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Week's Wins ─────────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="This Week's Wins" sub="Log wins as they happen. Feeds into Saturday's Founder Review." />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {wins.length === 0 && <p className="text-xs text-muted-foreground italic">No wins logged yet. Add your first one.</p>}
            {wins.map((w, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <Trophy className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <span className="text-sm text-foreground flex-1">{w}</span>
                <button onClick={() => setWins(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 border-t border-border pt-3">
              <Input value={newWin} onChange={e => setNewWin(e.target.value)} placeholder="Log a win..." className="h-8 text-sm" onKeyDown={e => { if (e.key === "Enter" && newWin.trim()) { setWins(p => [...p, newWin.trim()]); setNewWin(""); } }} />
              <Button size="sm" onClick={() => { if (newWin.trim()) { setWins(p => [...p, newWin.trim()]); setNewWin(""); } }} className="h-8 px-3"><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>

        {/* ── Brain Dump ──────────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Brain Dump" sub="Today's scratchpad. Resets each day. Get it out of your head." />
          <Textarea value={brain} onChange={e => setBrain(e.target.value)} placeholder="Anything on your mind — ideas, things to do, things to remember, random thoughts..." className="min-h-[120px] text-sm resize-none" />
        </div>

        {/* ── Saturday Founder Review ──────────────────────────────────────── */}
        {isSaturday && (
          <div className="rounded-xl border p-4" style={{ borderColor: `${GOLD}40`, background: `${GOLD}08` }}>
            <button onClick={() => setShowReview(v => !v)} className="w-full flex items-center gap-2">
              <Star className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
              <p className="text-sm font-bold flex-1 text-left" style={{ color: GOLD }}>Saturday Ritual — Weekly Founder Review</p>
              {showReview ? <ChevronUp className="w-4 h-4" style={{ color: GOLD }} /> : <ChevronDown className="w-4 h-4" style={{ color: GOLD }} />}
            </button>
            {showReview && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">Answer these 5 questions every Saturday night. Every big founder does this.</p>
                {WEEKLY_REVIEW_QUESTIONS.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: GOLD }}>0{i + 1}</span>
                    <p className="text-sm text-foreground">{q}</p>
                  </div>
                ))}
                {wins.length > 0 && (
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">This week's logged wins:</p>
                    {wins.map((w, i) => <p key={i} className="text-xs text-foreground flex items-center gap-1.5"><Trophy className="w-3 h-3" style={{ color: GOLD }} />{w}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Weekly OS Strip ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Your Week at a Glance" />
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((name, i) => {
              const type = DAY_MAP[i];
              const isToday = i === dow;
              const color = DAY_CONFIG[type].color;
              const label = type === "management" ? "Mgmt" : type === "founder" ? "Fnd" : "Light";
              return (
                <div key={i} className="rounded-xl p-2.5 text-center transition-all"
                  style={{ background: isToday ? `${color}22` : "var(--card)", border: isToday ? `1.5px solid ${color}` : "1px solid var(--border)" }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: isToday ? color : "var(--muted-foreground)" }}>{name}</p>
                  <p className="text-[9px] leading-tight" style={{ color: isToday ? color : "var(--muted-foreground)", opacity: isToday ? 1 : 0.7 }}>{label}</p>
                  {isToday && <div className="w-1 h-1 rounded-full mx-auto mt-1.5" style={{ background: color }} />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2">
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#3b82f6" }} />Management — Mon/Wed/Fri</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: GOLD }} />Founder — Tue/Thu/Sat</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#22c55e" }} />Light — Sun</span>
          </div>
        </div>

        {/* ── Philosophy ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The Philosophy</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs font-bold text-blue-400 mb-1">Management Days = Cash Flow</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Maintain clients, revenue, relationships. You keep the machine running.</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs font-bold mb-1" style={{ color: GOLD }}>Founder Days = Growth</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Build Oravini, systems, leverage, scale. You build the machine.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border-l-2 bg-background" style={{ borderColor: GOLD }}>
            <p className="text-xs text-muted-foreground leading-relaxed italic">"If you spend all week in management mode, you build a job. If you protect founder time, you build a machine."</p>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
}
