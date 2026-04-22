import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap, TrendingUp, Brain, Target, RefreshCw, Crown, ArrowLeft,
  ArrowDownCircle, ArrowUpCircle, Sparkles, Star, Info,
  Scissors, Film, Users, Layers, BookOpen, Map, BarChart2,
  Instagram, Youtube, Hash, Wand2, Palette, ClipboardList,
  MessageSquare, Search, Dna, Flame,
} from "lucide-react";
import { useLocation } from "wouter";

const GOLD = "#d4b461";

const PLAN_LABELS: Record<string, string> = {
  free: "Tier 1 — Free",
  starter: "Tier 2 — $29/mo",
  growth: "Tier 3 — $59/mo",
  pro: "Tier 4 — $79/mo",
  elite: "Tier 5 — Elite",
};

const PLAN_MONTHLY: Record<string, number> = {
  free: 20, starter: 100, growth: 250, pro: 500, elite: 99999,
};

// Full tool credit breakdown
const TOOL_COSTS = [
  {
    category: "Content Creation",
    color: "#d4b461",
    bg: "rgba(212,180,97,0.08)",
    border: "rgba(212,180,97,0.2)",
    tools: [
      { icon: Sparkles,     name: "AI Content Ideas",        cost: 5,  desc: "Generates 6-12 viral content ideas for your niche" },
      { icon: Wand2,        name: "Full Script Generator",   cost: 5,  desc: "Writes a complete video script from an idea" },
      { icon: Layers,       name: "Carousel Generate",       cost: 5,  desc: "AI writes all slides — hook, value, CTA" },
      { icon: Layers,       name: "Carousel Add Slides",     cost: 3,  desc: "Adds more slides to an existing carousel" },
      { icon: Layers,       name: "Carousel Refine",         cost: 3,  desc: "AI rewrites all slides based on your prompt" },
      { icon: Palette,      name: "Carousel Image Gen",      cost: 3,  desc: "Generates AI images for carousel slides" },
      { icon: Film,         name: "Story Generator",         cost: 2,  desc: "Creates Instagram Story sequences" },
      { icon: Hash,         name: "Hashtag Suggestions",     cost: 1,  desc: "AI-powered hashtag recommendations" },
    ],
  },
  {
    category: "Analysis & Research",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
    tools: [
      { icon: Target,       name: "Competitor Analysis",     cost: 12, desc: "Full 9-section deep-dive competitor report" },
      { icon: Search,       name: "Niche Intelligence",      cost: 12, desc: "Complete niche analysis with 9 sections" },
      { icon: Scissors,     name: "Reel vs Reel Compare",    cost: 5,  desc: "Head-to-head comparison of two reels" },
      { icon: Flame,        name: "Steal Strategy Plan",     cost: 10, desc: "30-day content plan from competitor's playbook" },
      { icon: Dna,          name: "Content DNA Analysis",    cost: 7,  desc: "Reverse-engineers a creator's methodology" },
      { icon: TrendingUp,   name: "Content Report",          cost: 8,  desc: "AI analysis of your content performance" },
      { icon: Youtube,      name: "YouTube Content Analysis",cost: 3,  desc: "Analyses a YouTube channel's content" },
      { icon: Instagram,    name: "Instagram Analysis",      cost: 4,  desc: "Analyses an Instagram profile's content" },
    ],
  },
  {
    category: "Brand & Strategy",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.2)",
    tools: [
      { icon: Palette,      name: "Brand Kit Builder",       cost: 6,  desc: "Full brand identity — colours, fonts, voice" },
      { icon: Users,        name: "ICP Builder",             cost: 6,  desc: "Builds your Ideal Customer Profile" },
      { icon: Brain,        name: "Audience Psychology Map", cost: 6,  desc: "Maps buying triggers and emotional angles" },
      { icon: ClipboardList,name: "SOP Generator",           cost: 7,  desc: "Builds your complete content operating system" },
      { icon: Map,          name: "AI Content Planner",      cost: 7,  desc: "Full weekly content execution plan" },
      { icon: Map,          name: "Content Planner Regen",   cost: 3,  desc: "Regenerates a single day in your plan" },
      { icon: BookOpen,     name: "Lead Magnet Generator",   cost: 6,  desc: "Creates guides, checklists & eBooks" },
    ],
  },
  {
    category: "AI Tools & Coaching",
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.2)",
    tools: [
      { icon: Brain,        name: "AI Content Coach",        cost: 2,  desc: "Per message in the AI coaching chat" },
      { icon: Zap,          name: "Virality Tester",         cost: 4,  desc: "Scores your content for viral potential" },
      { icon: Zap,          name: "Viral Hooks",             cost: 2,  desc: "Generates scroll-stopping hook variations" },
      { icon: Wand2,        name: "Script Rewrite",          cost: 2,  desc: "Rewrites your script for better performance" },
      { icon: Zap,          name: "Viral Angles",            cost: 3,  desc: "Finds unique content angles for your niche" },
      { icon: MessageSquare,name: "Methodology Tool",        cost: 2,  desc: "Per use of content improvement tools" },
    ],
  },
  {
    category: "Video & Clips",
    color: "#f472b6",
    bg: "rgba(244,114,182,0.08)",
    border: "rgba(244,114,182,0.2)",
    tools: [
      { icon: Film,         name: "Video Editor Chat",       cost: 2,  desc: "Per AI message in the video editor" },
      { icon: Scissors,     name: "Clip Finder (YouTube)",   cost: 5,  desc: "Analyses YouTube video for viral clips" },
      { icon: Scissors,     name: "Clip Finder (Upload)",    cost: 7,  desc: "Transcribes & analyses uploaded video" },
    ],
  },
  {
    category: "Tracking & Growth",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.2)",
    tools: [
      { icon: Instagram,    name: "IG Growth Tracker Scan",  cost: 1,  desc: "Per follower snapshot scan" },
      { icon: BarChart2,    name: "Jarvis AI",               cost: 2,  desc: "Per message with Jarvis assistant" },
    ],
  },
];

