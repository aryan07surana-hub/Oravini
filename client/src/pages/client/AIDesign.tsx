import { useState } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import CarouselStudio from "./CarouselStudio";
import {
  Layers, FileText, Image, Palette, Video, Sparkles, ChevronRight, ArrowLeft,
  Film, Users, Brain, Target, TrendingUp, AlertCircle, MessageSquare,
  Lightbulb, Eye, Zap, ShieldAlert, BarChart3,
} from "lucide-react";

const MAIN_TOOLS = [
  {
    id: "carousel",
    label: "Carousel Generator",
    description: "AI writes your slides — hook, value slides, CTA — then you customise design, fonts and colours. Export as 1080×1080 PNG.",
    icon: Layers,
    route: null,
  },
  {
    id: "lead-magnet",
    label: "Lead Magnet Generator",
    description: "Create high-converting guides, checklists & eBooks — AI-written content, structured layout, export-ready as PDF.",
    icon: FileText,
    route: "/lead-magnet",
  },
  {
    id: "brand-kit",
    label: "Brand Kit Builder",
    description: "Complete brand identity system — colours, typography, voice, content strategy, hooks and application rules tailored to your business.",
    icon: Palette,
    route: "/brand-kit-builder",
  },
  {
    id: "story-generator",
    label: "Story Generator",
    description: "AI-built Instagram Story sequences — slide-by-slide breakdown, photo upload designer, engagement CTAs and variation ideas.",
    icon: Film,
    route: "/story-generator",
    badge: "New",
  },
];

const COMING_SOON = [
  { id: "thumbnail", label: "Thumbnail Maker", description: "Eye-catching thumbnails for YouTube, Instagram & more.", icon: Image },
  { id: "short-cover", label: "Short-form Cover Art", description: "Covers optimised for Reels, TikTok and YouTube Shorts.", icon: Video },
];

// ── Psychology sub-tools shown inside the Audience Psychology landing ──────────
const PSYCHOLOGY_TOOLS = [
  {
    id: "icp-builder",
    label: "ICP Builder",
    route: "/icp-builder",
    accent: "#60a5fa",
    icon: Users,
    badge: "New",
    tagline: "Know your buyer better than they know themselves",
    description: "Stop guessing who your ideal customer is. The ICP Builder uses behavioral psychology and direct response strategy to build a fully researched Ideal Customer Profile — covering every layer of who they are, what they want, and why they buy.",
    whatYouGet: [
      { icon: Target, label: "Positioning Statement", text: "A razor-sharp one-liner that defines who you help and why they should choose you." },
      { icon: Users, label: "Demographics", text: "Age range, profession, income level, education, location — the surface layer of your buyer." },
      { icon: Brain, label: "Psychographics", text: "Their core beliefs, values, deep aspirations, and the fears that keep them up at night." },
      { icon: AlertCircle, label: "Pain Points (scored)", text: "5 deep pain points — each with the situation, emotional weight, and real cost of inaction." },
      { icon: TrendingUp, label: "Desired Outcomes", text: "Dream outcome, short-term desires, long-term vision, and how they define success for themselves." },
      { icon: Eye, label: "Current Situation", text: "Their daily life, what they've already tried, why it failed, and their repeated frustrations." },
    ],
    bestFor: ["Online coaches & consultants", "Course creators", "SaaS & digital products", "Personal brands", "E-commerce brands"],
    timeEstimate: "~45 seconds",
  },
  {
    id: "audience-psychology-map",
    label: "Audience Psychology Map",
    route: "/audience-psychology-map",
    accent: "#a78bfa",
    icon: Brain,
    badge: "New",
    tagline: "Map the psychology that drives every buying decision",
    description: "Go beyond demographics. The Audience Psychology Map uses buying science, identity theory and emotional mapping to reveal exactly what's happening inside your buyer's mind — so your content and offers feel like they were written specifically for them.",
    whatYouGet: [
      { icon: ShieldAlert, label: "Buyer Clarity", text: "Awareness stage, what triggers them to search, what makes them say yes, trust builders, and proof they need." },
      { icon: Eye, label: "Identity Mapping", text: "How they see themselves now, how they want to be seen, and the identity shift your offer needs to create." },
      { icon: Zap, label: "Emotional Landscape", text: "Core emotions they feel daily, emotional highs and lows, limiting beliefs, empowering beliefs, and false assumptions." },
      { icon: MessageSquare, label: "Word-for-Word Phrases", text: "Exact sentences they think or say — pull these directly into your captions, hooks and sales copy." },
      { icon: Lightbulb, label: "Messaging Angles", text: "Resonant angles, the immediate attention hook, phrases to avoid, and your most compelling promise." },
      { icon: BarChart3, label: "Content Direction", text: "10 ready-to-post content ideas, scroll-stopping hooks, offer angles and positioning suggestions." },
    ],
    bestFor: ["Content creators", "Personal brands", "High-ticket coaches", "Sales copywriters", "Founders building an audience"],
    timeEstimate: "~45 seconds",
  },
];

