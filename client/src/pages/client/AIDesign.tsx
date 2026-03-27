import { useState } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import CarouselStudio from "./CarouselStudio";
import {
  Layers, FileText, Image, Palette, Video, Sparkles, ChevronRight, ArrowLeft,
  Film, Users, Brain, ClipboardList, CalendarDays, ArrowRight, Zap,
} from "lucide-react";

// ── All hub tiles ─────────────────────────────────────────────────────────────
const MAIN_TOOLS = [
  {
    id: "carousel",
    label: "Carousel Generator",
    description: "AI writes your slides — hook, value, CTA — then you design and export as 1080×1080 PNG.",
    icon: Layers,
    route: null,
    accent: "#d4b461",
  },
  {
    id: "lead-magnet",
    label: "Lead Magnet Generator",
    description: "AI-written guides, checklists & eBooks — structured and export-ready as PDF.",
    icon: FileText,
    route: "/lead-magnet",
    accent: "#d4b461",
  },
  {
    id: "brand-kit",
    label: "Brand Kit Builder",
    description: "Brand identity system — colours, typography, voice, hooks and content strategy.",
    icon: Palette,
    route: "/brand-kit-builder",
    accent: "#d4b461",
  },
  {
    id: "story-generator",
    label: "Story Generator",
    description: "AI-built Instagram Story sequences — slides, CTAs, photo designer and variation ideas.",
    icon: Film,
    route: "/story-generator",
    badge: "New",
    accent: "#d4b461",
  },
  {
    id: "audience-psychology",
    label: "Audience Psychology",
    description: "ICP Builder + Psychology Map — know your buyer at a deep psychological level.",
    icon: Brain,
    route: null,
    badge: "2 Tools",
    accent: "#a78bfa",
  },
  {
    id: "sop-generator",
    label: "Content System Builder",
    description: "AI designs your complete operating system — workflow, execution steps, automation, and scaling.",
    icon: ClipboardList,
    route: "/sop-generator",
    badge: "New",
    accent: "#d4b461",
  },
];

const COMING_SOON = [
  { id: "thumbnail", label: "Thumbnail Maker", description: "Eye-catching thumbnails for YouTube & Instagram.", icon: Image },
  { id: "short-cover", label: "Short-form Cover Art", description: "Covers optimised for Reels, TikTok & Shorts.", icon: Video },
];

// ── Psychology sub-tools ──────────────────────────────────────────────────────
const PSYCHOLOGY_TOOLS = [
  {
    id: "icp-builder",
    label: "ICP Builder",
    description: "Build a deeply researched Ideal Customer Profile — demographics, psychographics, pain points and desired outcomes.",
    icon: Users,
    route: "/icp-builder",
    badge: "New",
    accent: "#60a5fa",
  },
  {
    id: "audience-psychology-map",
    label: "Audience Psychology Map",
    description: "Map buying behaviour, emotional triggers, limiting beliefs, identity shifts and messaging angles.",
    icon: Brain,
    route: "/audience-psychology-map",
    badge: "New",
    accent: "#a78bfa",
  },
];

// ── Reusable square tile ──────────────────────────────────────────────────────
function SquareTile({
  icon: Icon,
  label,
  description,
  badge,
  accent = "#d4b461",
  comingSoon = false,
  onClick,
  testId,
}: {
  icon: any;
  label: string;
  description: string;
  badge?: string;
  accent?: string;
  comingSoon?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  if (comingSoon) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed p-8 aspect-square text-center">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Coming Soon</span>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-800">
          <Icon className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-xs font-bold text-zinc-600 leading-snug">{label}</p>
      </div>
    );
  }

  const isViolet = accent !== "#d4b461";

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`group relative flex flex-col items-center justify-center gap-5 rounded-2xl border border-zinc-700 bg-zinc-900/60 cursor-pointer active:scale-95 transition-all duration-200 outline-none p-8 aspect-square text-center ${
        isViolet
          ? "hover:border-violet-500/50 hover:bg-zinc-900 hover:shadow-[0_0_32px_rgba(167,139,250,0.12)]"
          : "hover:border-primary/60 hover:bg-zinc-900 hover:shadow-[0_0_32px_rgba(212,180,97,0.14)]"
      }`}
    >
      {badge && (
        <span
          className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={
            isViolet
              ? { background: `${accent}25`, color: accent, border: `1px solid ${accent}40` }
              : { background: "#d4b461", color: "#000" }
          }
        >
          {badge}
        </span>
      )}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors"
        style={
          isViolet
            ? { background: `${accent}15`, border: `1px solid ${accent}30` }
            : { background: "rgba(212,180,97,0.1)" }
        }
      >
        <Icon className="w-8 h-8" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-base font-bold text-white leading-snug mb-1.5">{label}</p>
        <p className="text-xs text-zinc-500 leading-snug px-2">{description}</p>
      </div>
      <ChevronRight
        className="absolute bottom-4 right-4 w-4 h-4 transition-all"
        style={{ color: isViolet ? "transparent" : "transparent" }}
      />
    </button>
  );
}

