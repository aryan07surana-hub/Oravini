import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Anchor, Search, Copy, Check, RefreshCw, Wand2,
  Flame, HelpCircle, TrendingUp, Zap, Users,
  AlertTriangle, BookOpen, X, ChevronRight,
} from "lucide-react";

/* ── Tokens ────────────────────────────────────────────────────── */
const GOLD        = "#d4b461";
const GOLD_BG     = "rgba(212,180,97,0.08)";
const GOLD_BORDER = "rgba(212,180,97,0.22)";
const CARD        = "rgba(16,16,26,0.92)";
const BORDER      = "rgba(255,255,255,0.06)";
const BORDER_MED  = "rgba(255,255,255,0.10)";
const SURFACE     = "rgba(10,10,18,0.98)";

/* ── Hook categories ───────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",           label: "All",           icon: BookOpen,      color: "#94a3b8" },
  { id: "curiosity",     label: "Curiosity Gap", icon: HelpCircle,    color: "#a78bfa" },
  { id: "controversy",   label: "Hot Take",      icon: Flame,         color: "#fb923c" },
  { id: "number",        label: "Number / List", icon: TrendingUp,    color: "#4ade80" },
  { id: "story",         label: "Story Drop",    icon: BookOpen,      color: "#60a5fa" },
  { id: "pain",          label: "Pain Point",    icon: AlertTriangle, color: "#f87171" },
  { id: "social-proof",  label: "Social Proof",  icon: Users,         color: "#34d399" },
  { id: "transformation",label: "Before/After",  icon: Zap,           color: "#e879f9" },
  { id: "question",      label: "Question",      icon: HelpCircle,    color: "#fbbf24" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

/* ── Hook database ─────────────────────────────────────────────── */
interface HookTemplate {
  id: string;
  category: CategoryId;
  template: string;
  example: string;
  platforms: string[];
  power: number; // 1-10
}

