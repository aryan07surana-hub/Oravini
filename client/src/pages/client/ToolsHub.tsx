import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { ClipboardList, ChevronRight, LayoutTemplate } from "lucide-react";

const GOLD = "#d4b461";

const TOOLS = [
  {
    id: "quiz-survey",
    label: "Quiz & Survey",
    description: "Build multi-step forms, quizzes and lead-capture surveys with a visual builder.",
    icon: ClipboardList,
    route: "/tools/forms",
  },
  {
    id: "board-builder",
    label: "Board Builder",
    description: "Paste your script and auto-generate a visual board with timelines, comparisons and steps — perfect for YouTube.",
    icon: LayoutTemplate,
    route: "/tools/board-builder",
  },
];

const COMING_SOON: { id: string; label: string; description: string; icon: any }[] = [];

function SquareTile({
  icon: Icon,
  label,
  description,
  comingSoon = false,
  onClick,
  testId,
}: {
  icon: any;
  label: string;
  description: string;
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

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="group relative flex flex-col items-center justify-center gap-5 rounded-2xl border border-zinc-700 bg-zinc-900/60 cursor-pointer active:scale-95 transition-all duration-200 outline-none p-8 aspect-square text-center hover:border-primary/60 hover:bg-zinc-900 hover:shadow-[0_0_32px_rgba(212,180,97,0.14)]"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors"
        style={{ background: "rgba(212,180,97,0.1)" }}
      >
        <Icon className="w-8 h-8" style={{ color: GOLD }} />
      </div>
      <div>
        <p className="text-base font-bold text-white leading-snug mb-1.5">{label}</p>
        <p className="text-xs text-zinc-500 leading-snug px-2">{description}</p>
      </div>
      <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function ToolsHub() {
  const [, navigate] = useLocation();

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="mb-12 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30`, color: GOLD }}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Tools Platform
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">
              Your <span style={{ color: GOLD }}>toolkit</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
              Everything you need to capture leads, run surveys, and engage your audience — all in one place.
            </p>
          </div>

          {/* Active tools grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {TOOLS.map(tool => (
              <SquareTile
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                description={tool.description}
                testId={`tool-tile-${tool.id}`}
                onClick={() => navigate(tool.route)}
              />
            ))}
            {COMING_SOON.map(tool => (
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
      </div>
    </ClientLayout>
  );
}
