import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { useLocation } from "wouter";
import { X, ChevronLeft, ChevronRight, Bot, Sparkles, Map } from "lucide-react";

interface TourStep {
  id: string;
  route: string;
  target: string | null;
  title: string;
  description: string;
  tip?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    target: null,
    title: "Welcome to Brandverse",
    description: "I'm your AI guide. Let me walk you through every tool and feature — from content creation to tracking and beyond. This takes about 2 minutes and you can skip or exit at any time.",
    position: "center",
  },
  {
    id: "dashboard-stats",
    route: "/dashboard",
    target: '[data-tour="dashboard-stats"]',
    title: "Your Performance Stats",
    description: "This is your live performance overview — content views, follower growth, and program progress. Elite users see additional metrics like completed tasks and overall progress percentage.",
    position: "bottom",
  },
  {
    id: "quick-tools",
    route: "/dashboard",
    target: '[data-tour="quick-tools"]',
    title: "Quick Tools",
    description: "Your three core AI tools pinned here for instant access. Content Ideas generates scroll-stopping ideas. Content Coach gives personalised feedback. Video Editor enhances your clips.",
    position: "top",
  },
  {
    id: "content-ideas",
    route: "/ai-ideas",
    target: '[data-tour="ai-ideas-header"]',
    title: "Content Ideas",
    description: "Choose a platform — Instagram, YouTube, LinkedIn, X, or Twitter — enter your niche, and get 6 powerful, non-generic ideas tailored to your audience and goal. You can like, save, and schedule ideas directly. The Auto Schedule tab lets you post to connected platforms.",
    position: "bottom",
    tip: "Enter a hyper-specific niche like 'fitness for busy mums over 35' — the more specific, the better the ideas.",
  },
  {
    id: "content-coach",
    route: "/ai-coach",
    target: '[data-tour="coach-header"]',
    title: "Content Coach",
    description: "Your personal AI coaching assistant. Paste a script to get deep feedback, choose a coaching mode (Strict, Balanced, or Supportive), or use the Brand Builder and Roadmap Generator tools. Every session is saved in your history so you can pick up where you left off.",
    position: "bottom",
    tip: "Switch between Strict and Balanced mode to dial in how direct you want the feedback.",
  },
  {
    id: "video-editor",
    route: "/video-editor",
    target: '[data-tour="video-editor-main"]',
    title: "Video Editor",
    description: "Upload and edit video content with AI-powered tools. Add captions, trim clips, apply effects, and generate scripts for your videos — no professional editing experience needed.",
    position: "bottom",
  },
  {
    id: "design-studio",
    route: "/ai-design",
    target: '[data-tour="design-studio-main"]',
    title: "Design Studio",
    description: "Create professional carousels, thumbnails, social graphics, and stories using Canva's AI-powered tools — all built into your dashboard. Choose a format, enter your brief, and let the AI do the heavy lifting.",
    position: "bottom",
    tip: "Carousels on LinkedIn and Instagram consistently outperform single images for reach and saves.",
  },
  {
    id: "tracking",
    route: "/tracking",
    target: '[data-tour="tracking-home"]',
    title: "Tracking Hub",
    description: "Log your Instagram and YouTube post performance, track your sales conversations in the DM pipeline, and view your full content calendar. Elite users get detailed analytics reports and progress milestone tracking.",
    position: "bottom",
  },
  {
    id: "competitor-study",
    route: "/tracking/competitor",
    target: '[data-tour="competitor-main"]',
    title: "Competitor Study",
    description: "Analyse any creator or brand in your niche. Enter a handle or URL to see their top-performing content, spot patterns, and generate content ideas based on what is already working for them.",
    position: "bottom",
    tip: "Study 2-3 competitors who are 6-12 months ahead of you — not the biggest names in the niche.",
  },
  {
    id: "credits",
    route: "/credits",
    target: '[data-tour="credits-main"]',
    title: "Credits",
    description: "Credits power your AI requests — content ideas, coaching sessions, image generation, and more. You can top up anytime here. Elite users earn bonus credits each month automatically.",
    position: "bottom",
  },
  {
    id: "settings",
    route: "/settings/plan",
    target: '[data-tour="settings-main"]',
    title: "Your Plan & Settings",
    description: "Manage your account, upgrade your plan to unlock more tools, and connect your social platforms for auto-scheduling. Each tier unlocks more of the Brandverse toolkit — from basic content ideas all the way to full tracking, design, and coaching.",
    position: "bottom",
  },
  {
    id: "done",
    route: "/dashboard",
    target: null,
    title: "You are ready to go",
    description: "That is the full platform. Every tool is designed to work together — generate ideas, create content, track performance, and grow your brand. Start with Content Ideas or the Content Coach to hit the ground running. You can restart this tour anytime from your dashboard.",
    position: "center",
  },
];

interface TourContextType {
  startTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType>({ startTour: () => {}, isActive: false });

export function useTour() {
  return useContext(TourContext);
}

function TourMascot() {
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, #b89848 0%, #d4b461 50%, #f0d280 100%)",
        boxShadow: "0 0 18px rgba(212,180,97,0.55), 0 0 36px rgba(212,180,97,0.18)",
      }}
    >
      <Bot className="w-5 h-5 text-black" />
    </div>
  );
}