const HOOKS: HookTemplate[] = [
  // CURIOSITY GAP
  { id: "cg1", category: "curiosity", template: "Nobody talks about [uncomfortable truth about X]", example: "Nobody talks about how most Instagram 'growth hacks' actually tank your reach.", platforms: ["instagram","twitter","linkedin"], power: 9 },
  { id: "cg2", category: "curiosity", template: "The [result] isn't about [what everyone thinks]. It's about [real reason].", example: "The viral post isn't about the content. It's about the first 3 seconds.", platforms: ["instagram","twitter","linkedin"], power: 8 },
  { id: "cg3", category: "curiosity", template: "I discovered [surprising thing] after [time period] of [activity].", example: "I discovered the real reason my account stalled after 2 years of daily posting.", platforms: ["instagram","youtube","linkedin"], power: 8 },
  { id: "cg4", category: "curiosity", template: "What [authority figure] never told you about [topic]", example: "What every marketing guru never told you about building an audience.", platforms: ["youtube","instagram","twitter"], power: 9 },
  { id: "cg5", category: "curiosity", template: "The [number]-second rule that changed how I [result]", example: "The 3-second rule that changed how I write every caption.", platforms: ["instagram","tiktok"], power: 8 },
  { id: "cg6", category: "curiosity", template: "Most people [common action]. The top [number]% [different action].", example: "Most creators post every day. The top 1% batch 30 days in 3 hours.", platforms: ["twitter","linkedin","instagram"], power: 9 },
  { id: "cg7", category: "curiosity", template: "Here's what happens when you [unusual action] for [time period]:", example: "Here's what happens when you DM your followers instead of posting for 7 days:", platforms: ["instagram","twitter"], power: 8 },
  { id: "cg8", category: "curiosity", template: "[Number] things I wish I knew before [milestone event]", example: "7 things I wish I knew before my first 10K on Instagram.", platforms: ["instagram","youtube","linkedin"], power: 7 },

  // HOT TAKES
  { id: "ht1", category: "controversy", template: "Unpopular opinion: [widely accepted belief] is actually [opposite].", example: "Unpopular opinion: posting more is actually destroying your reach.", platforms: ["twitter","instagram","linkedin"], power: 10 },
  { id: "ht2", category: "controversy", template: "I'm going to say what nobody in [industry] wants to admit:", example: "I'm going to say what nobody in the creator economy wants to admit:", platforms: ["twitter","linkedin"], power: 9 },
  { id: "ht3", category: "controversy", template: "Hot take: [common advice] is the worst thing you can do if [condition].", example: "Hot take: 'post consistently' is the worst advice if you're under 10K followers.", platforms: ["twitter","instagram"], power: 10 },
  { id: "ht4", category: "controversy", template: "Everyone told me to [advice]. I did the opposite. Here's what happened:", example: "Everyone told me to niche down. I did the opposite. Here's what happened:", platforms: ["twitter","linkedin","instagram"], power: 9 },
  { id: "ht5", category: "controversy", template: "[X] is not about [what people think]. And [industry] doesn't want you to know why.", example: "Going viral is not about quality content. And the algorithm doesn't want you to know why.", platforms: ["instagram","youtube"], power: 8 },
  { id: "ht6", category: "controversy", template: "The [advice everyone gives] advice is keeping [audience] stuck.", example: "The 'just be consistent' advice is keeping small creators stuck.", platforms: ["twitter","linkedin"], power: 9 },

  // NUMBER / LIST
  { id: "nl1", category: "number", template: "[Number] [things/rules/mistakes] that separate [beginner] from [expert]:", example: "5 rules that separate 1K-follower creators from 100K creators:", platforms: ["instagram","youtube","linkedin","twitter"], power: 8 },
  { id: "nl2", category: "number", template: "I spent [time] studying [number] [examples]. Here's what they all had in common:", example: "I spent 6 months studying 500 viral posts. Here's what they all had in common:", platforms: ["twitter","linkedin","instagram"], power: 9 },
  { id: "nl3", category: "number", template: "[Number] red flags your [thing] isn't working:", example: "6 red flags your content strategy isn't working:", platforms: ["instagram","linkedin"], power: 8 },
  { id: "nl4", category: "number", template: "[Number] things I stopped doing to [result]:", example: "4 things I stopped doing to 10x my engagement.", platforms: ["instagram","twitter"], power: 8 },
  { id: "nl5", category: "number", template: "The [number]-step [process] that [result] in [timeframe]:", example: "The 5-step caption formula that doubled my saves in 30 days:", platforms: ["instagram","youtube","linkedin"], power: 9 },
  { id: "nl6", category: "number", template: "Save this. [Number] [frameworks/templates/scripts] you'll actually use:", example: "Save this. 8 DM scripts you'll actually use to close clients.", platforms: ["instagram"], power: 9 },

  // STORY DROP
  { id: "sd1", category: "story", template: "I was [situation] when [unexpected event] happened.", example: "I was about to quit posting when my worst-performing reel went viral.", platforms: ["instagram","linkedin","twitter"], power: 9 },
  { id: "sd2", category: "story", template: "[Time period] ago, I [failure/low point]. Today, [success].", example: "18 months ago, I had 200 followers. Today, I run a 6-figure creator business.", platforms: ["instagram","linkedin"], power: 10 },
  { id: "sd3", category: "story", template: "The [conversation/moment/email] that changed everything:", example: "The DM I got at 2am that changed my entire content strategy:", platforms: ["instagram","twitter","linkedin"], power: 8 },
  { id: "sd4", category: "story", template: "I never planned to [action]. Then [event] forced me to.", example: "I never planned to go full-time on content. Then my job was eliminated.", platforms: ["linkedin","instagram"], power: 8 },
  { id: "sd5", category: "story", template: "At [time], I made a [decision]. Here's exactly what happened next:", example: "At 11pm, I posted a caption I wrote in 5 minutes. Here's exactly what happened next:", platforms: ["twitter","instagram"], power: 9 },

  // PAIN POINT
  { id: "pp1", category: "pain", template: "If you've ever [frustrating experience], this is for you.", example: "If you've ever spent 4 hours on a post that got 12 likes, this is for you.", platforms: ["instagram","twitter","tiktok"], power: 9 },
  { id: "pp2", category: "pain", template: "You've been [action] wrong. And it's costing you [consequence].", example: "You've been using hashtags wrong. And it's costing you thousands of views.", platforms: ["instagram","youtube"], power: 9 },
  { id: "pp3", category: "pain", template: "The real reason [audience] [fail at thing] has nothing to do with [assumed reason].", example: "The real reason most creators burn out has nothing to do with posting too much.", platforms: ["instagram","twitter","linkedin"], power: 8 },
  { id: "pp4", category: "pain", template: "Stop [common action]. It's [negative consequence] without [missing piece].", example: "Stop posting Reels. It's wasted effort without this hook framework.", platforms: ["instagram","tiktok","twitter"], power: 9 },
  { id: "pp5", category: "pain", template: "Why is [audience] still [struggling with X] even after [effort]?", example: "Why are most creators still stuck at 1K followers even after a year of posting?", platforms: ["youtube","instagram","linkedin"], power: 8 },

  // SOCIAL PROOF
  { id: "sp1", category: "social-proof", template: "After [action] for [time/number of people], here's what actually works:", example: "After coaching 300+ creators in 2 years, here's what actually works:", platforms: ["linkedin","instagram","twitter"], power: 9 },
  { id: "sp2", category: "social-proof", template: "[Client/student] went from [before] to [after] in [timeframe] using [method].", example: "My client went from 0 to 50K followers in 90 days using this posting system.", platforms: ["instagram","linkedin"], power: 9 },
  { id: "sp3", category: "social-proof", template: "This [content piece] got [impressive result]. Here's the exact breakdown:", example: "This Reel got 2.3M views in 48 hours. Here's the exact breakdown:", platforms: ["instagram","youtube","twitter"], power: 10 },
  { id: "sp4", category: "social-proof", template: "[Number] people asked me how I [result]. The answer is simpler than you think:", example: "200+ people asked me how I built 100K followers with zero ads. The answer is simpler than you think:", platforms: ["twitter","instagram","linkedin"], power: 8 },

  // TRANSFORMATION
  { id: "tf1", category: "transformation", template: "Before [method]: [negative state]. After [method]: [positive state].", example: "Before this hook formula: 200 views per Reel. After: 50K average.", platforms: ["instagram","tiktok","twitter"], power: 10 },
  { id: "tf2", category: "transformation", template: "What changed when I switched from [old way] to [new way]:", example: "What changed when I switched from posting daily to posting 3x a week:", platforms: ["twitter","linkedin","instagram"], power: 8 },
  { id: "tf3", category: "transformation", template: "[Time] to go from [starting state] to [desired state] — here's the exact path:", example: "90 days to go from unknown creator to brand deals — here's the exact path:", platforms: ["youtube","instagram","linkedin"], power: 9 },
  { id: "tf4", category: "transformation", template: "I [specific change]. [Specific result] followed. Here's how:", example: "I rewrote my bio in 10 minutes. 400 new followers followed that week. Here's how:", platforms: ["instagram","twitter"], power: 9 },

  // QUESTION
  { id: "q1", category: "question", template: "What if [common assumption] is completely wrong?", example: "What if consistency is actually the wrong goal for small creators?", platforms: ["twitter","linkedin","instagram"], power: 8 },
  { id: "q2", category: "question", template: "Have you ever wondered why [observation]?", example: "Have you ever wondered why some creators blow up with 'bad' content?", platforms: ["instagram","youtube"], power: 7 },
  { id: "q3", category: "question", template: "What's the [one thing / real difference] between [person A] and [person B]?", example: "What's the real difference between a creator at 1K and a creator at 100K?", platforms: ["twitter","linkedin","instagram"], power: 8 },
  { id: "q4", category: "question", template: "Can you [achieve goal] without [painful sacrifice]? Turns out, yes.", example: "Can you grow on Instagram without filming your face? Turns out, yes.", platforms: ["instagram","youtube","twitter"], power: 9 },
  { id: "q5", category: "question", template: "What would happen if you [unusual action] for [time period]?", example: "What would happen if you replied to every comment for 30 days?", platforms: ["instagram","twitter"], power: 8 },
];