// ── Inner Psychology Landing ───────────────────────────────────────────────────
function PsychologyLanding({ onBack }: { onBack: () => void }) {
  const [, navigate] = useLocation();
  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-8"
          data-testid="back-to-design-hub"
        >
          <ArrowLeft className="w-3.5 h-3.5" />AI Design Hub
        </button>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)" }}>
            <Brain className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>Audience Psychology Mapping</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-3">
            Know your audience <span style={{ color: "#a78bfa" }}>at a psychological level</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            These two tools work together. Start with the ICP Builder to map who your customer is — then run the Audience Psychology Map to understand how they think, what they feel, and exactly what messaging will make them act.
          </p>
        </div>

        {/* Recommended flow banner */}
        <div className="rounded-xl border mb-10 px-5 py-4 flex items-center gap-4" style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold text-blue-400">1</div>
              ICP Builder
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" }}>2</div>
              Audience Psychology Map
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-xs text-zinc-500">Paste ICP results → get even deeper psychology insights</span>
          </div>
          <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "#a78bfa" }} />
        </div>

        {/* Tool cards */}
        <div className="space-y-6">
          {PSYCHOLOGY_TOOLS.map((tool, idx) => {
            const MainIcon = tool.icon;
            return (
              <div
                key={tool.id}
                className="rounded-2xl border overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: `${tool.accent}25` }}
              >
                {/* Card header */}
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: tool.accent + "18", border: `1px solid ${tool.accent}35` }}>
                        <MainIcon className="w-6 h-6" style={{ color: tool.accent }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: tool.accent + "20", color: tool.accent, border: `1px solid ${tool.accent}35` }}>Step {idx + 1} · {tool.badge}</span>
                          <span className="text-[10px] text-zinc-500">{tool.timeEstimate}</span>
                        </div>
                        <h2 className="text-lg font-black text-white">{tool.label}</h2>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: tool.accent }}>{tool.tagline}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(tool.route)}
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:opacity-90 active:scale-95"
                      style={{ background: tool.accent }}
                      data-testid={`open-${tool.id}`}
                    >
                      Open <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-5">{tool.description}</p>
                </div>

                {/* What you get grid */}
                <div className="px-6 pb-5">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">What you get</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tool.whatYouGet.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div key={item.label} className="rounded-xl p-3" style={{ background: tool.accent + "08", border: `1px solid ${tool.accent}18` }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <ItemIcon className="w-3 h-3 flex-shrink-0" style={{ color: tool.accent }} />
                            <span className="text-[10px] font-bold text-white">{item.label}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-snug">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Best for */}
                <div className="px-6 pb-5 pt-1 border-t" style={{ borderColor: `${tool.accent}15` }}>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Best for</p>
                  <div className="flex flex-wrap gap-2">
                    {tool.bestFor.map(tag => (
                      <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ background: tool.accent + "10", color: tool.accent, border: `1px solid ${tool.accent}25` }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-zinc-700 mt-8">Both tools save automatically — view your history anytime inside each tool.</p>
      </div>
    </ClientLayout>
  );
}

