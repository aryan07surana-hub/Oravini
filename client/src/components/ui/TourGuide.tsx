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
  // ── Dashboard ──────────────────────────────────────────────────────────────
  {
    id: "welcome",
    route: "/dashboard",
    target: null,
    title: "Welcome to Brandverse",
    description: "I'm your AI guide. I'll walk you through every single tool — Content Ideas, Content Coach, Video Editor, Design Studio, Tracking, Competitor Study, Credits, and Settings. Follow along and I'll explain exactly how to use each one. Takes about 3 minutes.",
    position: "center",
  },
  {
    id: "dashboard-stats",
    route: "/dashboard",
    target: '[data-tour="dashboard-stats"]',
    title: "Your Performance Stats",
    description: "These cards show your live metrics — total content views, follower growth, and programme progress. As you log posts and track results, these numbers update automatically. Elite users also see task completion rates and a progress percentage towards their milestones.",
    position: "bottom",
  },
  {
    id: "quick-tools",
    route: "/dashboard",
    target: '[data-tour="quick-tools"]',
    title: "Quick Tools — Your Launchpad",
    description: "These three cards give you one-click access to your most-used AI tools. Content Ideas, Content Coach, and Video Editor are the core of the platform — everything you need to create, refine, and scale your content is behind these three buttons.",
    position: "top",
    tip: "Bookmark your dashboard. You'll come back here to start every content session.",
  },

  // ── Content Ideas ──────────────────────────────────────────────────────────
  {
    id: "ideas-header",
    route: "/ai-ideas",
    target: '[data-tour="ai-ideas-header"]',
    title: "Content Ideas — Overview",
    description: "This is the Content Ideas engine. It generates 6 platform-specific, non-generic content ideas tailored to your niche, audience, and goal. It is connected to your logged posts so it learns what has already worked for you — and avoids repeating it.",
    position: "bottom",
  },
  {
    id: "ideas-tabs",
    route: "/ai-ideas",
    target: '[data-tour="ai-ideas-tabs"]',
    title: "Content Ideas — Platform Tabs",
    description: "These tabs control what you're doing. Generate Ideas is where you create new content. Liked Ideas stores every idea you heart — your growing library of content. Auto Schedule lets you publish ideas directly to your connected Instagram, LinkedIn, X, or YouTube. History shows everything generated before.",
    position: "bottom",
    tip: "Use the Liked Ideas tab as your content backlog — heart ideas you're not using today so you always have a reserve.",
  },
  {
    id: "ideas-form",
    route: "/ai-ideas",
    target: '[data-tour="ai-ideas-form"]',
    title: "Content Ideas — Niche & Targeting",
    description: "This is where you tell the AI exactly who you are. Enter your niche (e.g. 'fitness for busy mums'), choose a content type (Reel, Carousel, Story, Thread), set your goal (viral reach, authority, lead gen), and optionally add your target audience. The more specific you are, the sharper the ideas.",
    position: "bottom",
    tip: "Niche down as far as possible — 'personal finance for nurses in the UK' beats 'money tips' every time.",
  },
  {
    id: "ideas-generate",
    route: "/ai-ideas",
    target: '[data-tour="ai-ideas-generate"]',
    title: "Content Ideas — Generate",
    description: "Hit Generate and the AI searches for what's performing in your niche right now, applies your audience and goal settings, and returns 6 ready-to-use ideas with hooks, captions, and posting tips. You can also paste your Instagram or YouTube profile URL at the top to get ideas personalised to your existing content.",
    position: "top",
  },

  // ── Content Coach ──────────────────────────────────────────────────────────
  {
    id: "coach-header",
    route: "/ai-coach",
    target: '[data-tour="coach-header"]',
    title: "Content Coach — Overview",
    description: "Content Coach is your personal AI mentor. It can review scripts and give detailed feedback, help you build your brand identity, create a 90-day growth roadmap, analyse a competitor's content, or just answer any question about your content strategy in real time.",
    position: "bottom",
  },
  {
    id: "coach-modes",
    route: "/ai-coach",
    target: '[data-tour="coach-modes"]',
    title: "Content Coach — Coaching Modes",
    description: "These modes change how the coach operates. Chat is open-ended conversation. Script Review pastes and analyses your script. Competitor Analysis studies a competitor URL. Brand Builder creates your brand positioning and bio. Roadmap Generator gives you a step-by-step plan. Switch modes depending on what you need in that session.",
    position: "right",
    tip: "Start with Brand Builder on your first session — it sets the foundation everything else builds on.",
  },
  {
    id: "coach-sessions",
    route: "/ai-coach",
    target: '[data-tour="coach-sessions"]',
    title: "Content Coach — Saved Sessions",
    description: "Every coaching conversation is automatically saved here. Click any session to restore it and pick up exactly where you left off. You can rename sessions to keep them organised — one session per content type, campaign, or goal works well.",
    position: "right",
  },
  {
    id: "coach-chat",
    route: "/ai-coach",
    target: '[data-tour="coach-chat-input"]',
    title: "Content Coach — Chat Input",
    description: "Type anything here and the coach responds instantly. Ask for hook improvements, post caption rewrites, feedback on your bio, advice on your posting frequency — anything content and growth related. The coach remembers the full conversation context so you can have a proper back-and-forth dialogue.",
    position: "top",
    tip: "Paste a script you wrote and type 'be brutal' — the coach will tell you exactly what's not working and why.",
  },

  // ── Video Editor ──────────────────────────────────────────────────────────
  {
    id: "video-editor-header",
    route: "/video-editor",
    target: '[data-tour="video-editor-main"]',
    title: "AI Video Editor — Overview",
    description: "The Video Editor generates complete video plans, scripts, and production guides. You give it an idea, a paste of your script, a video URL, or a quick description — and it returns a full shoot plan with hook, script, B-roll suggestions, captions, audio recommendations, and a posting checklist.",
    position: "bottom",
  },
  {
    id: "video-editor-input",
    route: "/video-editor",
    target: '[data-tour="video-editor-input"]',
    title: "AI Video Editor — Input Methods",
    description: "There are four ways to work here. Idea Builder — describe a concept and the AI writes everything. Paste Script — drop in your existing script for a full critique and enhancement. Video URL — paste an Instagram or YouTube link and the AI analyses what made it work. Quick Describe — a one-liner and you get a fast plan back.",
    position: "bottom",
    tip: "Use Video URL on competitor videos that went viral in your niche — the AI reverse-engineers exactly why it worked.",
  },
  {
    id: "video-editor-platform",
    route: "/video-editor",
    target: '[data-tour="video-editor-platform"]',
    title: "AI Video Editor — Platform & Duration",
    description: "Tell the AI which platform you're creating for and how long your video needs to be. This matters because Instagram Reels, YouTube Shorts, LinkedIn videos, and X posts each have different optimal pacing, hook styles, and CTAs. The AI adapts the entire plan to match the platform's algorithm.",
    position: "top",
  },

  // ── Design Studio ──────────────────────────────────────────────────────────
  {
    id: "design-header",
    route: "/ai-design",
    target: '[data-tour="design-studio-main"]',
    title: "AI Design Studio — Overview",
    description: "Design Studio gives you access to professional-grade design tools without needing Canva skills. Create carousels that save and share, branded graphics for any platform, audience psychology visuals, and more — all AI-assisted and built to match your brand.",
    position: "bottom",
  },
  {
    id: "design-tools",
    route: "/ai-design",
    target: '[data-tour="design-studio-tools"]',
    title: "AI Design Studio — Tools",
    description: "Each card here is a different design workflow. Carousel Creator builds multi-slide carousels with hooks and CTA slides. Social Graphics generates single post visuals. Audience Psychology creates visuals based on emotional triggers. Brand Kit stores your colours, fonts, and logo for consistent use across everything. Click any tool to open it.",
    position: "bottom",
    tip: "Carousels consistently get 3-5x more saves than single images — run them weekly for reach and authority building.",
  },

  // ── Tracking ──────────────────────────────────────────────────────────────
  {
    id: "tracking-home",
    route: "/tracking",
    target: '[data-tour="tracking-home"]',
    title: "Tracking Hub — Dashboard",
    description: "This is your performance tracking centre. Content Tracking logs every post you make and tracks views, likes, and comments over time. DM Pipeline manages your sales conversations and follow-ups. Content Calendar shows your scheduled content. Competitor Study sits here too — all your research in one place.",
    position: "bottom",
  },

  // ── Competitor Study ───────────────────────────────────────────────────────
  {
    id: "competitor-header",
    route: "/tracking/competitor",
    target: '[data-tour="competitor-main"]',
    title: "Competitor Study — Overview",
    description: "This tool lets you research any creator, brand, or competitor in your niche. Enter their Instagram handle or a reel URL and the AI analyses their content, identifies what's performing best, spots their posting patterns, and gives you actionable takeaways you can apply to your own strategy immediately.",
    position: "bottom",
    tip: "Pick 3 accounts that are 6-12 months ahead of you in the same niche. Study them weekly.",
  },
  {
    id: "competitor-sections",
    route: "/tracking/competitor",
    target: '[data-tour="competitor-sections"]',
    title: "Competitor Study — Analysis Sections",
    description: "Each section dives into a specific angle. Content Strategy analyses their best-performing formats. Hook Library extracts their top hooks and openers. Niche Trends shows what topics are heating up. Virality Score compares your content against theirs. Content Steal generates ideas inspired by their top posts — but made uniquely yours.",
    position: "bottom",
  },

  // ── Credits ───────────────────────────────────────────────────────────────
  {
    id: "credits-header",
    route: "/credits",
    target: '[data-tour="credits-main"]',
    title: "Credits — Overview",
    description: "Every AI action in Brandverse — generating ideas, coaching sessions, video plans, image generation, competitor analysis — uses credits. Your monthly allocation resets every billing cycle. Bonus credits from top-ups never expire and are used after your monthly credits run out.",
    position: "bottom",
  },
  {
    id: "credits-balance",
    route: "/credits",
    target: '[data-tour="credits-balance"]',
    title: "Credits — Your Balance",
    description: "These three cards show your full credit picture. Total Available is everything you have right now. Monthly Credits are your plan's included allowance — the gold number. Bonus Credits are any top-ups you've purchased — shown in purple. The progress bar shows how much of your monthly allowance you've used this cycle.",
    position: "bottom",
    tip: "Top up before a big content push — competitor analysis and video planning use more credits than standard idea generation.",
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  {
    id: "settings",
    route: "/settings/plan",
    target: '[data-tour="settings-main"]',
    title: "Plan & Settings",
    description: "Here you manage your account, plan, and connected platforms. Upgrade your plan to unlock more tools — Elite unlocks everything including full tracking, competitor study, and unlimited coaching. Connect Instagram, LinkedIn, YouTube, and X here to enable auto-scheduling from the Content Ideas tab.",
    position: "bottom",
  },

  // ── Done ──────────────────────────────────────────────────────────────────
  {
    id: "done",
    route: "/dashboard",
    target: null,
    title: "You are ready — let's go",
    description: "That's the full Brandverse platform. The workflow is simple: generate ideas → refine with the coach → create content → track results → study competitors → repeat. Start with Content Ideas or drop a script into the Content Coach right now. You can restart this tour anytime from your dashboard.",
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

    // Retry finding the element (handles async-rendered content)
    let el: Element | null = null;
    for (let i = 0; i < 20; i++) {
      el = document.querySelector(target);
      if (el) break;
      await new Promise(r => setTimeout(r, 150));
    }

    if (!el) { setRect(null); return; }

    // Scroll instantly so getBoundingClientRect is accurate immediately
    el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });

    // Give the browser one frame + a buffer to finish layout
    await new Promise(r => setTimeout(r, 100));
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 80));

    const r = (el as HTMLElement).getBoundingClientRect();

    // If element has no dimensions (hidden / collapsed), don't show spotlight
    if (r.width === 0 && r.height === 0) {
      setRect(null);
    } else {
      setRect(r);
    }
  }, []);

  const goToStep = useCallback(async (index: number) => {
    if (busyRef.current) return;
    const s = TOUR_STEPS[index];
    if (!s) { setActive(false); return; }
    busyRef.current = true;
    setRect(null);
    setStepIndex(index);

    const prevRoute = TOUR_STEPS[index - 1]?.route;
    const isNewPage = s.route !== prevRoute;

    navigate(s.route);

    // Wait longer when navigating to a new page, shorter when already there
    await new Promise(r => setTimeout(r, isNewPage ? 600 : 120));

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