function SpotlightOverlay({ rect, onSkip }: { rect: DOMRect | null; onSkip: () => void }) {
  const pad = 12;

  if (!rect) {
    return (
      <div
        className="fixed inset-0"
        style={{ zIndex: 9994, background: "rgba(0,0,0,0.72)" }}
        onClick={onSkip}
      />
    );
  }

  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  return (
    <>
      <div className="fixed left-0 right-0 top-0" style={{ height: Math.max(0, y), background: "rgba(0,0,0,0.72)", zIndex: 9994 }} onClick={onSkip} />
      <div className="fixed left-0" style={{ top: Math.max(0, y), height: h, width: Math.max(0, x), background: "rgba(0,0,0,0.72)", zIndex: 9994 }} onClick={onSkip} />
      <div className="fixed right-0" style={{ top: Math.max(0, y), height: h, left: x + w, background: "rgba(0,0,0,0.72)", zIndex: 9994 }} onClick={onSkip} />
      <div className="fixed left-0 right-0 bottom-0" style={{ top: y + h, background: "rgba(0,0,0,0.72)", zIndex: 9994 }} onClick={onSkip} />
      <div
        className="fixed pointer-events-none"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          zIndex: 9995,
          borderRadius: 14,
          border: "2px solid #d4b461",
          boxShadow: "0 0 0 2px rgba(212,180,97,0.15), 0 0 24px rgba(212,180,97,0.35), inset 0 0 24px rgba(212,180,97,0.04)",
        }}
      />
    </>
  );
}

function TourCard({
  step,
  stepIndex,
  totalSteps,
  rect,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  rect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const isCentered = step.position === "center" || !rect;
  const pad = 12;
  const margin = 18;
  const cardW = 370;
  const cardH = 260;

  let cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    width: cardW,
    maxWidth: "92vw",
    background: "linear-gradient(160deg, rgba(20,16,36,0.99) 0%, rgba(12,10,22,0.99) 100%)",
    border: "1px solid rgba(212,180,97,0.22)",
    borderRadius: 18,
    boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 40px rgba(212,180,97,0.08)",
  };

  if (isCentered) {
    cardStyle = { ...cardStyle, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (rect) {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const spaceBelow = viewH - (rect.bottom + pad + margin);
    const spaceAbove = rect.top - pad - margin;

    let top: number;
    let left: number = Math.max(margin, Math.min(rect.left + rect.width / 2 - cardW / 2, viewW - cardW - margin));

    if (step.position === "top" && spaceAbove > cardH) {
      top = rect.top - pad - cardH - margin;
    } else if (spaceBelow > cardH) {
      top = rect.bottom + pad + margin;
    } else if (spaceAbove > cardH) {
      top = rect.top - pad - cardH - margin;
    } else {
      top = Math.max(margin, viewH / 2 - cardH / 2);
      left = Math.min(rect.right + margin, viewW - cardW - margin);
      if (left < margin) left = margin;
    }

    top = Math.max(margin, Math.min(top, viewH - cardH - margin));
    left = Math.max(margin, Math.min(left, viewW - cardW - margin));
    cardStyle = { ...cardStyle, top, left };
  }

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div style={cardStyle}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <TourMascot />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#d4b461" }}>
                Step {stepIndex + 1} of {totalSteps}
              </p>
              <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Exit tour">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-[15px] font-bold text-white mt-0.5 leading-snug">{step.title}</h3>
          </div>
        </div>

        <p className="text-[13px] text-zinc-400 leading-relaxed">{step.description}</p>

        {step.tip && (
          <div
            className="mt-3 p-3 rounded-xl"
            style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.14)" }}
          >
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              <span className="font-bold" style={{ color: "#d4b461" }}>Pro tip: </span>
              {step.tip}
            </p>
          </div>
        )}

        <div className="mt-4 mb-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #b89848, #d4b461)" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Exit tour
          </button>
          <div className="flex-1" />
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 text-[12px] text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#d4b461", color: "#000" }}
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, navigate] = useLocation();
  const busyRef = useRef(false);
  const currentStep = TOUR_STEPS[stepIndex];

  const locateTarget = useCallback(async (target: string | null) => {
    if (!target) { setRect(null); return; }
    let el: Element | null = null;
    for (let i = 0; i < 12; i++) {
      el = document.querySelector(target);
      if (el) break;
      await new Promise(r => setTimeout(r, 200));
    }
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise(r => setTimeout(r, 450));
      setRect((el as HTMLElement).getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, []);

  const goToStep = useCallback(async (index: number) => {
    if (busyRef.current) return;
    const s = TOUR_STEPS[index];
    if (!s) { setActive(false); return; }
    busyRef.current = true;
    setRect(null);
    setStepIndex(index);
    navigate(s.route);
    await new Promise(r => setTimeout(r, 450));
    await locateTarget(s.target);
    busyRef.current = false;
  }, [navigate, locateTarget]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    goToStep(0);
  }, [goToStep]);

  const next = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) goToStep(stepIndex + 1);
    else setActive(false);
  }, [stepIndex, goToStep]);

  const prev = useCallback(() => {
    if (stepIndex > 0) goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  const close = useCallback(() => {
    setActive(false);
    setRect(null);
  }, []);

  useEffect(() => {
    if (!active || !currentStep?.target) return;
    const update = () => {
      const el = document.querySelector(currentStep.target!);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, currentStep]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next, prev]);

  return (
    <TourContext.Provider value={{ startTour, isActive: active }}>
      {children}
      {active && currentStep && (
        <>
          <SpotlightOverlay rect={rect} onSkip={close} />
          <TourCard
            step={currentStep}
            stepIndex={stepIndex}
            totalSteps={TOUR_STEPS.length}
            rect={rect}
            onNext={next}
            onPrev={prev}
            onClose={close}
          />
        </>
      )}
    </TourContext.Provider>
  );
}

export function TourButton({ className }: { className?: string }) {
  const { startTour } = useTour();
  return (
    <button
      onClick={startTour}
      data-testid="btn-take-tour"
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 ${className ?? ""}`}
      style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.3)", color: "#d4b461" }}
    >
      <Map className="w-4 h-4" />
      Take a Tour
    </button>
  );
}
