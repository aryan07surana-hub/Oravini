import { useState } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import CarouselStudio from "./CarouselStudio";
import {
  Layers, Wand2, Image, Palette, Video, Sparkles, ChevronRight, ArrowLeft,
} from "lucide-react";

interface DesignTool {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  available: boolean;
}

const TOOLS: DesignTool[] = [
  {
    id: "carousel",
    label: "Carousel Generator",
    description: "Build stunning multi-slide carousels with AI-written copy and custom branding.",
    icon: Layers,
    available: true,
  },
  {
    id: "thumbnail",
    label: "Thumbnail Maker",
    description: "Generate eye-catching thumbnails for YouTube, Instagram & more.",
    icon: Image,
    badge: "Coming Soon",
    available: false,
  },
  {
    id: "brand-kit",
    label: "Brand Kit Builder",
    description: "Create a consistent visual identity: colors, fonts, and style guides.",
    icon: Palette,
    badge: "Coming Soon",
    available: false,
  },
  {
    id: "short-cover",
    label: "Short-form Cover Art",
    description: "Design covers and overlays optimised for Reels, TikTok and YouTube Shorts.",
    icon: Video,
    badge: "Coming Soon",
    available: false,
  },
];

export default function AIDesign() {
  const [active, setActive] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleSelect = (tool: DesignTool) => {
    if (!tool.available) return;
    setActive(tool.id);
  };

  if (active === "carousel") {
    return (
      <div className="relative">
        <button
          onClick={() => setActive(null)}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-2 backdrop-blur"
          data-testid="back-to-design-hub"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          AI Design Hub
        </button>
        <CarouselStudio embedded />
      </div>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-12">

          {/* ── Header ── */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              AI Design Studio
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">
              Design with <span className="text-primary">AI</span>
            </h1>
            <p className="text-zinc-400 text-base max-w-lg mx-auto">
              Choose a design tool below to create branded content in minutes — no design experience needed.
            </p>
          </div>

          {/* ── Tool Grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isDisabled = !tool.available;
              return (
                <button
                  key={tool.id}
                  data-testid={`design-tool-${tool.id}`}
                  onClick={() => handleSelect(tool)}
                  disabled={isDisabled}
                  className={[
                    "group relative flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 aspect-square text-center transition-all duration-200 outline-none",
                    isDisabled
                      ? "border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed"
                      : "border-zinc-700 bg-zinc-900/60 hover:border-primary/60 hover:bg-zinc-900 hover:shadow-[0_0_24px_rgba(212,180,97,0.12)] cursor-pointer active:scale-95",
                  ].join(" ")}
                >
                  {/* Badge */}
                  {tool.badge && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {tool.badge}
                    </span>
                  )}

                  {/* Icon */}
                  <div className={[
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    isDisabled ? "bg-zinc-800" : "bg-primary/10 group-hover:bg-primary/20",
                  ].join(" ")}>
                    <Icon className={["w-7 h-7 transition-colors", isDisabled ? "text-zinc-600" : "text-primary"].join(" ")} />
                  </div>

                  {/* Label */}
                  <div>
                    <p className={["text-sm font-bold leading-snug", isDisabled ? "text-zinc-600" : "text-white"].join(" ")}>
                      {tool.label}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-snug px-1">
                      {tool.description}
                    </p>
                  </div>

                  {/* Arrow hint on hover */}
                  {!isDisabled && (
                    <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-primary/0 group-hover:text-primary/50 transition-colors" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Footer note ── */}
          <p className="text-center text-xs text-zinc-600 mt-10">
            More design tools are being added every sprint.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