export default function Credits() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const plan = (user as any)?.plan || "free";

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/credits"] });

  const total = data ? data.balance.monthlyCredits + data.balance.bonusCredits : 0;
  const planAllowance = PLAN_MONTHLY[plan] ?? 20;
  const monthlyUsed = planAllowance - (data?.balance.monthlyCredits ?? planAllowance);
  const usedPercent = planAllowance > 0 ? Math.min(100, Math.round((monthlyUsed / planAllowance) * 100)) : 0;

  const formatTxType = (type: string) => {
    const map: Record<string, string> = {
      monthly_reset: "Monthly Refill", period_reset: "Period Refill",
      plan_activated: "Plan Activated", bonus_added: "Bonus Credits Added",
      referral_bonus: "Referral Bonus", welcome_bonus: "Welcome Bonus",
      ai_ideas: "AI Content Ideas", ai_coach: "AI Coach",
      competitor: "Competitor Analysis", ai_report: "Content Report",
      virality: "Virality Tester", hashtag_suggestions: "Hashtag Suggestions",
      carousel: "Carousel Studio", carousel_image: "Carousel Image",
      lead_magnet: "Lead Magnet", brand_kit: "Brand Kit",
      story: "Story Generator", icp: "ICP Builder",
      sop: "SOP Generator", audience_psychology: "Audience Psychology",
      content_planner: "Content Planner", video_editor: "Video Editor",
      clip_finder: "Clip Finder", ig_tracker: "IG Tracker Scan",
      analyse: "Content Analysis", methodology: "Content DNA",
      competitor_reels: "Reel Comparison", steal_strategy: "Steal Strategy",
      niche_analysis: "Niche Intelligence", jarvis: "Jarvis AI",
    };
    return map[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-pulse max-w-5xl mx-auto">
      <div className="h-8 bg-zinc-800 rounded w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700">
            <ArrowLeft className="w-4 h-4 text-zinc-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Credits</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Your AI credit balance, usage history & full tool breakdown</p>
          </div>
        </div>
        <Badge className="text-sm px-3 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700">
          {PLAN_LABELS[plan] || plan}
        </Badge>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/60">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Available</p>
          <p className="text-4xl font-bold text-white">{total}</p>
          <p className="text-zinc-500 text-sm mt-1">credits remaining</p>
        </div>
        <div className="rounded-2xl p-5 border bg-zinc-900/60" style={{ borderColor: "rgba(212,180,97,0.3)" }}>
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Monthly Credits</p>
          <p className="text-4xl font-bold" style={{ color: GOLD }}>{data?.balance.monthlyCredits ?? 0}</p>
          <p className="text-zinc-500 text-sm mt-1">of {planAllowance === 99999 ? "∞" : planAllowance} this month</p>
          {planAllowance !== 99999 && (
            <div className="mt-2">
              <Progress value={100 - usedPercent} className="h-1.5 bg-zinc-700" />
              <p className="text-zinc-600 text-[10px] mt-1">{monthlyUsed} used · {data?.balance.monthlyCredits ?? 0} left</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl p-5 border border-purple-500/20 bg-zinc-900/60">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Bonus Credits</p>
          <p className="text-4xl font-bold text-purple-400">{data?.balance.bonusCredits ?? 0}</p>
          <p className="text-zinc-500 text-sm mt-1">from referrals & bonuses</p>
        </div>
      </div>

      {/* How credits work */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "rgba(212,180,97,0.04)", borderColor: "rgba(212,180,97,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4" style={{ color: GOLD }} />
          <h2 className="text-base font-bold text-white">How Credits Work</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: "🔄", title: "Monthly Reset", desc: "Your plan credits reset every month automatically. Unused credits don't roll over." },
            { icon: "⚡", title: "Per Tool Use", desc: "Each time you use an AI tool, credits are deducted based on how heavy the task is." },
            { icon: "🎁", title: "Bonus Credits", desc: "Earn bonus credits through referrals. These stack on top of your monthly allowance." },
            { icon: "👑", title: "Elite = Unlimited", desc: "Elite tier users have unlimited credits — no cap, no restrictions on any tool." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800">
              <span className="text-2xl">{icon}</span>
              <p className="text-sm font-bold text-white mt-2 mb-1">{title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Plan comparison */}
        <div className="rounded-xl overflow-hidden border border-zinc-800 mt-2">
          <div className="grid grid-cols-5 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-4 py-2 border-b border-zinc-800">
            <span className="text-left">Plan</span>
            <span>Price</span>
            <span>Monthly Credits</span>
            <span>~Tool Uses</span>
            <span>Best For</span>
          </div>
          {[
            { plan: "Free",    price: "$0",    credits: 20,    uses: "4-5",   best: "Trying it out",       color: "#71717a", current: plan === "free" },
            { plan: "Starter", price: "$29/mo", credits: 100,  uses: "15-20", best: "Consistent creators", color: "#818cf8", current: plan === "starter" },
            { plan: "Growth",  price: "$59/mo", credits: 250,  uses: "35-50", best: "Daily creators",      color: GOLD,      current: plan === "growth" },
            { plan: "Pro",     price: "$79/mo", credits: 500,  uses: "70-100",best: "Heavy users",         color: "#34d399", current: plan === "pro" },
            { plan: "Elite",   price: "Custom", credits: 99999, uses: "∞",    best: "Done-with-you",       color: GOLD,      current: plan === "elite" },
          ].map(({ plan: p, price, credits, uses, best, color, current }) => (
            <div key={p} className={`grid grid-cols-5 text-center text-xs px-4 py-3 border-b border-zinc-800/50 last:border-0 ${current ? "bg-zinc-800/40" : ""}`}>
              <span className="text-left font-bold" style={{ color }}>{p} {current && <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded ml-1">You</span>}</span>
              <span className="text-zinc-400">{price}</span>
              <span className="font-bold text-white">{credits === 99999 ? "∞" : credits}</span>
              <span className="text-zinc-400">{uses}</span>
              <span className="text-zinc-500">{best}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full tool cost breakdown */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: GOLD }} />
          Credits Per Tool — Full Breakdown
        </h2>
        <div className="space-y-4">
          {TOOL_COSTS.map(({ category, color, bg, border, tools }) => (
            <div key={category} className="rounded-2xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: border }}>
                <p className="text-sm font-bold" style={{ color }}>{category}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/40">
                {tools.map(({ icon: Icon, name, cost, desc }) => (
                  <div key={name} className="flex items-start gap-3 px-5 py-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}18` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}20`, color }}>
                          {cost} cr
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/60">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            Credit History
          </h2>
          <span className="text-xs text-zinc-500">{data?.transactions?.length ?? 0} transactions</span>
        </div>
        {!data?.transactions?.length ? (
          <div className="text-center py-12">
            <Zap className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">No activity yet — start using AI tools to see your history.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {data.transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tx.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    {tx.amount > 0
                      ? <ArrowUpCircle className="w-4 h-4 text-green-400" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{formatTxType(tx.type)}</p>
                    {tx.description && <p className="text-xs text-zinc-500">{tx.description}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`font-bold text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                  <p className="text-zinc-600 text-[10px] mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {plan !== "pro" && plan !== "elite" && (
        <div className="rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4" style={{ background: "rgba(212,180,97,0.07)", border: "1px solid rgba(212,180,97,0.25)" }}>
          <div>
            <p className="text-white font-bold">Need more credits?</p>
            <p className="text-zinc-400 text-sm mt-0.5">
              {plan === "free"
                ? "Upgrade to Starter for 100 credits/month — 5× more than free."
                : plan === "starter"
                ? "Upgrade to Growth for 250 credits/month — 2.5× more than Starter."
                : "Upgrade to Pro for 500 credits/month — 2× more than Growth."}
            </p>
          </div>
          <Button className="text-black font-bold shrink-0" style={{ background: GOLD }}
            onClick={() => navigate("/select-plan")}>
            <Crown className="w-4 h-4 mr-2" /> Upgrade Plan
          </Button>
        </div>
      )}
    </div>
  );
}
