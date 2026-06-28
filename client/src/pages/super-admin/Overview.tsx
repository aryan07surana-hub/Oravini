import SuperAdminLayout from "./Layout";
import { useEffect, useState } from "react";
import {
  Zap, Building2, Video, Sun, CheckCircle2,
  Coffee, Sunset, Moon, ChevronDown, ChevronUp, Star
} from "lucide-react";

const GOLD = "#d4b461";

// ── Day system ────────────────────────────────────────────────────────────────
type DayType = "management" | "founder" | "light";

const DAY_MAP: Record<number, DayType> = {
  0: "light",       // Sunday
  1: "management",  // Monday
  2: "founder",     // Tuesday
  3: "management",  // Wednesday
  4: "founder",     // Thursday
  5: "management",  // Friday
  6: "founder",     // Saturday
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Content ───────────────────────────────────────────────────────────────────
const DAY_CONFIG = {
  management: {
    label: "Management Day",
    sub: "Run the machine",
    color: "#3b82f6",
    icon: Building2,
    description: "Maintain revenue, client delivery, and sales. Reactive day — interact with people. End the day by recording content from what happened.",
    morning: {
      title: "Morning — High Energy",
      emoji: "☀️",
      items: [
        { text: "Sales calls — prioritise booked leads first", tag: "consulting" },
        { text: "Lead follow-ups + DM outreach", tag: "outreach" },
        { text: "Client communication — calls, WhatsApp, updates", tag: "consulting" },
        { text: "Close open deals", tag: "consulting" },
      ],
    },
    afternoon: {
      title: "Afternoon — Delivery",
      emoji: "🌤️",
      items: [
        { text: "Client delivery — strategy, reviews, feedback loops", tag: "consulting" },
        { text: "Check funnels + lead flow + metrics", tag: "ops" },
        { text: "Fix any bottlenecks", tag: "ops" },
        { text: "Review team work / delegate", tag: "ops" },
      ],
    },
    evening: {
      title: "Evening — Learn + Create",
      emoji: "🌙",
      items: [
        { text: "Record content — use today's call moments as fuel (min 1 reel)", tag: "content" },
        { text: "Review a sales call — improve scripts", tag: "skill" },
        { text: "Study persuasion / messaging", tag: "skill" },
        { text: "Outreach — DMs before sleep", tag: "outreach" },
      ],
    },
    allowed: ["Calls", "WhatsApp / Slack", "Sales conversations", "Content recording", "Outreach"],
    blocked: ["Deep system building", "Big strategy rabbit holes", "Oravini feature work"],
  },
  founder: {
    label: "Founder Day",
    sub: "Build the machine",
    color: GOLD,
    icon: Zap,
    description: "Increase leverage and scale. Deep thinking and building day — no reactive work. Build Oravini, create systems, record thought leadership content.",
    morning: {
      title: "Morning — Deep Work",
      emoji: "☀️",
      items: [
        { text: "Oravini — build features, fix bugs, ship improvements", tag: "oravini" },
        { text: "Business strategy — how to get more clients", tag: "strategy" },
        { text: "Offer improvement + market positioning", tag: "strategy" },
        { text: "Market research + competitor funnels", tag: "research" },
      ],
    },
    afternoon: {
      title: "Afternoon — Systems",
      emoji: "🌤️",
      items: [
        { text: "Oravini — automation, AI tools, CRM systems", tag: "oravini" },
        { text: "Lead generation system building", tag: "systems" },
        { text: "Funnel / VSL / SOP creation", tag: "systems" },
        { text: "Zapier / Make automations", tag: "systems" },
      ],
    },
    evening: {
      title: "Evening — Content + Growth",
      emoji: "🌙",
      items: [
        { text: "Record content — thought leadership, Oravini demos, founder journey (min 1 reel)", tag: "content" },
        { text: "Outreach — DMs before sleep", tag: "outreach" },
        { text: "Study business models + watch breakdowns", tag: "skill" },
        ...(new Date().getDay() === 6
          ? [{ text: "Weekly Founder Review (Saturday ritual — see below)", tag: "review" }]
          : []),
      ],
    },
    allowed: ["Deep work", "Oravini building", "Strategy thinking", "System building", "Content recording", "Outreach"],
    blocked: ["Client calls", "Reactive client chats", "Slack rabbit holes"],
  },
  light: {
    label: "Light Day",
    sub: "Reflect & recharge",
    color: "#22c55e",
    icon: Sun,
    description: "Sunday is low pressure — but not zero. Review, plan, and set the week up to win. You can record content if energy is there.",
    morning: {
      title: "Morning — Reflection",
      emoji: "☀️",
      items: [
        { text: "Review the full week — Consulting, Oravini, Content", tag: "review" },
        { text: "What generated revenue? What wasted time?", tag: "review" },
        { text: "What content performed best?", tag: "review" },
        { text: "Light reading from your library", tag: "learning" },
      ],
    },
    afternoon: {
      title: "Afternoon — Planning",
      emoji: "🌤️",
      items: [
        { text: "Plan next week — set Management Day priorities", tag: "planning" },
        { text: "Set Oravini build goals for Founder Days", tag: "planning" },
        { text: "Plan content ideas for the week", tag: "content" },
        { text: "Optional: batch content recording", tag: "content" },
      ],
    },
    evening: {
      title: "Evening — Reset",
      emoji: "🌙",
      items: [
        { text: "Outreach — even Sunday, even just 5 DMs", tag: "outreach" },
        { text: "Optional sales calls if high-intent leads are waiting", tag: "consulting" },
        { text: "Strategic thinking — where is the business in 90 days?", tag: "strategy" },
        { text: "Early night — Monday is a Management Day, show up charged", tag: "recovery" },
      ],
    },
    allowed: ["Light reading", "Week review", "Planning", "Optional sales calls", "Optional content"],
    blocked: ["Heavy Oravini building", "Stressful reactive work"],
  },
};

const WEEKLY_REVIEW_QUESTIONS = [
  "What generated revenue this week?",
  "What wasted time — what should I cut?",
  "What should I build next in Oravini?",
  "What content performed best?",
  "Where is the bottleneck right now?",
];

const NON_NEGOTIABLES = [
  { icon: "📣", text: "Outreach — every single day, no exceptions" },
  { icon: "🎥", text: "Record minimum 1 piece of content daily (Reels first)" },
  { icon: "📊", text: "Check numbers — revenue, leads, metrics, every day" },
];

const TAG_COLORS: Record<string, string> = {
  consulting: "#3b82f6",
  oravini: GOLD,
  content: "#a855f7",
  outreach: "#f97316",
  ops: "#06b6d4",
  skill: "#22c55e",
  strategy: GOLD,
  research: "#ec4899",
  systems: "#06b6d4",
  review: "#ef4444",
  learning: "#22c55e",
  planning: "#3b82f6",
  recovery: "#6b7280",
};

function PeriodBlock({ period, defaultOpen = false }: { period: { title: string; emoji: string; items: { text: string; tag: string }[] }; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
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

  function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  }

  // determine current period
  const hour = now.getHours();
  const currentPeriod = hour < 12 ? 0 : hour < 17 ? 1 : 2;

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Live Header ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border p-6 relative overflow-hidden" style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}08` }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5" style={{ background: cfg.color, transform: "translate(30%, -30%)" }} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${cfg.color}22` }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{FULL_DAYS[dow]}, {MONTHS[now.getMonth()]} {now.getDate()}</h1>
              <p className="text-muted-foreground text-sm mt-1">{cfg.sub}</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md leading-relaxed">{cfg.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold tabular-nums" style={{ color: cfg.color }}>{fmtTime(now)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hour < 12 ? "Morning session" : hour < 17 ? "Afternoon session" : "Evening session"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Daily Non-Negotiables ────────────────────────────────────────── */}
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

        {/* ── Today's Schedule ────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Today's Schedule</p>
          <PeriodBlock period={cfg.morning} defaultOpen={currentPeriod === 0} />
          <PeriodBlock period={cfg.afternoon} defaultOpen={currentPeriod === 1} />
          <PeriodBlock period={cfg.evening} defaultOpen={currentPeriod === 2} />
        </div>

        {/* ── Rules ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">✔ Do today</p>
            <div className="space-y-1.5">
              {cfg.allowed.map((r, i) => <p key={i} className="text-xs text-foreground">{r}</p>)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">❌ Avoid today</p>
            <div className="space-y-1.5">
              {cfg.blocked.map((r, i) => <p key={i} className="text-xs text-foreground">{r}</p>)}
            </div>
          </div>
        </div>

        {/* ── Weekly Founder Review (Saturday only) ───────────────────────── */}
        {isSaturday && (
          <div className="rounded-xl border p-4" style={{ borderColor: `${GOLD}40`, background: `${GOLD}08` }}>
            <button onClick={() => setShowReview((v) => !v)} className="w-full flex items-center gap-2">
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
              </div>
            )}
          </div>
        )}

        {/* ── Weekly OS Strip ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Week at a Glance</p>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((name, i) => {
              const type = DAY_MAP[i];
              const isToday = i === dow;
              const color = DAY_CONFIG[type].color;
              const label = type === "management" ? "Mgmt" : type === "founder" ? "Fnd" : "Light";
              return (
                <div
                  key={i}
                  className="rounded-xl p-2.5 text-center transition-all"
                  style={{
                    background: isToday ? `${color}22` : "var(--card)",
                    border: isToday ? `1.5px solid ${color}` : "1px solid var(--border)",
                  }}
                >
                  <p className="text-[10px] font-bold mb-1" style={{ color: isToday ? color : "var(--muted-foreground)" }}>{name}</p>
                  <p className="text-[9px] leading-tight" style={{ color: isToday ? color : "var(--muted-foreground)", opacity: isToday ? 1 : 0.7 }}>{label}</p>
                  {isToday && <div className="w-1 h-1 rounded-full mx-auto mt-1.5" style={{ background: color }} />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#3b82f6" }} />Management — Mon/Wed/Fri</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: GOLD }} />Founder — Tue/Thu/Sat</span>
            <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#22c55e" }} />Light — Sun</span>
          </div>
        </div>

        {/* ── The Philosophy ──────────────────────────────────────────────── */}
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
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              "If you spend all week in management mode, you build a job. If you protect founder time, you build a machine."
            </p>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
}
