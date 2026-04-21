import ClientLayout from "@/components/layout/ClientLayout";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/hooks/use-auth";
import { useSurvey } from "@/hooks/use-survey";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bell, CheckCircle2, Circle, FileText, MessageSquare, Calendar,
  TrendingUp, Clock, ArrowRight, AlertCircle, CalendarPlus, Target, Eye,
  Instagram, Youtube, Users, DollarSign, Globe, Quote, BookOpen, Lock,
  Trash2, Check, Sparkles, RefreshCw, ChevronRight, Zap, BarChart2,
  Lightbulb, Music2, Bot, Clapperboard, Map, Flame, Activity, Brain,
  Palette, ScanSearch, Layers, ImagePlay, Wand2, Mic2, Star, TrendingDown,
  Megaphone, Rocket, Crown, Hash, Coffee, MonitorPlay, Gift, Copy, Link2, MousePointerClick, UserCheck
} from "lucide-react";
import { TourButton } from "@/components/ui/TourGuide";
import { format, isAfter } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";

const GOLD = "#d4b461";

const QUOTES = [
  "Success is not the key to happiness. Happiness is the key to success.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Success usually comes to those who are too busy to be looking for it.",
  "Dreams don't work unless you do.",
  "The only way to do great work is to love what you do.",
  "It always seems impossible until it's done.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The key to success is to focus on goals, not obstacles.",
  "Believe you can and you're halfway there.",
  "Act as if what you do makes a difference. It does.",
  "What you get by achieving your goals is not as important as what you become.",
  "You don't have to be great to start, but you have to start to be great.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Little things make big days.",
  "It's going to be hard, but hard is not impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key is to keep company only with people who uplift you.",
  "Change your thoughts and you change your world.",
  "Either you run the day or the day runs you.",
  "A year from now you may wish you had started today.",
  "Never give up on a dream just because of the time it will take to accomplish it.",
  "Opportunities don't happen, you create them.",
  "The road to success and the road to failure are almost exactly the same.",
];

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

const TOOL_LABELS: Record<string, string> = {
  ai_ideas: "Content Ideas",
  ai_coach: "AI Coach",
  carousel: "Carousel Studio",
  competitor: "Competitor Study",
  ai_report: "AI Report",
  video: "Video Editor",
  niche: "Niche Analyser",
  audience: "Audience Map",
};

