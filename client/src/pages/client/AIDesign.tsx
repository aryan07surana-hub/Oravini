import { useState } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import CarouselStudio from "./CarouselStudio";
import {
  Layers, FileText, Image, Palette, Video, Sparkles, ChevronRight, ArrowLeft,
  Film, Users, Brain,
} from "lucide-react";

const MAIN_TOOLS = [
  {
    id: "carousel",
    label: "Carousel Generator",
    description: "Build stunning multi-slide carousels with AI-written copy and custom branding.",
    icon: Layers,
    route: null,
  },
  {
    id: "lead-magnet",
    label: "Lead Magnet Generator",
    description: "Create high-converting guides, checklists & eBooks — fully designed and export-ready as PDF.",
    icon: FileText,
    route: "/lead-magnet",
  },
  {
    id: "brand-kit",
    label: "Brand Kit Builder",
    description: "Complete brand identity system — colours, typography, content strategy, hooks and application rules.",
    icon: Palette,
    route: "/brand-kit-builder",
  },
  {
    id: "story-generator",
    label: "Story Generator",
    description: "AI-built Instagram Story sequences — slide-by-slide breakdown, photo upload designer, CTA and variation ideas.",
    icon: Film,
    route: "/story-generator",
    badge: "New",
  },
];

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
    description: "Map your audience's buying behaviour, identity, emotional triggers, limiting beliefs, messaging angles and content strategy.",
    icon: Brain,
    route: "/audience-psychology-map",
    badge: "New",
    accent: "#a78bfa",
  },
];

const COMING_SOON = [
  { id: "thumbnail", label: "Thumbnail Maker", description: "Eye-catching thumbnails for YouTube, Instagram & more.", icon: Image },
  { id: "short-cover", label: "Short-form Cover Art", description: "Covers optimised for Reels, TikTok and YouTube Shorts.", icon: Video },
];

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
          <div className="grid grid-cols-2 gap-5 mb-14">
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

          {/* ── Audience Psychology Mapping section ── */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-white">Audience Psychology Mapping</span>
              </div>
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider bg-violet-900/30 border border-violet-700/30 px-2.5 py-0.5 rounded-full">Strategy Tools</span>
            </div>
            <p className="text-xs text-zinc-500 mb-5 max-w-lg">
              Go beyond surface-level targeting. These tools use behavioral psychology and direct response strategy to map exactly who your customer is, what drives them, and how to reach them.
            </p>
            <div className="grid grid-cols-2 gap-5">
              {PSYCHOLOGY_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button key={tool.id} data-testid={`design-tool-${tool.id}`} onClick={() => navigate(tool.route)}
                    className="group relative flex flex-col items-center justify-center gap-5 rounded-2xl border border-zinc-700 bg-zinc-900/60 hover:border-violet-500/40 hover:bg-zinc-900 hover:shadow-[0_0_32px_rgba(167,139,250,0.10)] cursor-pointer active:scale-95 transition-all duration-200 outline-none p-8 aspect-square text-center">
                    <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: tool.accent + "22", color: tool.accent, border: `1px solid ${tool.accent}40` }}>
                      {tool.badge}
                    </span>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors" style={{ background: tool.accent + "15" }}>
                      <Icon className="w-8 h-8" style={{ color: tool.accent }} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white leading-snug mb-1.5">{tool.label}</p>
                      <p className="text-xs text-zinc-500 leading-snug px-2">{tool.description}</p>
                    </div>
                    <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: tool.accent }} />
                  </button>
                );
              })}
            </div>
          </div>

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
