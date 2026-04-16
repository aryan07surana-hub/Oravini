import ClientLayout from "@/components/layout/ClientLayout";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/hooks/use-auth";
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
  Megaphone, Rocket, Crown, Hash, Coffee, MonitorPlay
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
const QUICK_TOOLS = [
  { href: "/ai-ideas",        label: "Content Ideas",     desc: "AI-generated hooks & scripts",     icon: Sparkles,   gradient: "from-[#d4b461]/20 to-[#d4b461]/5",   iconBg: "bg-[#d4b461]/15",      iconColor: "#d4b461"   },
  { href: "/ai-coach",        label: "AI Coach",          desc: "Personalised content coaching",    icon: Bot,        gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/15",    iconColor: "#34d399"   },
  { href: "/video-editor",    label: "Video Editor",      desc: "Edit & enhance your videos",       icon: Clapperboard, gradient: "from-violet-500/20 to-violet-500/5", iconBg: "bg-violet-500/15",   iconColor: "#a78bfa"   },
  { href: "/competitor-study",label: "Competitor Study",  desc: "Deep-dive competitor analysis",    icon: ScanSearch, gradient: "from-blue-500/20 to-blue-500/5",     iconBg: "bg-blue-500/15",       iconColor: "#60a5fa"   },
  { href: "/carousel-studio", label: "Carousel Studio",   desc: "Design scroll-stopping carousels", icon: ImagePlay,  gradient: "from-pink-500/20 to-pink-500/5",      iconBg: "bg-pink-500/15",       iconColor: "#f472b6"   },
  { href: "/ai-ideas",        label: "AI Scriptwriter",   desc: "Auto-generate video scripts",      icon: Wand2,      gradient: "from-orange-500/20 to-orange-500/5",  iconBg: "bg-orange-500/15",     iconColor: "#fb923c"   },
];

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

function CreatorTipCard() {
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

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: onboardingStatus } = useQuery<{ done: boolean }>({
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
            <CreatorTipCard />
          </div>

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
        <OnboardingModal onComplete={() => {
          queryClient.setQueryData(["/api/user/onboarding-status"], { done: true });
        }} />
      )}
    </>
  );
}