/* ─────────────────────────────────────────────
   QUICK TOOLS CONFIG
───────────────────────────────────────────── */
const ALL_QUICK_TOOLS = [
  { href: "/ai-ideas",         label: "Content Ideas",    desc: "AI-generated hooks & scripts",     icon: Sparkles,    gradient: "from-[#d4b461]/20 to-[#d4b461]/5",   iconBg: "bg-[#d4b461]/15",    iconColor: "#d4b461",  struggles: ["Coming up with content ideas", "Knowing what content to create"] },
  { href: "/ai-coach",         label: "AI Coach",         desc: "Personalised content coaching",    icon: Bot,         gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/15",  iconColor: "#34d399",  struggles: ["Building confidence on camera", "Staying consistent"] },
  { href: "/video-editor",     label: "Video Editor",     desc: "Edit & enhance your videos",       icon: Clapperboard, gradient: "from-violet-500/20 to-violet-500/5", iconBg: "bg-violet-500/15",  iconColor: "#a78bfa",  struggles: ["Editing and production quality"] },
  { href: "/competitor-study", label: "Competitor Study", desc: "Deep-dive competitor analysis",    icon: ScanSearch,  gradient: "from-blue-500/20 to-blue-500/5",     iconBg: "bg-blue-500/15",     iconColor: "#60a5fa",  struggles: ["Growing my followers", "Standing out in a crowded niche"] },
  { href: "/carousel-studio",  label: "Carousel Studio",  desc: "Design scroll-stopping carousels", icon: ImagePlay,   gradient: "from-pink-500/20 to-pink-500/5",      iconBg: "bg-pink-500/15",     iconColor: "#f472b6",  struggles: ["Low engagement on posts"] },
  { href: "/virality-tester",  label: "Virality Tester",  desc: "Score your content before posting", icon: Wand2,       gradient: "from-orange-500/20 to-orange-500/5",  iconBg: "bg-orange-500/15",   iconColor: "#fb923c",  struggles: ["Getting views / reach", "Low engagement on posts"] },
];

function getQuickTools(struggles: string[]) {
  if (!struggles.length) return ALL_QUICK_TOOLS;
  const prioritised = ALL_QUICK_TOOLS.filter(t => t.struggles.some(s => struggles.includes(s)));
  const rest = ALL_QUICK_TOOLS.filter(t => !prioritised.includes(t));
  return [...prioritised, ...rest].slice(0, 6);
}

/* ─────────────────────────────────────────────
   CONTENT MASTERY MODULE (kept as-is)
───────────────────────────────────────────── */
const LESSONS = [
  {
    id: "content-triad",
    title: "The Content Triad",
    subtitle: "Views → Connection → Trust",
    emoji: "🔥",
    duration: "8 min read",
    tag: "Foundation",
    tagColor: "#d4b461",
    sections: [
      {
        heading: "🔥 The Content Triad",
        subheading: "Every piece of content you create should fall into one of these 3 buckets.",
        blocks: [
          {
            icon: "👁️", title: "1. Views (Attention)", goal: "Stop the scroll",
            desc: "This is what gets people in.",
            items: ["Transformation videos", "Day-in-the-life content", "Rapid-fire edits", "Reaction videos", "Trend-based clips"],
            color: "#f97316",
          },
          {
            icon: "❤️", title: "2. Connection (Relatability)", goal: "Make them feel understood",
            desc: "This is what makes people stay.",
            items: ["B-roll storytelling", "Raw talking head videos", "Podcast-style clips", "Voiceover + visuals", "Personal experiences"],
            color: "#a78bfa",
          },
          {
            icon: "🏆", title: "3. Trust (Authority)", goal: "Make them believe you can help them",
            desc: "This is what makes people buy.",
            items: ["Educational (green screen) content", "Coaching call breakdowns", "Live work sessions", "Case studies", "Proof-based content"],
            color: "#34d399",
          },
        ],
      },
      {
        heading: "⚡ Content → Business Pipeline",
        subheading: null,
        pipeline: ["Content → gets you views", "Story → builds connection", "Value → builds trust", "CTA → generates leads", "DMs → convert to sales"],
      },
      {
        heading: "🎯 Format Breakdown",
        subheading: "What each type does",
        formats: [
          {
            label: "👁️ Views Formats", color: "#f97316",
            items: [
              { name: "Transformation content", note: "humans are wired to follow progress" },
              { name: "Reaction videos", note: "fast dopamine" },
              { name: "Rapid-fire edits", note: "high retention" },
            ],
            warning: "⚠️ Problem: High views, low conversion if not structured properly",
          },
          {
            label: "❤️ Connection Formats", color: "#a78bfa",
            items: [
              { name: "Raw talking head (unscripted)", note: null },
              { name: "B-roll + storytelling", note: null },
              { name: "Podcast clips", note: null },
            ],
            note: "👉 These build emotional attachment",
          },
          {
            label: "🏆 Trust Formats", color: "#34d399",
            items: [
              { name: "Educational breakdowns", note: null },
              { name: "Coaching call breakdowns", note: null },
              { name: "Live execution videos", note: null },
            ],
            note: "👉 These build authority and credibility",
          },
        ],
      },
      {
        heading: "🧠 Raw Talking Head Truth",
        subheading: null,
        truth: {
          points: ["Build deep trust", "Feel authentic", "But don't go viral easily at the start"],
          recommendation: "Only double down on this after you've built consistency (roughly 6–24 months of posting)",
        },
      },
      {
        heading: "🏆 Content Tier List",
        subheading: null,
        tiers: [
          { tier: "S-Tier", label: "Best",    color: "#d4b461", items: ["Parables / storytelling frameworks", '"Gun to the head" bold opinion content'] },
          { tier: "A-Tier", label: "Great",   color: "#34d399", items: ["Myth-busting", "Case studies", "History-style breakdowns", '"Find the mistake" / analysis content'] },
          { tier: "B-Tier", label: "Good",    color: "#60a5fa", items: ["Explanations", "Educational breakdowns"] },
          { tier: "C-Tier", label: "Average", color: "#a78bfa", items: ["Basic talking head"] },
          { tier: "D-Tier", label: "Weak",    color: "#71717a", items: ["Trivia / low-depth content"] },
        ],
      },
      {
        heading: "💰 Revenue Mindset Shift",
        subheading: null,
        revenue: [
          { icon: "❌", label: "Keeps you at $0/month",   color: "#f87171", items: ["Chasing views", "Posting randomly", "Taking random actions", 'Being "busy"'] },
          { icon: "✅", label: "Gets you to $10K/month",  color: "#34d399", items: ["Building proof", "Figuring out what works", "Consistency", "Being intentional"] },
          { icon: "🚀", label: "Gets you to $30K+/month", color: "#d4b461", items: ["Building authority", "Understanding outliers", "Leveraging systems", "Scaling what already works"] },
        ],
      },
      {
        heading: "🎬 Final Framework",
        subheading: null,
        finale: [
          { icon: "📲", text: "Scroll-stopping hook" },
          { icon: "🧠", text: "Deliver insight fast" },
          { icon: "🎯", text: "Clear CTA every time" },
        ],
        warnings: [
          { label: "No strategy →", result: "random results", bad: true },
          { label: "Content Triad →", result: "compound growth", bad: false },
        ],
      },
    ],
  },
];

function ContentMasteryModule() {
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const lesson = LESSONS.find(l => l.id === openLesson);

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD }}>Content Mastery</p>
            <h2 className="text-base font-bold text-foreground mt-0.5">Creator Education Hub</h2>
          </div>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">{LESSONS.length} module{LESSONS.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LESSONS.map(lesson => (
            <div
              key={lesson.id}
              data-testid={`lesson-card-${lesson.id}`}
              className="group p-4 rounded-2xl border border-zinc-800 hover:border-primary/30 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all cursor-pointer"
              onClick={() => setOpenLesson(lesson.id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.2)" }}>
                  {lesson.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="text-[9px] px-1.5 h-4 border-0" style={{ background: `${lesson.tagColor}20`, color: lesson.tagColor }}>{lesson.tag}</Badge>
                    <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{lesson.duration}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{lesson.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{lesson.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {lesson && (
        <Dialog open={!!openLesson} onOpenChange={v => !v && setOpenLesson(null)}>
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lesson.emoji}</span>
                <div>
                  <DialogTitle className="text-lg font-bold">{lesson.title}</DialogTitle>
                  <p className="text-xs text-zinc-500 mt-0.5">{lesson.subtitle}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              {lesson.sections.map((sec, si) => (
                <div key={si} className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{sec.heading}</h3>
                    {sec.subheading && <p className="text-xs text-zinc-500 mt-1">{sec.subheading}</p>}
                  </div>
                  {"blocks" in sec && sec.blocks && (
                    <div className="space-y-3">
                      {sec.blocks.map((block: any, bi: number) => (
                        <div key={bi} className="rounded-xl p-4" style={{ background: `${block.color}0d`, border: `1px solid ${block.color}22` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{block.icon}</span>
                            <span className="text-sm font-bold text-foreground">{block.title}</span>
                            <Badge className="text-[9px] px-1.5 h-4 border-0 ml-auto" style={{ background: `${block.color}20`, color: block.color }}>{block.goal}</Badge>
                          </div>
                          <p className="text-xs text-zinc-400 mb-2">{block.desc}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {block.items.map((item: string, ii: number) => (
                              <span key={ii} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${block.color}15`, color: block.color }}>{item}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {"pipeline" in sec && sec.pipeline && (
                    <div className="space-y-1.5">
                      {sec.pipeline.map((step: string, pi: number) => (
                        <div key={pi} className="flex items-center gap-3 text-xs text-zinc-300">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "rgba(212,180,97,0.15)", color: GOLD }}>{pi + 1}</div>
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                  {"formats" in sec && sec.formats && (
                    <div className="space-y-3">
                      {sec.formats.map((f: any, fi: number) => (
                        <div key={fi} className="rounded-xl p-3" style={{ background: `${f.color}09`, border: `1px solid ${f.color}18` }}>
                          <p className="text-xs font-bold mb-2" style={{ color: f.color }}>{f.label}</p>
                          <div className="space-y-1 mb-2">
                            {f.items.map((item: any, ii: number) => (
                              <div key={ii} className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: f.color }} />
                                {item.name}{item.note && <span className="text-zinc-600">— {item.note}</span>}
                              </div>
                            ))}
                          </div>
                          {f.warning && <p className="text-[10px] text-amber-500">{f.warning}</p>}
                          {f.note && <p className="text-[10px] text-zinc-500">{f.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {"truth" in sec && sec.truth && (
                    <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="space-y-1">
                        {sec.truth.points.map((pt: string, pi: number) => (
                          <p key={pi} className="text-xs text-zinc-300 flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />{pt}</p>
                        ))}
                      </div>
                      <div className="mt-3 pl-3 border-l-2 border-yellow-500/50">
                        <p className="text-xs font-semibold text-yellow-500 mb-0.5">👉 Recommendation:</p>
                        <p className="text-xs text-zinc-400">{sec.truth.recommendation}</p>
                      </div>
                    </div>
                  )}
                  {"tiers" in sec && sec.tiers && (
                    <div className="space-y-2">
                      {sec.tiers.map((t: any, ti: number) => (
                        <div key={ti} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: `${t.color}0d`, border: `1px solid ${t.color}22` }}>
                          <div className="w-14 shrink-0 text-center">
                            <span className="text-xs font-bold" style={{ color: t.color }}>{t.tier}</span>
                            <p className="text-[9px] text-zinc-600">{t.label}</p>
                          </div>
                          <div className="flex-1">
                            {t.items.map((item: string, ii: number) => (
                              <p key={ii} className="text-xs text-zinc-300 leading-5">{item}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {"revenue" in sec && sec.revenue && (
                    <div className="space-y-3">
                      {sec.revenue.map((r: any, ri: number) => (
                        <div key={ri} className="rounded-xl p-4" style={{ background: `${r.color}0d`, border: `1px solid ${r.color}25` }}>
                          <p className="text-xs font-bold mb-2" style={{ color: r.color }}>{r.icon} {r.label}</p>
                          <ul className="space-y-1">
                            {r.items.map((item: string, ii: number) => (
                              <li key={ii} className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: r.color }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {"finale" in sec && sec.finale && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {sec.finale.map((f: any, fi: number) => (
                          <div key={fi} className="rounded-xl p-3 text-center" style={{ background: "rgba(212,180,97,0.07)", border: "1px solid rgba(212,180,97,0.2)" }}>
                            <span className="text-2xl">{f.icon}</span>
                            <p className="text-xs text-zinc-300 mt-1 font-medium">{f.text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        {sec.warnings.map((w: any, wi: number) => (
                          <div key={wi} className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500">{w.label}</span>
                            <span className="font-bold" style={{ color: w.bad ? "#f87171" : "#34d399" }}>{w.result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="pb-2" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   GOAL DIALOG
───────────────────────────────────────────── */
function GoalDialog({ userId, autoOpen }: { userId: string; autoOpen: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("6");

  useEffect(() => {
    if (autoOpen) {
      const shown = sessionStorage.getItem("goalDialogShown");
      if (!shown) { setOpen(true); sessionStorage.setItem("goalDialogShown", "1"); }
    }
  }, [autoOpen]);

  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/income-goal", { goalAmount: +amount, timeframeMonths: +months, currency: "USD" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/income-goal/${userId}`] });
      toast({ title: "Goal set! Let's make it happen 🎯" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline" data-testid="button-set-goal-trigger">Set Goal</button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-xl">Welcome to Oravini! 🎉</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mt-1">Set your income goal — how much do you want to make in the next 6 months?</p>
        <div className="space-y-4 mt-3">
          <div>
            <label className="text-sm font-medium text-foreground">Target Amount (USD)</label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 100000" className="pl-9" data-testid="input-goal-amount-welcome" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Timeframe (months)</label>
            <Input type="number" value={months} onChange={e => setMonths(e.target.value)} min="1" max="24" className="mt-1" />
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!amount || save.isPending} data-testid="button-save-welcome-goal">
            {save.isPending ? "Saving..." : "Set My Goal"}
          </Button>
          <button onClick={() => setOpen(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">Skip for now</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   INCOME GOAL CARD
───────────────────────────────────────────── */
function IncomeGoalCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("6");

  const { data: goal, isLoading } = useQuery<any>({
    queryKey: [`/api/income-goal/${userId}`],
    enabled: !!userId,
  });

  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/income-goal", { goalAmount: +amount, timeframeMonths: +months, currency: "USD" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/income-goal/${userId}`] });
      toast({ title: "Goal updated!" });
      setEditOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="rounded-2xl border border-zinc-800 p-5 h-full flex flex-col">
      <Skeleton className="h-8 w-24 mb-4" /><Skeleton className="h-6 w-full" />
    </div>
  );

  return (
    <div className="rounded-2xl h-full flex flex-col p-5" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.15)" }}>
          <Target className="w-4.5 h-4.5" style={{ color: GOLD }} />
        </div>
        {goal && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <button className="text-xs text-primary hover:underline" data-testid="button-edit-goal">Edit</button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Update Income Goal</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Target Amount</label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={String(goal.goalAmount)} className="pl-9" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Timeframe (months)</label>
                  <Input type="number" value={months} onChange={e => setMonths(e.target.value)} min="1" max="24" className="mt-1" />
                </div>
                <Button className="w-full" onClick={() => save.mutate()} disabled={!amount || save.isPending} data-testid="button-save-goal">
                  {save.isPending ? "Saving..." : "Update Goal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-end">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Income Goal</p>
        {goal ? (
          <>
            <p className="text-3xl font-bold text-foreground">${Number(goal.goalAmount).toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1">in {goal.timeframeMonths} months</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-foreground">Not set yet</p>
            <p className="text-xs text-zinc-500 mt-1 mb-3">Set a goal to stay focused</p>
            <GoalDialog userId={userId} autoOpen={false} />
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CREATOR SCORE
───────────────────────────────────────────── */
const SCORE_RANKS = [
  { min: 0,   label: "Just Starting",  emoji: "🌱", color: "#71717a",  desc: "Every legend starts somewhere. Let's go!" },
  { min: 50,  label: "Rising Creator", emoji: "🚀", color: "#60a5fa",  desc: "You're building real momentum. Keep pushing." },
  { min: 150, label: "Content Pro",    emoji: "⚡", color: "#a78bfa",  desc: "You're consistent and getting sharper every day." },
  { min: 300, label: "Creator Beast",  emoji: "🔥", color: "#fb923c",  desc: "You operate at a level most creators never reach." },
  { min: 500, label: "Elite Status",   emoji: "👑", color: GOLD,       desc: "You're in the top tier. The platform bends to your will." },
];

function CreatorScore({ streak, monthActions, contentCount }: { streak: number; monthActions: number; contentCount: number }) {
  const score = Math.min(999, streak * 5 + monthActions * 3 + contentCount * 10);
  const rank = [...SCORE_RANKS].reverse().find(r => score >= r.min) || SCORE_RANKS[0];
  const nextRank = SCORE_RANKS[SCORE_RANKS.indexOf(rank) + 1];
  const progress = nextRank ? Math.round(((score - rank.min) / (nextRank.min - rank.min)) * 100) : 100;

  return (
    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${rank.color}12 0%, ${rank.color}05 100%)`, border: `1px solid ${rank.color}30` }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: rank.color, transform: "translate(40%, -40%)" }} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: `${rank.color}18`, border: `1px solid ${rank.color}30` }}>
            {rank.emoji}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Creator Score</p>
            <div className="flex items-end gap-2 mt-0.5">
              <p className="text-4xl font-black text-foreground">{score}</p>
              <p className="text-sm font-bold mb-1" style={{ color: rank.color }}>{rank.label}</p>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{rank.desc}</p>
          </div>
        </div>
        {nextRank && (
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 min-w-[130px]">
            <p className="text-[10px] text-zinc-500">Next: <span className="font-semibold" style={{ color: nextRank.color }}>{nextRank.emoji} {nextRank.label}</span></p>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})` }} />
            </div>
            <p className="text-[10px] text-zinc-600">{nextRank.min - score} pts to go</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MY BIG 3 TODAY
───────────────────────────────────────────── */
const BIG3_KEY = `oravini_big3_${new Date().toISOString().split("T")[0]}`;

function BigThreeToday() {
  const [priorities, setPriorities] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(BIG3_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (!v || priorities.length >= 3) return;
    const next = [...priorities, v];
    setPriorities(next);
    localStorage.setItem(BIG3_KEY, JSON.stringify(next));
    setInput("");
  };

  const remove = (i: number) => {
    const next = priorities.filter((_, idx) => idx !== i);
    setPriorities(next);
    localStorage.setItem(BIG3_KEY, JSON.stringify(next));
  };

  const COLORS = ["#d4b461", "#a78bfa", "#34d399"];
  const LABELS = ["🥇 Top Priority", "🥈 Second Focus", "🥉 Third Action"];

  return (
    <div className="rounded-2xl border border-zinc-800 p-5 h-full" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-foreground">My Big 3 Today</p>
          <p className="text-xs text-zinc-500 mt-0.5">3 things you will do today — no excuses</p>
        </div>
        <Target className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
      </div>

      <div className="space-y-2 mb-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{
              background: priorities[i] ? `${COLORS[i]}0d` : "rgba(255,255,255,0.02)",
              border: `1px solid ${priorities[i] ? `${COLORS[i]}30` : "rgba(255,255,255,0.05)"}`,
            }}
          >
            <span className="text-[10px] font-bold shrink-0" style={{ color: priorities[i] ? COLORS[i] : "rgba(255,255,255,0.15)" }}>{LABELS[i]}</span>
            {priorities[i] ? (
              <>
                <p className="text-xs text-foreground flex-1 truncate">{priorities[i]}</p>
                <button onClick={() => remove(i)} className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3 h-3" /></button>
              </>
            ) : (
              <p className="text-xs text-zinc-600 flex-1">Not set yet…</p>
            )}
          </div>
        ))}
      </div>

      {priorities.length < 3 && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder={`Add priority ${priorities.length + 1}…`}
            className="flex-1 text-xs bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-colors"
            data-testid="input-big3"
          />
          <button
            onClick={add}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-colors"
            style={{ background: "rgba(212,180,97,0.15)", color: GOLD, border: "1px solid rgba(212,180,97,0.3)" }}
            data-testid="button-add-big3"
          >
            Add
          </button>
        </div>
      )}
      {priorities.length === 3 && (
        <p className="text-[10px] text-zinc-600 text-center">Locked in. Now go execute 💪</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONNECTED PLATFORMS
───────────────────────────────────────────── */
function ConnectedPlatforms() {
  const { data: twitter }   = useQuery<any>({ queryKey: ["/api/twitter/status"],  staleTime: 60000 });
  const { data: youtube }   = useQuery<any>({ queryKey: ["/api/youtube/status"],  staleTime: 60000 });
  const { data: linkedin }  = useQuery<any>({ queryKey: ["/api/linkedin/status"], staleTime: 60000 });
  const { data: instagram } = useQuery<any>({ queryKey: ["/api/meta/account"],    staleTime: 60000 });
  const { data: canva }     = useQuery<any>({ queryKey: ["/api/canva/status"],    staleTime: 60000 });

  const platforms = [
    { id: "instagram", label: "Instagram", icon: Instagram,     color: "#f472b6", href: "/instagram-scheduler", connected: instagram?.connected ?? false },
    { id: "youtube",   label: "YouTube",   icon: Youtube,       color: "#f87171", href: "/youtube-scheduler",   connected: youtube?.connected ?? false  },
    { id: "twitter",   label: "Twitter/X", icon: MessageSquare, color: "#60a5fa", href: "/twitter-scheduler",   connected: twitter?.connected ?? false  },
    { id: "linkedin",  label: "LinkedIn",  icon: Users,         color: "#818cf8", href: "/linkedin-scheduler",  connected: linkedin?.connected ?? false  },
    { id: "canva",     label: "Canva",     icon: Palette,       color: "#a78bfa", href: "/video-editor",        connected: canva?.connected ?? false    },
  ];

  const connectedCount = platforms.filter(p => p.connected).length;

  return (
    <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-foreground">Connected Platforms</p>
          <p className="text-xs text-zinc-500 mt-0.5">{connectedCount} of {platforms.length} connected</p>
        </div>
        <div className="flex items-center gap-1.5">
          {[...Array(platforms.length)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i < connectedCount ? GOLD : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {platforms.map(({ id, label, icon: Icon, color, href, connected }) => (
          <Link key={id} href={href}>
            <div
              data-testid={`platform-${id}`}
              title={label}
              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl cursor-pointer transition-all group"
              style={{
                background: connected ? `${color}12` : "rgba(255,255,255,0.02)",
                border: `1px solid ${connected ? `${color}35` : "rgba(255,255,255,0.05)"}`,
                boxShadow: connected ? `0 0 12px ${color}18` : "none",
              }}
            >
              <Icon className="w-5 h-5 transition-all group-hover:scale-110" style={{ color: connected ? color : "rgba(255,255,255,0.2)" }} />
              <p className="text-[9px] font-semibold text-center leading-tight" style={{ color: connected ? color : "rgba(255,255,255,0.25)" }}>{label}</p>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? color : "rgba(255,255,255,0.1)", boxShadow: connected ? `0 0 5px ${color}` : "none" }} />
            </div>
          </Link>
        ))}
      </div>
      {connectedCount < platforms.length && (
        <p className="text-[10px] text-zinc-600 text-center mt-3">Connect more platforms to supercharge your reach →</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMMUNITY PULSE
───────────────────────────────────────────── */
function CommunityPulse() {
  const { data: posts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/community/posts"],
    staleTime: 2 * 60 * 1000,
  });

  const recent = (posts || []).slice(0, 3);

  return (
    <div className="rounded-2xl border border-zinc-800 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-sm font-bold text-foreground">Community Pulse</p>
        </div>
        <Link href="/community" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-zinc-800/60">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-24" />
                <div className="h-2 bg-zinc-800 rounded animate-pulse w-full" />
              </div>
            </div>
          ))
        ) : recent.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">No posts yet — be the first to post!</p>
            <Link href="/community">
              <button className="mt-3 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors" style={{ background: "rgba(212,180,97,0.15)", color: GOLD }}>Start a discussion</button>
            </Link>
          </div>
        ) : (
          recent.map((post: any) => {
            const initials = (post.authorName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            const colors = ["#d4b461", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"];
            const color = colors[(post.authorName || "").charCodeAt(0) % colors.length];
            return (
              <Link key={post.id} href="/community">
                <div className="flex items-start gap-3 px-5 py-3 hover:bg-zinc-800/20 transition-colors cursor-pointer group">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{post.authorName || "Member"}</p>
                      {post.channel && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">#{post.channel}</span>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{post.content}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-600 shrink-0">
                    <Star className="w-2.5 h-2.5" />
                    <span>{post.likes || 0}</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WORLD CLOCK
───────────────────────────────────────────── */
const WORLD_CITIES = [
  { city: "Dubai",    timezone: "Asia/Dubai",        flag: "🇦🇪", color: "#f59e0b" },
  { city: "London",   timezone: "Europe/London",     flag: "🇬🇧", color: "#60a5fa" },
  { city: "New York", timezone: "America/New_York",  flag: "🇺🇸", color: "#34d399" },
];

function CityClockCard({ city, timezone, flag, color }: { city: string; timezone: string; flag: string; color: string }) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      setTime(new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: timezone }).format(new Date()));
      setDate(new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone }).format(new Date()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const hour24 = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(new Date()));
  const isDaytime = hour24 >= 6 && hour24 < 20;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all" style={{ background: `${color}09`, border: `1px solid ${color}20` }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-lg">{flag}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{city}</span>
        <span className="text-[10px]">{isDaytime ? "☀️" : "🌙"}</span>
      </div>
      <p className="text-xl font-bold font-mono tabular-nums text-foreground">{time || "--:--:--"}</p>
      <p className="text-[10px] text-zinc-500 mt-1">{date}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CREATOR TIPS
───────────────────────────────────────────── */
const CREATOR_TIPS = [
  { icon: Rocket,    color: "#f472b6", bg: "rgba(244,114,182,0.12)", tip: "Post within the first 2 hours of peak time. Timing is 30% of your reach." },
  { icon: Hash,      color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  tip: "Use 5–8 niche hashtags rather than 30 generic ones. Quality beats quantity." },
  { icon: Brain,     color: "#a78bfa", bg: "rgba(167,139,250,0.12)", tip: "Hook your viewers in the first 3 seconds — that's when 60% decide to keep watching." },
  { icon: Megaphone, color: "#34d399", bg: "rgba(52,211,153,0.12)",  tip: "Reply to every comment in your first hour. The algorithm rewards early engagement." },
  { icon: Star,      color: GOLD,      bg: "rgba(212,180,97,0.12)",  tip: "Batch create content on one day. Posting consistently beats posting perfectly." },
  { icon: TrendingUp,color: "#fb923c", bg: "rgba(251,146,60,0.12)",  tip: "Repurpose your top-performing content to 3 other platforms — don't leave reach on the table." },
  { icon: Coffee,    color: "#f87171", bg: "rgba(248,113,113,0.12)", tip: "Study one competitor's top 5 posts every week. Learn what works before reinventing the wheel." },
  { icon: MonitorPlay,color:"#c084fc", bg: "rgba(192,132,252,0.12)", tip: "Video thumbnails with a face get 38% more clicks. Show up visually." },
];

/* ─────────────────────────────────────────────
   PERSONALIZATION DATA
───────────────────────────────────────────── */
const STRUGGLE_MAP: Record<string, { action: string; href: string; tool: string }> = {
  "Growing my followers":              { action: "Run a competitor scan to find content already winning in your niche, then model what works.",          href: "/competitor-study",       tool: "Competitor Intel" },
  "Low engagement on posts":           { action: "Score your next post through the Virality Tester before publishing — find the weak spots first.",       href: "/virality-tester",        tool: "Virality Tester" },
  "Coming up with content ideas":      { action: "Generate a full week of niche-specific ideas with hooks and formats in 60 seconds.",                     href: "/ai-ideas",               tool: "AI Content Ideas" },
  "Monetising my audience":            { action: "Build your Ideal Customer Profile — identify exactly who you're selling to and what they need most.",    href: "/icp-builder",            tool: "ICP Builder" },
  "Staying consistent":                { action: "Set up your content board and schedule the next 30 days in one batch session.",                          href: "/board-builder",          tool: "Board Builder" },
  "Understanding analytics":           { action: "Log your last 5 posts and generate a performance report to see what's actually working.",                href: "/tracking/content",       tool: "Content Tracker" },
  "Building brand partnerships":       { action: "Build your brand kit — colours, tone, and a media kit ready to send to potential sponsors.",             href: "/brand-kit-builder",      tool: "Brand Kit Builder" },
  "Managing time efficiently":         { action: "Block one creation day per week and plan the full month with your content calendar.",                    href: "/content-calendar",       tool: "Content Calendar" },
  "Standing out in a crowded niche":   { action: "Map your audience psychology to find the emotional angles your competitors consistently miss.",          href: "/audience-psychology",    tool: "Audience Psychology" },
  "Converting followers to customers": { action: "Create a lead magnet that captures emails and starts your sales funnel — first offer under $97.",        href: "/lead-magnet-generator",  tool: "Lead Magnet Generator" },
  "Dealing with algorithm changes":    { action: "Track your IG follower count and engagement rate daily — spot trend drops before they compound.",        href: "/ig-growth-tracker",      tool: "IG Growth Tracker" },
  "Building a personal brand identity":{ action: "Generate your complete brand kit — colours, fonts, voice, and positioning in one session.",             href: "/brand-kit-builder",      tool: "Brand Kit Builder" },
  "Knowing what content to create":    { action: "Generate a 30-day content plan with hooks, formats, and a posting cadence built for your niche.",       href: "/content-calendar",       tool: "Content Calendar" },
  "Getting views / reach":             { action: "Score your next script with the Virality Tester — fix the hook before posting, not after.",              href: "/virality-tester",        tool: "Virality Tester" },
  "Building confidence on camera":     { action: "Generate camera-friendly scripts with natural delivery cues — practice with the words, not just ideas.", href: "/ai-ideas",               tool: "AI Content Ideas" },
  "Editing and production quality":    { action: "Use the AI Video Editor to trim, caption, and enhance your clips — no editing experience needed.",       href: "/video-editor",           tool: "AI Video Editor" },
};

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram: "📸", YouTube: "🎬", TikTok: "🎵", LinkedIn: "💼",
  "Twitter / X": "𝕏", Pinterest: "📌", Threads: "🧵", Facebook: "👥",
  Snapchat: "👻", Twitch: "🎮", "Substack / Newsletter": "📧",
  "Podcast platforms (Spotify, Apple)": "🎙️",
};

const STRUGGLE_TIPS: Record<string, { tip: string; icon: any; color: string; bg: string }> = {
  "Growing my followers":              { tip: "Post 4–5× per week minimum. Follower growth is a volume-consistency game — the algorithm rewards those who show up.",             icon: TrendingUp,   color: "#34d399",  bg: "rgba(52,211,153,0.12)"   },
  "Low engagement on posts":           { tip: "Reply to every comment within the first hour. Early engagement signals push your content to a wider audience.",                  icon: Megaphone,    color: "#60a5fa",  bg: "rgba(96,165,250,0.12)"   },
  "Coming up with content ideas":      { tip: "Look at your top 3 performing posts. Find the common angle — that's your winning formula. Remix it, don't reinvent.",           icon: Lightbulb,    color: GOLD,       bg: "rgba(212,180,97,0.12)"   },
  "Monetising my audience":            { tip: "Your first offer should solve one specific problem. Start under $97 — low friction, high learning, and real revenue proof.",     icon: DollarSign,   color: "#34d399",  bg: "rgba(52,211,153,0.12)"   },
  "Staying consistent":                { tip: "Batch create on one day per week, post from a queue. Showing up consistently always beats posting perfectly.",                   icon: Clock,        color: "#a78bfa",  bg: "rgba(167,139,250,0.12)"  },
  "Understanding analytics":           { tip: "Track 3 metrics only: views, saves, and profile visits. These 3 tell you if your content is actually working.",                 icon: BarChart2,    color: "#60a5fa",  bg: "rgba(96,165,250,0.12)"   },
  "Managing time efficiently":         { tip: "Block 2–3 hour creation windows, not 20-minute gaps. Deep work creates better content — treat it like a non-negotiable meeting.",icon: Clock,        color: "#fb923c",  bg: "rgba(251,146,60,0.12)"   },
  "Standing out in a crowded niche":   { tip: "Your unique angle isn't your niche — it's your point of view on it. Develop a consistent take that only you would say.",        icon: Star,         color: GOLD,       bg: "rgba(212,180,97,0.12)"   },
  "Converting followers to customers": { tip: "Add one clear CTA to every post: 'Comment X', 'Link in bio', or 'DM me'. Most creators forget this and leave money behind.",   icon: Target,       color: "#34d399",  bg: "rgba(52,211,153,0.12)"   },
  "Getting views / reach":             { tip: "Hook your viewer in the first 1.5 seconds. Make them think 'I need to see where this goes' before they scroll away.",            icon: Rocket,       color: "#f472b6",  bg: "rgba(244,114,182,0.12)"  },
  "Building confidence on camera":     { tip: "Record 10 bad videos and throw them away. Confidence on camera is a skill — the only way through is volume.",                   icon: Brain,        color: "#a78bfa",  bg: "rgba(167,139,250,0.12)"  },
  "Editing and production quality":    { tip: "Clean audio matters more than a great camera. A $15 clip-on mic upgrades your content more than any lens or lighting rig.",     icon: Mic2,         color: "#60a5fa",  bg: "rgba(96,165,250,0.12)"   },
  "Dealing with algorithm changes":    { tip: "The algorithm rewards consistency and early engagement, not luck. Track your data daily and respond to what it shows you.",      icon: TrendingUp,   color: "#34d399",  bg: "rgba(52,211,153,0.12)"   },
  "Building a personal brand identity":{ tip: "Pick 3 content pillars and stick to them for 90 days. Consistency of topic trains your audience to expect — and seek — your content.", icon: Palette, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "Knowing what content to create":    { tip: "Steal the format, not the content. Take your competitor's best-performing video structure and apply your unique perspective.",   icon: Lightbulb,    color: GOLD,       bg: "rgba(212,180,97,0.12)"   },
  "Building brand partnerships":       { tip: "Brands don't care about your follower count — they care about engagement and niche fit. A 5K engaged audience beats 50K passive.", icon: UserCheck, color: "#34d399", bg: "rgba(52,211,153,0.12)" },
};

/* ─────────────────────────────────────────────
   CREATOR BRIEFING (survey-personalised)
───────────────────────────────────────────── */
function CreatorBriefing() {
  const { user } = useAuth();
  const u = user as any;
  const niche: string[] = u?.fields || [];
  const struggles: string[] = (u?.struggles || []).slice(0, 5);
  const platforms: string[] = u?.platforms || [];
  const primaryGoal: string = u?.primaryGoal || "";
  const followerCount: string = u?.followerCount || "";
  const experience: string = u?.experience || "";
  const descriptor: string = u?.descriptor || "";

  if (!niche.length && !struggles.length && !primaryGoal && !platforms.length) return null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(212,180,97,0.2)", background: "rgba(212,180,97,0.025)" }} data-testid="creator-briefing">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: "rgba(212,180,97,0.12)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,180,97,0.15)" }}>
            <Target className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Your Creator Briefing</p>
            <p className="text-[10px] text-zinc-500">Personalised from your onboarding answers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {followerCount && (
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: GOLD }}>{followerCount}</p>
              <p className="text-[10px] text-zinc-500">current followers</p>
            </div>
          )}
          {descriptor && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {descriptor}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Niche + Platform chips */}
        {(niche.length > 0 || platforms.length > 0) && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5">Niche & Platforms</p>
            <div className="flex flex-wrap gap-2">
              {niche.slice(0, 4).map(n => (
                <span key={n} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(212,180,97,0.12)", color: GOLD, border: "1px solid rgba(212,180,97,0.25)" }}>
                  {n}
                </span>
              ))}
              {platforms.slice(0, 5).map(p => (
                <span key={p} className="text-xs px-2.5 py-1.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {PLATFORM_EMOJI[p] || "📱"} {p.split(" ")[0]}
                </span>
              ))}
              {experience && (
                <span className="text-xs px-2.5 py-1.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  🕐 {experience}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Primary Goal */}
        {primaryGoal && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <Target className="w-4 h-4 shrink-0" style={{ color: "#34d399" }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(52,211,153,0.6)" }}>Primary Goal</p>
              <p className="text-sm font-semibold text-foreground">{primaryGoal}</p>
            </div>
          </div>
        )}

        {/* Struggles with actions */}
        {struggles.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Your Focus Areas — What to Work On Now</p>
            <div className="space-y-2">
              {struggles.map((s, i) => {
                const mapped = STRUGGLE_MAP[s];
                return (
                  <div key={s} className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold" style={{ background: "rgba(212,180,97,0.15)", color: GOLD }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground mb-0.5">{s}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{mapped?.action ?? "Use the AI tools below to tackle this area."}</p>
                    </div>
                    {mapped && (
                      <Link href={mapped.href}>
                        <button className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ background: "rgba(212,180,97,0.1)", color: GOLD, border: "1px solid rgba(212,180,97,0.2)", whiteSpace: "nowrap" }} data-testid={`briefing-tool-${i}`}>
                          {mapped.tool} →
                        </button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatorTipCard({ struggles }: { struggles: string[] }) {
  const topStruggle = struggles.find(s => STRUGGLE_TIPS[s]);
  if (topStruggle) {
    const { tip, icon: Icon, color, bg } = STRUGGLE_TIPS[topStruggle];
    return (
      <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: bg, border: `1px solid ${color}25` }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>Tip For You</span>
            <p className="text-[9px] text-zinc-500 mt-0.5 truncate max-w-[160px]">{topStruggle}</p>
          </div>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed flex-1 italic">"{tip}"</p>
      </div>
    );
  }
  const dayIndex = Math.floor(Date.now() / 86400000) % CREATOR_TIPS.length;
  const { icon: Icon, color, bg, tip } = CREATOR_TIPS[dayIndex];
  return (
    <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: bg, border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>Creator Tip · Today</span>
      </div>
      <p className="text-sm text-zinc-200 leading-relaxed flex-1 italic">"{tip}"</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GROWTH MILESTONE TRACKER
───────────────────────────────────────────── */
const MILESTONES = [
  { label: "First Post",       icon: "🎬", threshold: 1  },
  { label: "7-Day Streak",     icon: "🔥", threshold: 7  },
  { label: "10 Tools Used",    icon: "⚡", threshold: 10 },
  { label: "30-Day Active",    icon: "📅", threshold: 30 },
  { label: "Creator Pro",      icon: "👑", threshold: 50 },
];

function GrowthMilestones({ streak, monthActions }: { streak: number; monthActions: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-foreground">Growth Milestones</p>
          <p className="text-xs text-zinc-500 mt-0.5">Your creator journey checkpoints</p>
        </div>
        <Crown className="w-4 h-4" style={{ color: GOLD }} />
      </div>
      <div className="flex items-center gap-2">
        {MILESTONES.map((m, i) => {
          const achieved = (i === 0 && monthActions >= 1) || (i === 1 && streak >= 7) || (i === 2 && monthActions >= 10) || (i === 3 && streak >= 30) || (i === 4 && monthActions >= 50);
          const partial = !achieved && ((i === 0 && monthActions >= 0) || (i === 1 && streak > 0) || (i === 2 && monthActions > 0) || (i === 3 && streak > 7) || (i === 4 && monthActions > 10));
          return (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5" title={m.label}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                style={{
                  background: achieved ? `rgba(212,180,97,0.2)` : partial ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                  border: achieved ? `1px solid rgba(212,180,97,0.5)` : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: achieved ? "0 0 12px rgba(212,180,97,0.25)" : "none",
                  filter: achieved ? "none" : "grayscale(0.7) opacity(0.4)",
                }}
              >
                {m.icon}
              </div>
              <p className="text-[9px] text-center leading-tight" style={{ color: achieved ? GOLD : "rgba(255,255,255,0.3)" }}>{m.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIER DISPLAY + NEXT TIER BENEFITS
───────────────────────────────────────────── */
export const TIER_DISPLAY: Record<string, { name: string; color: string }> = {
  free:    { name: "Tier 1 · Free",    color: "#71717a" },
  starter: { name: "Tier 2 · Starter", color: "#818cf8" },
  growth:  { name: "Tier 3 · Growth",  color: "#d4b461" },
  pro:     { name: "Tier 4 · Pro",     color: "#34d399" },
  elite:   { name: "Tier 5 · Elite",   color: "#d4b461" },
};

const NEXT_TIER_INFO: Record<string, {
  nextName: string; nextPrice: string; color: string; bg: string; border: string;
  perks: { icon: any; title: string; desc: string }[];
}> = {
  free: {
    nextName: "Tier 2 · Starter", nextPrice: "$29/mo",
    color: "#818cf8", bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.2)",
    perks: [
      { icon: Zap,       title: "30× more usage",          desc: "Move from 5 daily credits to 150 monthly — finally enough room to actually build." },
      { icon: ScanSearch,title: "Faster iteration",         desc: "Test more hooks, captions and ideas every week without hitting a daily wall." },
      { icon: Layers,    title: "Real creative output",     desc: "Ship enough content consistently to see real growth — not just one or two posts." },
      { icon: Target,    title: "Bigger experiments",       desc: "Run full content campaigns instead of small tests — bigger swings, bigger wins." },
    ],
  },
  starter: {
    nextName: "Tier 3 · Growth", nextPrice: "$59/mo",
    color: "#d4b461", bg: "rgba(212,180,97,0.07)", border: "rgba(212,180,97,0.2)",
    perks: [
      { icon: Zap,       title: "More than 2× the volume", desc: "350 monthly credits — produce content at full capacity instead of rationing." },
      { icon: Users,     title: "Sharper market edge",     desc: "Spend more time researching what's working before you commit creative effort." },
      { icon: Brain,     title: "Deeper audience clarity", desc: "Run the analysis you need to make every post hit harder, not just more often." },
      { icon: Palette,   title: "Stronger brand presence", desc: "Build a recognisable identity that compounds with every piece you publish." },
    ],
  },
  growth: {
    nextName: "Tier 4 · Pro", nextPrice: "$79/mo",
    color: "#34d399", bg: "rgba(52,211,153,0.07)", border: "rgba(52,211,153,0.2)",
    perks: [
      { icon: Zap,       title: "Near-unlimited capacity", desc: "700 monthly credits — enough to run your entire content engine without slowing down." },
      { icon: Clapperboard,title:"High-volume video",       desc: "Produce short-form video at the pace your audience actually demands." },
      { icon: Bot,       title: "Personalised guidance",   desc: "Get strategy shaped around your real numbers — not generic, one-size-fits-all advice." },
      { icon: Map,       title: "Plan weeks ahead",        desc: "Turn what's working into repeatable systems and map your content far in advance." },
    ],
  },
  pro: {
    nextName: "Tier 5 · Elite", nextPrice: "Application only",
    color: "#d4b461", bg: "rgba(212,180,97,0.07)", border: "rgba(212,180,97,0.25)",
    perks: [
      { icon: Zap,         title: "Unlimited credits, no cap",  desc: "Use every tool as much as you want — no monthly limits, ever." },
      { icon: Crown,       title: "Done-with-you strategy",     desc: "The team works alongside you on your content and growth plan." },
      { icon: CalendarPlus,title: "1-on-1 strategy calls",      desc: "Book dedicated time with the team whenever you need direction." },
      { icon: MessageSquare,title:"Direct team access",         desc: "Message and collaborate directly with the Oravini team in-platform." },
    ],
  },
};

function NextTierBenefits({ plan }: { plan: string }) {
  const info = NEXT_TIER_INFO[plan];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!info) return;
    const id = setInterval(() => setActiveIdx(i => (i + 1) % info.perks.length), 4000);
    return () => clearInterval(id);
  }, [info]);

  if (!info) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, ${info.bg} 100%)`,
        border: `1px solid ${info.color}35`,
        boxShadow: `0 0 70px ${info.color}14, inset 0 1px 0 ${info.color}20`,
      }}
      data-testid="next-tier-benefits"
    >
      {/* Ambient glow orb */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: info.color, opacity: 0.08, transform: "translate(35%, -35%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: info.color, opacity: 0.04, transform: "translate(-30%, 30%)" }}
      />

      {/* Header */}
      <div className="relative px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: info.color, boxShadow: `0 0 6px ${info.color}` }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: info.color }}>
                What's waiting in {info.nextName}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white leading-tight">
              Unlock more. Create more.{" "}
              <span style={{ color: info.color }}>Grow more.</span>
            </h3>
            <p className="text-sm text-zinc-400 mt-1.5">
              {info.nextPrice} · Everything in your current plan, plus:
            </p>
          </div>
          <div
            className="shrink-0 px-4 py-2 rounded-2xl"
            style={{ background: `${info.color}18`, border: `1px solid ${info.color}40` }}
          >
            <p className="text-[10px] text-zinc-500 leading-none mb-0.5">Next tier</p>
            <p className="text-sm font-black" style={{ color: info.color }}>{info.nextPrice}</p>
          </div>
        </div>
      </div>

      {/* Perks grid — 2×2 */}
      <div className="relative px-6 pb-5 grid grid-cols-2 gap-3">
        {info.perks.map((perk, i) => {
          const PIcon = perk.icon;
          const isActive = i === activeIdx;
          return (
            <div
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-2xl p-4 cursor-pointer transition-all duration-500"
              style={{
                background: isActive ? `${info.color}14` : "rgba(255,255,255,0.025)",
                border: `1px solid ${isActive ? `${info.color}45` : "rgba(255,255,255,0.06)"}`,
                transform: isActive ? "scale(1.02)" : "scale(1)",
                boxShadow: isActive ? `0 4px 24px ${info.color}18` : "none",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${info.color}20`, border: `1px solid ${info.color}30` }}
              >
                <PIcon className="w-4 h-4" style={{ color: info.color }} />
              </div>
              <p className="text-sm font-bold text-white leading-snug">{perk.title}</p>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{perk.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div
        className="relative px-6 pb-6 flex items-center justify-between gap-4"
        style={{ borderTop: `1px solid ${info.color}15` }}
      >
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 pt-4">
          {info.perks.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-full transition-all duration-300"
              style={{
                height: 5,
                width: i === activeIdx ? 20 : 5,
                background: i === activeIdx ? info.color : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>

        <Link href="/settings/plan">
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all hover:scale-105 active:scale-95 mt-4"
            style={{
              background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
              color: plan === "growth" ? "#000" : "#000",
              boxShadow: `0 4px 28px ${info.color}50`,
              letterSpacing: "0.01em",
            }}
            data-testid="button-next-tier-learn-more"
          >
            Explore {info.nextName} <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTIVITY STAT TILE
───────────────────────────────────────────── */
function ActivityTile({ icon: Icon, label, value, sub, accentColor, gradient }: {
  icon: any; label: string; value: string | number; sub?: string; accentColor: string; gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border`} style={{ background: gradient, borderColor: `${accentColor}25` }}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20" style={{ background: accentColor, transform: "translate(30%, -30%)" }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${accentColor}20` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: accentColor }} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   7-DAY ACTIVITY HEATMAP
───────────────────────────────────────────── */
function ActivityHeatmap({ weekHistory }: { weekHistory: { date: string; creditsUsed: number; actions: number }[] }) {
  const max = Math.max(...weekHistory.map(d => d.creditsUsed), 1);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex items-end gap-2 w-full">
      {weekHistory.map((day, i) => {
        const intensity = day.creditsUsed / max;
        const dayLabel = days[new Date(day.date + "T12:00:00").getDay()];
        const isToday = i === weekHistory.length - 1;
        const bg = intensity === 0
          ? "rgba(255,255,255,0.04)"
          : intensity < 0.3
            ? "rgba(212,180,97,0.25)"
            : intensity < 0.6
              ? "rgba(212,180,97,0.55)"
              : "#d4b461";

        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5" title={`${dayLabel}: ${day.creditsUsed} credits, ${day.actions} actions`}>
            <div
              className="w-full rounded-lg transition-all"
              style={{
                height: `${Math.max(12, intensity * 52 + 12)}px`,
                background: bg,
                boxShadow: intensity > 0.6 ? `0 0 12px rgba(212,180,97,0.35)` : "none",
                border: isToday ? `1px solid rgba(212,180,97,0.5)` : "1px solid transparent",
              }}
            />
            <p className="text-[9px] font-medium" style={{ color: isToday ? GOLD : "rgba(255,255,255,0.3)" }}>{dayLabel}</p>
            {day.creditsUsed > 0 && (
              <p className="text-[8px] text-zinc-600">{day.creditsUsed}cr</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReferralWidget({ stats }: { stats: any }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const link = stats?.link || "";
  const code = stats?.code || "";

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it to earn 50 credits per signup." });
      setTimeout(() => setCopied(false), 2200);
    });
  }

  function shareOn(platform: "twitter" | "whatsapp") {
    if (!link) return;
    const msg = encodeURIComponent(`Join me on Oravini — the AI-powered content growth platform for influencers. Sign up with my link and let's grow together:`);
    const url = encodeURIComponent(link);
    const target =
      platform === "twitter"
        ? `https://twitter.com/intent/tweet?text=${msg}%20${url}`
        : `https://wa.me/?text=${msg}%20${url}`;
    window.open(target, "_blank", "noopener");
  }

  const statItems = [
    { icon: MousePointerClick, label: "Clicks",        value: stats?.clicks  ?? "—", color: "#a78bfa" },
    { icon: UserCheck,         label: "Signups",       value: stats?.signups ?? "—", color: GOLD },
    { icon: Zap,               label: "Credits Earned",value: stats?.signups ? stats.signups * 50 : "—", color: "#34d399" },
  ];

  return (
    <div
      style={{
        borderRadius: 20,
        border: `1.5px solid ${GOLD}28`,
        background: "linear-gradient(145deg, rgba(212,180,97,0.06) 0%, transparent 55%)",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 20px", borderBottom: `1px solid ${GOLD}18`,
          background: `linear-gradient(90deg, ${GOLD}0a 0%, transparent 100%)`,
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Gift className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Refer &amp; Earn</p>
          <p className="text-[10px] text-zinc-500">Invite friends, grow your credits</p>
        </div>
        <div
          className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
          style={{
            background: `${GOLD}18`, color: GOLD,
            border: `1px solid ${GOLD}30`,
            animation: "subtlePulse 3s ease-in-out infinite",
          }}
        >
          +50 credits per signup
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {statItems.map(({ icon: Icon, label, value, color }, i) => (
            <div
              key={label}
              style={{
                borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.025)",
                padding: "12px 10px", textAlign: "center",
                transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                cursor: "default",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(8px)",
                transitionDelay: `${0.1 + i * 0.08}s`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${color}18`;
                (e.currentTarget as HTMLDivElement).style.borderColor = `${color}35`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <Icon className="w-4 h-4 mx-auto mb-2" style={{ color }} />
              <p className="text-xl font-bold text-foreground leading-none mb-1">{value}</p>
              <p className="text-[10px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Link bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <div
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              minWidth: 0,
            }}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD, opacity: 0.7 }} />
            <span
              className="text-xs font-mono truncate"
              style={{ color: link ? "#d4d4d4" : "#52525b" }}
            >
              {link || "Generating your link…"}
            </span>
          </div>
          <button
            data-testid="button-copy-referral"
            onClick={copyLink}
            disabled={!link}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 12,
              background: copied ? "#22c55e" : GOLD,
              color: "#000", fontSize: 12, fontWeight: 700,
              border: "none", cursor: link ? "pointer" : "not-allowed",
              opacity: link ? 1 : 0.4,
              transition: "background 0.3s ease, transform 0.15s ease",
              whiteSpace: "nowrap", shrink: 0,
            }}
            onMouseEnter={e => { if (link) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5" /> Copied!</>
              : <><Copy className="w-3.5 h-3.5" /> Copy Link</>
            }
          </button>
        </div>

        {/* Share buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => shareOn("twitter")}
            disabled={!link}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: "rgba(29,161,242,0.1)", border: "1px solid rgba(29,161,242,0.2)",
              color: "#1da1f2", cursor: link ? "pointer" : "not-allowed",
              opacity: link ? 1 : 0.4,
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { if (link) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(29,161,242,0.18)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(29,161,242,0.1)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </button>
          <button
            onClick={() => shareOn("whatsapp")}
            disabled={!link}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)",
              color: "#25d366", cursor: link ? "pointer" : "not-allowed",
              opacity: link ? 1 : 0.4,
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { if (link) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(37,211,102,0.18)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(37,211,102,0.1)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.553 4.1 1.522 5.827L0 24l6.335-1.509A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.371l-.359-.214-3.753.893.938-3.666-.234-.376A9.818 9.818 0 0 1 12 2.182c5.427 0 9.818 4.391 9.818 9.818s-4.391 9.818-9.818 9.818z"/></svg>
            Share on WhatsApp
          </button>
        </div>

        {code && (
          <p style={{ textAlign: "center", fontSize: 11, color: "#52525b" }}>
            Your code: <span style={{ fontFamily: "monospace", color: "#a1a1aa", letterSpacing: 1 }}>{code}</span>
          </p>
        )}
      </div>

      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const survey = useSurvey();
  const QUICK_TOOLS = getQuickTools(survey.struggles);

  const { data: onboardingStatus } = useQuery<{ done: boolean; survey: any }>({
    queryKey: ["/api/user/onboarding-status"],
    enabled: !!user?.id,
    staleTime: Infinity,
  });
  const showOnboarding = onboardingStatus !== undefined && !onboardingStatus.done;

  const { data: prog, isLoading: progLoading } = useQuery<any>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: notifications, isLoading: notifsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: contentPosts } = useQuery<any[]>({
    queryKey: [`/api/content/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: goal, isLoading: goalLoading } = useQuery<any>({
    queryKey: [`/api/income-goal/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: activity } = useQuery<any>({
    queryKey: ["/api/activity/summary"],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: referralStats } = useQuery<any>({
    queryKey: ["/api/referral/my-stats"],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const deleteNotif = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: any) => apiRequest("PATCH", `/api/tasks/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${user?.id}`] });
      toast({ title: "Task updated" });
    },
  });

  const avgProgress = prog ? Math.round((prog.offerCreation + prog.funnelProgress + prog.contentProgress + prog.monetizationProgress) / 4) : 0;
  const completedTasks = (tasks || []).filter((t: any) => t.completed).length;
  const pendingTasks = (tasks || []).filter((t: any) => !t.pending).length;
  const unreadNotifs = (notifications || []).filter((n: any) => !n.read);
  const totalContentViews = (contentPosts || []).reduce((s: number, p: any) => s + p.views, 0);
  const totalFollowers = (contentPosts || []).reduce((s: number, p: any) => s + p.followersGained + p.subscribersGained, 0);

  const isElite = (user as any)?.plan === "elite";
  const dailyQuote = getDailyQuote();
  const showGoalDialog = !goalLoading && goal === null && !!user?.id;

  // Refresh logic
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem("dash_auto_refresh") === "true");
  const autoRefreshRef = useRef(autoRefresh);
  const versionRef = useRef<string | null>(null);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => window.location.reload(), 400);
  }, []);

  useEffect(() => {
    autoRefreshRef.current = autoRefresh;
    localStorage.setItem("dash_auto_refresh", String(autoRefresh));
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      if (!autoRefreshRef.current) return;
      try {
        const res = await fetch("/", { method: "HEAD", cache: "no-store" });
        const etag = res.headers.get("etag") || res.headers.get("last-modified") || "";
        if (versionRef.current === null) { versionRef.current = etag; return; }
        if (etag && etag !== versionRef.current) { versionRef.current = etag; window.location.reload(); }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const streak = activity?.streak ?? 0;
  const todayTools = activity?.today?.toolsUsed ?? 0;
  const weekHistory = activity?.weekHistory ?? Array(7).fill({ date: "", creditsUsed: 0, actions: 0 });
  const monthActions = activity?.thisMonth?.totalActions ?? 0;
  const todayToolNames: string[] = activity?.today?.toolNames ?? [];

  const userStruggles: string[] = (user as any)?.struggles || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <ClientLayout>
        {showGoalDialog && user?.id && <GoalDialog userId={user.id} autoOpen={true} />}

        <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
              <h1 data-testid="text-welcome" className="text-2xl lg:text-3xl font-bold text-foreground">
                {greeting}, {user?.name?.split(" ")[0]} 👋
              </h1>
              {user?.program && (
                <p className="text-sm text-zinc-500 mt-1">{user.program}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tier badge */}
              {(user as any)?.plan && TIER_DISPLAY[(user as any).plan] && (
                <Link href="/settings/plan">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: `${TIER_DISPLAY[(user as any).plan].color}15`,
                      border: `1px solid ${TIER_DISPLAY[(user as any).plan].color}30`,
                    }}
                    data-testid="text-tier-badge"
                  >
                    <Crown className="w-3 h-3" style={{ color: TIER_DISPLAY[(user as any).plan].color }} />
                    <span className="text-xs font-bold" style={{ color: TIER_DISPLAY[(user as any).plan].color }}>
                      {TIER_DISPLAY[(user as any).plan].name}
                    </span>
                  </div>
                </Link>
              )}
              {/* Refresh controls */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5">
                <button
                  onClick={handleRefresh}
                  data-testid="button-refresh-dashboard"
                  title="Refresh dashboard"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" style={{ animation: isRefreshing ? "spin 0.5s linear infinite" : "none" }} />
                </button>
                <div className="w-px h-4 bg-zinc-800" />
                <button
                  onClick={() => setAutoRefresh(v => !v)}
                  data-testid="button-auto-refresh"
                  title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
                  className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                  style={{ color: autoRefresh ? GOLD : "var(--muted-foreground)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: autoRefresh ? GOLD : "currentColor", boxShadow: autoRefresh ? `0 0 5px ${GOLD}` : "none" }} />
                  Auto
                </button>
              </div>
              <TourButton />
              {user?.nextCallDate && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Next call</p>
                    <p className="text-xs font-semibold text-primary mt-0.5">{format(new Date(user.nextCallDate), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── TAKE THE TOUR BANNER ── */}
          <div
            className="relative overflow-hidden rounded-2xl px-5 py-3.5 cursor-pointer group"
            style={{ background: "linear-gradient(135deg, rgba(18,14,30,0.97) 0%, rgba(22,16,36,0.97) 100%)", border: "1px solid rgba(212,180,97,0.2)" }}
            data-testid="tour-banner"
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 5% 50%, rgba(212,180,97,0.07) 0%, transparent 60%)" }} />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, #b89848 0%, #d4b461 50%, #f0d280 100%)", boxShadow: "0 0 14px rgba(212,180,97,0.35)" }}>
                <Bot className="w-4.5 h-4.5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">New here? Take the guided tour</p>
                <p className="text-xs text-zinc-500 mt-0.5">Your AI guide walks you through every tool in 3 minutes.</p>
              </div>
              <TourButton className="shrink-0" />
            </div>
          </div>

          {/* ── CREATOR BRIEFING (survey-personalised) ── */}
          <CreatorBriefing />

          {/* ── INCOME GOAL + DAILY QUOTE ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-h-[160px]" data-testid="income-goal-card">
              {user?.id && <IncomeGoalCard userId={user.id} />}
            </div>
            <div className="rounded-2xl p-5 flex flex-col h-full min-h-[160px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="daily-quote-card">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 shrink-0" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
                <Quote className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Daily Quote</p>
              <p className="text-sm italic text-zinc-300 leading-relaxed flex-1">"{dailyQuote}"</p>
              <p className="text-[10px] text-zinc-600 mt-3">{format(new Date(), "MMMM d, yyyy")}</p>
            </div>
          </div>

          {/* ── WORLD CLOCK ── */}
          <div className="rounded-2xl border border-zinc-800 p-4" style={{ background: "rgba(255,255,255,0.012)" }} data-testid="world-clock">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">World Time</p>
            </div>
            <div className="flex gap-3">
              {WORLD_CITIES.map(c => (
                <CityClockCard key={c.city} city={c.city} timezone={c.timezone} flag={c.flag} color={c.color} />
              ))}
            </div>
          </div>

          {/* ── CREATOR SCORE ── */}
          <CreatorScore streak={streak} monthActions={monthActions} contentCount={(contentPosts || []).length} />

          {/* ── REFERRAL WIDGET ── */}
          <ReferralWidget stats={referralStats} />

          {/* ── ACTIVITY COMMAND CENTER ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Today's Activity</p>
              {todayToolNames.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {todayToolNames.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{TOOL_LABELS[t] || t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ActivityTile
                icon={Sparkles}
                label="Tools Used Today"
                value={todayTools}
                sub={todayTools === 0 ? "None yet — start creating" : `tool${todayTools !== 1 ? "s" : ""} launched`}
                accentColor="#a78bfa"
                gradient="linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.03) 100%)"
              />
              <ActivityTile
                icon={Flame}
                label="Day Streak"
                value={streak === 0 ? "—" : `${streak}d`}
                sub={streak === 0 ? "Use a tool to start" : streak === 1 ? "Keep it going!" : "Incredible consistency"}
                accentColor="#fb923c"
                gradient="linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(251,146,60,0.03) 100%)"
              />
              <ActivityTile
                icon={BarChart2}
                label="Monthly Actions"
                value={monthActions}
                sub="tool uses this month"
                accentColor="#60a5fa"
                gradient="linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(96,165,250,0.03) 100%)"
              />
            </div>
          </div>

          {/* ── 7-DAY HEATMAP ── */}
          <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-foreground">7-Day Activity</p>
                <p className="text-xs text-zinc-500 mt-0.5">Your tool usage across the last week</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(255,255,255,0.04)", display: "inline-block" }} /> No activity</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#d4b461]" style={{ display: "inline-block" }} /> Active</span>
              </div>
            </div>
            <ActivityHeatmap weekHistory={weekHistory} />
          </div>

          {/* ── GROWTH MILESTONES + CREATOR TIP ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GrowthMilestones streak={streak} monthActions={monthActions} />
            <CreatorTipCard struggles={userStruggles} />
          </div>

          {/* ── BIG 3 TODAY ── */}
          <BigThreeToday />

          {/* ── QUICK TOOLS ── */}
          <div data-tour="quick-tools">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Quick Tools</p>
              <Link href="/ai-ideas" className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
                All tools <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {QUICK_TOOLS.map(({ href, label, desc, icon: Icon, gradient, iconBg, iconColor }) => (
                <Link key={`${href}-${label}`} href={href}>
                  <div
                    data-testid={`quick-tool-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="relative overflow-hidden flex flex-col gap-3 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all duration-200 cursor-pointer group h-full"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: gradient }} />
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
                    </div>
                    <div className="relative">
                      <p className="text-sm font-bold text-foreground group-hover:text-white transition-colors">{label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all mt-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── CONNECTED PLATFORMS ── */}
          <ConnectedPlatforms />

          {/* ── NEXT TIER BENEFITS ── */}
          {(user as any)?.plan !== "elite" && (user as any)?.plan && (
            <NextTierBenefits plan={(user as any).plan} />
          )}

          {/* ── CONTENT PERFORMANCE ── */}
          {(contentPosts || []).length > 0 && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
                <p className="text-sm font-bold text-foreground">Content Performance</p>
                <Link href="/tracking/content" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  Full tracker <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-zinc-800/60 lg:divide-y-0">
                {[
                  { label: "Total Posts",  value: (contentPosts || []).length,                                                                      icon: FileText,   color: "#a78bfa" },
                  { label: "Total Views",  value: totalContentViews.toLocaleString(),                                                               icon: Eye,        color: "#60a5fa" },
                  { label: "Instagram",    value: (contentPosts || []).filter((p: any) => p.platform === "instagram").length,                       icon: Instagram,  color: "#f472b6" },
                  { label: "YouTube",      value: (contentPosts || []).filter((p: any) => p.platform === "youtube").length,                         icon: Youtube,    color: "#f87171" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex flex-col items-center justify-center py-5 gap-2">
                    <Icon className="w-5 h-5" style={{ color }} />
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COMMUNITY PULSE ── */}
          <CommunityPulse />

          {/* ── NOTIFICATIONS ── */}
          {(notifications || []).length > 0 && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-bold text-foreground">Notifications</p>
                  {unreadNotifs.length > 0 && (
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: GOLD, color: "#000" }}>
                      {unreadNotifs.length}
                    </span>
                  )}
                </div>
                {unreadNotifs.length > 0 && (
                  <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline" data-testid="mark-all-read">Mark all read</button>
                )}
              </div>
              <div className="divide-y divide-zinc-800/60">
                {notifsLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-14 mx-5 my-2 bg-zinc-800 rounded-lg animate-pulse" />)
                ) : (
                  (notifications || []).slice(0, 6).map((n: any) => (
                    <div
                      key={n.id}
                      data-testid={`notification-${n.id}`}
                      className={`flex items-start gap-3 px-5 py-3 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                    >
                      <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${!n.read ? "text-primary" : "text-zinc-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{format(new Date(n.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.read && (
                          <button onClick={() => markOneRead.mutate(n.id)} data-testid={`mark-read-${n.id}`} className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-primary transition-colors" title="Mark as read">
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => deleteNotif.mutate(n.id)} data-testid={`delete-notif-${n.id}`} className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: GOLD }} />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── FOCUS MUSIC — compact strip ── */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/30" data-testid="focus-music-banner">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(212,180,97,0.1)" }}>
              <Music2 className="w-3.5 h-3.5" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-foreground">Focus Music</span>
              <span className="text-xs text-zinc-600 ml-2">24 channels · lofi, nature sounds & white noise</span>
            </div>
            <span className="text-[10px] text-zinc-600">Look bottom-right ↘</span>
          </div>

          {/* ── ELITE: Book a Call ── */}
          {isElite && (
            <a
              href="https://calendly.com/brandversee/30min"
              target="_blank"
              rel="noreferrer"
              data-testid="book-a-call-banner"
              className="flex items-center gap-5 p-5 rounded-2xl hover:opacity-90 transition-opacity group"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #b89848 100%)` }}
            >
              <div className="w-10 h-10 bg-black/15 rounded-xl flex items-center justify-center shrink-0">
                <CalendarPlus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-black">Book a Strategy Call</p>
                <p className="text-xs text-black/70 mt-0.5">30-minute session · calendly.com/brandversee</p>
              </div>
              <div className="flex items-center gap-2 bg-black/15 rounded-lg px-4 py-2 shrink-0 group-hover:bg-black/25 transition-colors">
                <span className="text-sm font-bold text-black">Book Now</span>
                <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          )}

          {/* ── ELITE: Program Progress + Notifications ── */}
          {isElite && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
                  <p className="text-sm font-bold text-foreground">Program Progress</p>
                  <Link href="/progress" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    View details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-5 space-y-5">
                  {progLoading ? (
                    Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                  ) : prog ? (
                    [
                      { label: "Offer Creation",   value: prog.offerCreation,         color: GOLD },
                      { label: "Funnel Progress",   value: prog.funnelProgress,        color: "#60a5fa" },
                      { label: "Content Progress",  value: prog.contentProgress,       color: "#34d399" },
                      { label: "Monetization",      value: prog.monetizationProgress,  color: "#a78bfa" },
                    ].map(({ label, value, color }) => (
                      <div key={label} data-testid={`progress-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-zinc-400">{label}</span>
                          <span className="text-xs font-bold" style={{ color }}>{value}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-600 text-center py-4">Progress not set yet</p>
                  )}
                </div>
              </div>

              {/* Elite Tasks */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
                  <p className="text-sm font-bold text-foreground">Action Items</p>
                  <Badge variant="secondary" className="text-[10px] h-5">{(tasks || []).filter((t: any) => !t.completed).length} pending</Badge>
                </div>
                <div className="p-4 space-y-2">
                  {tasksLoading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                  ) : (tasks || []).length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">No tasks yet</p>
                    </div>
                  ) : (
                    (tasks || []).map((task: any) => (
                      <div
                        key={task.id}
                        data-testid={`task-${task.id}`}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${task.completed ? "opacity-50 border-zinc-800/50 bg-zinc-900/20" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}
                      >
                        <button onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })} data-testid={`toggle-task-${task.id}`} className="mt-0.5 shrink-0">
                          {task.completed
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Circle className="w-4 h-4 text-zinc-600 hover:text-primary transition-colors" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${task.completed ? "line-through text-zinc-600" : "text-foreground"}`}>{task.title}</p>
                          {task.dueDate && (
                            <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isAfter(new Date(), new Date(task.dueDate)) && !task.completed ? "text-red-400" : "text-zinc-600"}`}>
                              <Clock className="w-2.5 h-2.5" />{format(new Date(task.dueDate), "MMM d")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── COURSE MODULES ── */}
          <div className="rounded-2xl border border-zinc-800 p-5">
            <ContentMasteryModule />
          </div>

        </div>
      </ClientLayout>

      {showOnboarding && (
        <OnboardingModal
          existingSurvey={onboardingStatus?.survey}
          onComplete={() => {
            queryClient.setQueryData(["/api/user/onboarding-status"], { done: true, survey: null });
          }}
        />
      )}
    </>
  );
}
