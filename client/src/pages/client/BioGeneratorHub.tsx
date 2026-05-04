import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import {
  User, ChevronLeft, Wand2, TrendingUp, FileText, Users
} from "lucide-react";

const BIO_TOOLS = [
  {
    id: "generate",
    title: "Generate from Scratch",
    description: "AI creates your bio using the 4-line framework with niche-specific positioning",
    icon: Wand2,
    color: "#d4b461",
    route: "/tools/bio-generator/generate",
    badge: "Most Popular"
  },
  {
    id: "improve",
    title: "Improve Existing Bio",
    description: "Paste your current bio and get AI-powered improvements with scoring",
    icon: TrendingUp,
    color: "#22c55e",
    route: "/tools/bio-generator/improve",
  },
  {
    id: "templates",
    title: "Template Selector",
    description: "Choose from 15+ proven bio templates, fill in blanks, and let AI polish",
    icon: FileText,
    color: "#6366f1",
    route: "/tools/bio-generator/templates",
  },
  {
    id: "competitor",
    title: "Competitor Analysis",
    description: "Analyze successful bios in your niche and generate similar ones for your brand",
    icon: Users,
    color: "#a855f7",
    route: "/tools/bio-generator/competitor",
  },
];

export default function BioGeneratorHub() {
  const [, navigate] = useLocation();

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/tools")}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />Tools
          </button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <User className="w-5 h-5" style={{ color: "#d4b461" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bio Generator Suite</h1>
            <p className="text-sm text-muted-foreground">Choose the tool that fits your needs</p>
          </div>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {BIO_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => navigate(tool.route)}
                className="group relative text-left p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(${parseInt(tool.color.slice(1, 3), 16)}, ${parseInt(tool.color.slice(3, 5), 16)}, ${parseInt(tool.color.slice(5, 7), 16)}, 0.05) 100%)`
                }}
              >
                {tool.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ background: `${tool.color}20`, color: tool.color }}>
                      {tool.badge}
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tool.color}15`, border: `1px solid ${tool.color}30` }}>
                    <Icon className="w-6 h-6" style={{ color: tool.color }} />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-bold text-white mb-1.5">{tool.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{tool.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <span className="text-xs font-semibold group-hover:translate-x-1 transition-transform" style={{ color: tool.color }}>
                    Launch Tool →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Help text */}
        <div className="mt-8 p-5 rounded-xl border border-zinc-800 bg-zinc-900/20">
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="font-bold text-zinc-300">Not sure which tool to use?</span> Start with "Generate from Scratch" if you're new, or "Improve Existing Bio" if you already have one. Templates are great for quick results, and Competitor Analysis helps you learn from successful accounts in your niche.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