// ── Psychology sub-landing ────────────────────────────────────────────────────
function PsychologyLanding({ onBack }: { onBack: () => void }) {
  const [, navigate] = useLocation();

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-10"
            data-testid="back-to-design-hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />AI Design Hub
          </button>

          {/* Header */}
          <div className="mb-12 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}
            >
              <Brain className="w-3.5 h-3.5" />Audience Psychology Mapping
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">
              Know your audience <span style={{ color: "#a78bfa" }}>inside out</span>
            </h1>
            <p className="text-zinc-400 text-base max-w-md mx-auto">
              Choose a tool below. Start with the ICP Builder, then run the Psychology Map for even deeper insights.
            </p>
          </div>

          {/* Two square tiles */}
          <div className="grid grid-cols-2 gap-5">
            {PSYCHOLOGY_TOOLS.map((tool) => (
              <SquareTile
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                description={tool.description}
                badge={tool.badge}
                accent={tool.accent}
                onClick={() => navigate(tool.route)}
                testId={`design-tool-${tool.id}`}
              />
            ))}
          </div>

          <p className="text-center text-xs text-zinc-600 mt-8">
            Both tools save automatically — view your history anytime inside each tool.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}

// ── Main hub ──────────────────────────────────────────────────────────────────
export default function AIDesign() {
  const [active, setActive] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleSelect = (tool: (typeof MAIN_TOOLS)[0]) => {
    if (tool.route) navigate(tool.route);
    else setActive(tool.id);
  };

  if (active === "carousel") {
    return (
      <div className="relative">
        <button
          onClick={() => setActive(null)}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-2 backdrop-blur"
          data-testid="back-to-design-hub"
        >
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

          {/* 3-column grid — 6 tools (2×3 perfect) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-10">
            {MAIN_TOOLS.map((tool) => (
              <SquareTile
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                description={tool.description}
                badge={tool.badge}
                accent={tool.accent}
                onClick={() => handleSelect(tool)}
                testId={`design-tool-${tool.id}`}
              />
            ))}
          </div>

          {/* ── Content Calendar — featured section ────────────────────────── */}
          <div className="mb-10">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-4 text-center">Content Strategy</p>
            <button
              onClick={() => navigate("/ai-content-planner")}
              data-testid="design-tool-content-planner"
              className="group w-full relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:border-primary/50 hover:shadow-[0_0_48px_rgba(212,180,97,0.18)] transition-all duration-300 overflow-hidden text-left p-7"
            >
              {/* Background glow orb */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #d4b461 0%, transparent 70%)" }} />

              <div className="relative flex items-start gap-6">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "rgba(212,180,97,0.15)", border: "1px solid rgba(212,180,97,0.3)" }}>
                  <CalendarDays className="w-8 h-8" style={{ color: "#d4b461" }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-black text-white tracking-tight">AI Content Planner</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "#d4b461", color: "#000" }}>New</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4 max-w-lg">
                    A complete weekly content execution system — not just ideas. Get content roles, scroll-stopping hooks, formats, and posting strategy built around your niche and goal.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Zap, text: "Role-based scheduling" },
                      { icon: Sparkles, text: "Scroll-stopping hooks" },
                      { icon: CalendarDays, text: "7-day plan" },
                      { icon: ArrowRight, text: "Regenerate any day" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.2)", color: "#d4b461" }}>
                        <Icon className="w-3 h-3" />{text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:translate-x-1" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)" }}>
                    <ArrowRight className="w-5 h-5" style={{ color: "#d4b461" }} />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Coming soon */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-4 text-center">Coming Soon</p>
            <div className="grid grid-cols-2 gap-4">
              {COMING_SOON.map((tool) => (
                <SquareTile
                  key={tool.id}
                  icon={tool.icon}
                  label={tool.label}
                  description={tool.description}
                  comingSoon
                />
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-700 mt-10">More design tools are being added every sprint.</p>
        </div>
      </div>
    </ClientLayout>
  );
}