/* ── Copy button ───────────────────────────────────────────────── */
function CopyBtn({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className={`flex items-center gap-1 rounded-lg font-semibold transition-all ${size === "xs" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}`}
      style={copied
        ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
        : { background: "rgba(255,255,255,0.04)", color: "#71717a", border: `1px solid ${BORDER_MED}` }
      }>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ── Hook card ─────────────────────────────────────────────────── */
function HookCard({ hook, onCustomize }: { hook: HookTemplate; onCustomize: (h: HookTemplate) => void }) {
  const cat = CATEGORIES.find(c => c.id === hook.category)!;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border flex flex-col gap-3 p-4 group"
      style={{ background: CARD, borderColor: BORDER }}>
      {/* Category + power */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: cat.color + "18", color: cat.color }}>
          {cat.label}
        </span>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1 h-3 rounded-full transition-all"
              style={{ background: i < Math.round(hook.power / 2) ? GOLD : "rgba(255,255,255,0.07)" }} />
          ))}
        </div>
      </div>

      {/* Template */}
      <div>
        <p className="text-[11px] font-bold text-white leading-relaxed font-mono">{hook.template}</p>
      </div>

      {/* Example */}
      <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.025)", borderLeft: `2px solid ${cat.color}50` }}>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Example</p>
        <p className="text-[11px] text-zinc-300 leading-relaxed italic">"{hook.example}"</p>
      </div>

      {/* Platforms + actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1">
          {hook.platforms.map(p => (
            <span key={p} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-zinc-600"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {p}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyBtn text={hook.template} size="xs" />
          <button onClick={() => onCustomize(hook)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: GOLD_BG, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
            <Wand2 className="w-3 h-3" /> AI Customize
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Customize panel ───────────────────────────────────────────── */
function CustomizePanel({ hook, onClose }: { hook: HookTemplate; onClose: () => void }) {
  const { toast } = useToast();
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [results, setResults] = useState<Array<{ text: string; angle: string }>>([]);

  const customizeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ai/customize-hook", {
        template: hook.template,
        niche,
        platform,
        examples: hook.example,
      }).then(r => r.json()),
    onSuccess: (data: any) => {
      setResults(data.hooks || []);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] flex flex-col border-l"
      style={{ background: SURFACE, borderColor: BORDER_MED }}>
      <div className="flex items-center gap-3 p-5 border-b flex-shrink-0" style={{ borderColor: BORDER }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD_BG }}>
          <Wand2 className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">AI Hook Customizer</p>
          <p className="text-[10px] text-zinc-500">Adapt this hook for your niche</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/6 text-zinc-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Original */}
        <div className="rounded-xl p-3" style={{ background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD_BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Template</p>
          <p className="text-xs font-mono text-zinc-200 leading-relaxed">{hook.template}</p>
        </div>

        {/* Inputs */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Your Niche *</label>
          <Input value={niche} onChange={e => setNiche(e.target.value)}
            placeholder="e.g. fitness for busy moms, B2B SaaS marketing, personal finance..."
            className="h-9 text-xs"
            style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED, color: "#e4e4e7" }} />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Platform</label>
          <div className="flex gap-1.5 flex-wrap">
            {["instagram","twitter","linkedin","youtube","tiktok"].map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all capitalize"
                style={platform === p
                  ? { background: GOLD_BG, color: GOLD, borderColor: GOLD_BORDER }
                  : { background: "rgba(255,255,255,0.03)", color: "#52525b", borderColor: BORDER }
                }>
                {p}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => customizeMutation.mutate()} disabled={!niche.trim() || customizeMutation.isPending}
          className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: GOLD, color: "#000" }}>
          {customizeMutation.isPending
            ? <><RefreshCw className="w-4 h-4 animate-spin" />Customizing...</>
            : <><Wand2 className="w-4 h-4" />Generate 3 Variations</>}
        </button>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Your Custom Hooks</p>
              {results.map((r, i) => (
                <div key={i} className="rounded-xl border p-3.5 flex flex-col gap-2"
                  style={{ background: "rgba(255,255,255,0.025)", borderColor: BORDER_MED }}>
                  <p className="text-xs text-white font-semibold leading-relaxed">"{r.text}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-zinc-600 italic">{r.angle}</span>
                    <CopyBtn text={r.text} size="xs" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── MAIN PAGE ─────────────────────────────────────────────────── */
export default function HookLibraryPage() {
  const [category, setCategory] = useState<CategoryId>("all");
  const [search, setSearch]     = useState("");
  const [customizing, setCustomizing] = useState<HookTemplate | null>(null);

  const filtered = HOOKS.filter(h => {
    const q = search.toLowerCase();
    return (
      (category === "all" || h.category === category) &&
      (!search || h.template.toLowerCase().includes(q) || h.example.toLowerCase().includes(q))
    );
  });

  const catCounts: Record<string, number> = { all: HOOKS.length };
  for (const h of HOOKS) catCounts[h.category] = (catCounts[h.category] || 0) + 1;

  return (
    <ClientLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#08080f" }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 h-[52px] flex-shrink-0 border-b"
          style={{ background: "rgba(8,8,15,0.98)", borderColor: BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GOLD_BG }}>
              <Anchor className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">Hook Library</span>
            <span className="text-[10px] text-zinc-600">{HOOKS.length} proven hooks</span>
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search hooks..."
              className="pl-8 pr-8 py-1.5 rounded-xl text-xs border text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 w-52"
              style={{ background: "rgba(0,0,0,0.4)", borderColor: BORDER_MED }} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-zinc-500" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">

          {/* Category sidebar */}
          <div className="w-[200px] flex-shrink-0 flex flex-col border-r p-3 gap-1 overflow-y-auto"
            style={{ borderColor: BORDER }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const active = category === cat.id;
              return (
                <button key={cat.id} onClick={() => setCategory(cat.id as CategoryId)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left"
                  style={active
                    ? { background: cat.color + "18", color: cat.color }
                    : { color: "#52525b" }
                  }>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">{cat.label}</span>
                  <span className="text-[9px] font-bold opacity-60">{catCounts[cat.id] || 0}</span>
                </button>
              );
            })}

            <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
              <div className="rounded-xl p-3" style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                <p className="text-[10px] font-bold" style={{ color: GOLD }}>AI Customize</p>
                <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">Click "AI Customize" on any hook to generate versions for your niche.</p>
              </div>
            </div>
          </div>

          {/* Hook grid */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-sm font-bold text-white">
                {category === "all" ? "All Hooks" : CATEGORIES.find(c => c.id === category)?.label}
              </h2>
              <span className="text-xs text-zinc-600">{filtered.length} hooks</span>
              {search && (
                <span className="text-xs text-zinc-600">matching "{search}"</span>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-8 h-8 text-zinc-700 mb-3" />
                <p className="text-zinc-500 text-sm">No hooks match your search</p>
                <button onClick={() => { setSearch(""); setCategory("all"); }}
                  className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map(hook => (
                    <HookCard key={hook.id} hook={hook} onCustomize={h => setCustomizing(h)} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customize panel */}
      <AnimatePresence>
        {customizing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setCustomizing(null)} />
            <CustomizePanel hook={customizing} onClose={() => setCustomizing(null)} />
          </>
        )}
      </AnimatePresence>
    </ClientLayout>
  );
}