// ── Main AIDesign component ───────────────────────────────────────────────────
export default function AIDesign() {
  const [active, setActive] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleSelect = (tool: { id: string; route: string | null }) => {
    if (tool.route) { navigate(tool.route); }
    else { setActive(tool.id); }
  };

  if (active === "carousel") {
    return (
      <div className="relative">
        <button onClick={() => setActive(null)}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-2 backdrop-blur"
          data-testid="back-to-design-hub">
          <ArrowLeft className="w-3.5 h-3.5" />AI Design Hub
        </button>
        <CarouselStudio embedded />
      </div>
    );
  }

  if (active === "audience-psychology") {
    return <PsychologyLanding onBack={() => setActive(null)} />;
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />AI Design Studio
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">
              Design with <span className="text-primary">AI</span>
            </h1>
            <p className="text-zinc-400 text-base max-w-lg mx-auto">
              Choose a design tool below to create branded content in minutes — no design experience needed.
            </p>
          </div>

          {/* Main Tools — 2×2 grid */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            {MAIN_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button key={tool.id} data-testid={`design-tool-${tool.id}`} onClick={() => handleSelect(tool)}
                  className="group relative flex flex-col items-center justify-center gap-5 rounded-2xl border border-zinc-700 bg-zinc-900/60 hover:border-primary/60 hover:bg-zinc-900 hover:shadow-[0_0_32px_rgba(212,180,97,0.14)] cursor-pointer active:scale-95 transition-all duration-200 outline-none p-8 aspect-square text-center">
                  {"badge" in tool && tool.badge && (
                    <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider bg-primary text-black px-2 py-0.5 rounded-full">
                      {tool.badge}
                    </span>
                  )}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white leading-snug mb-1.5">{tool.label}</p>
                    <p className="text-xs text-zinc-500 leading-snug px-2">{tool.description}</p>
                  </div>
                  <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-primary/0 group-hover:text-primary/60 transition-colors" />
                </button>
              );
            })}
          </div>

          {/* Audience Psychology — full-width featured card */}
          <button
            onClick={() => setActive("audience-psychology")}
            data-testid="design-tool-audience-psychology"
            className="group w-full rounded-2xl border border-zinc-700 bg-zinc-900/60 hover:border-violet-500/50 hover:bg-zinc-900/80 hover:shadow-[0_0_40px_rgba(167,139,250,0.12)] cursor-pointer active:scale-[0.99] transition-all duration-200 outline-none p-7 mb-8 text-left flex items-center gap-6"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-violet-500/20" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}>
              <Brain className="w-8 h-8" style={{ color: "#a78bfa" }} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-black text-white">Audience Psychology Mapping</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }}>2 Tools Inside</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                Build your Ideal Customer Profile and map your audience's psychology — buying triggers, identity, emotional landscape, limiting beliefs, and word-for-word messaging angles. These two tools work together to give you a complete picture of your buyer.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#60a5fa" }}>
                  <Users className="w-3 h-3" />ICP Builder
                </div>
                <span className="text-zinc-700">·</span>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#a78bfa" }}>
                  <Brain className="w-3 h-3" />Audience Psychology Map
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 flex-shrink-0 text-zinc-700 group-hover:text-violet-400 transition-colors" />
          </button>

          {/* Coming Soon */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-4 text-center">Coming Soon</p>
            <div className="grid grid-cols-2 gap-4">
              {COMING_SOON.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed p-6 aspect-square text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Coming Soon</span>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-800">
                      <Icon className="w-6 h-6 text-zinc-600" />
                    </div>
                    <p className="text-xs font-bold text-zinc-600 leading-snug">{tool.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-700 mt-10">More design tools are being added every sprint.</p>
        </div>
      </div>
    </ClientLayout>
  );
}
