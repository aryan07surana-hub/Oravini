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
    title: "Welcome to Oravini",
    description: "I'm your AI guide. I'll walk you through every tool — Content Ideas, Content Coach, Video Editor, Design Studio, Forms & Quiz Builder, Board Builder, IG Growth Tracker, Tracking, Competitor Study, Credits, and Settings. Follow along and I'll explain exactly how each one works. Takes about 3 minutes.",
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
    position: "top",
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

  // ── Forms & Quiz Builder ──────────────────────────────────────────────────
  {
    id: "forms-hub-header",
    route: "/tools/forms",
    target: '[data-tour="forms-hub-main"]',
    title: "Forms & Quiz Builder — Overview",
    description: "Build custom lead capture forms, quizzes, and surveys — all without any code. Create a form, publish it, share the link in your Story or bio, and every response lands straight in your dashboard. Great for lead gen, audience research, and qualifying clients.",
    position: "bottom",
    tip: "Use a short 3-question quiz as a lead magnet — 'What type of creator are you?' — and collect emails from the results page.",
  },
  {
    id: "forms-hub-list",
    route: "/tools/forms",
    target: '[data-tour="forms-hub-list"]',
    title: "Forms & Quiz Builder — Your Forms",
    description: "All your forms live here. Click any form to edit its questions, add custom fields, or view responses. You can duplicate a form to start from an existing template, toggle it between Draft and Published, or share the public link directly. Responses update in real time.",
    position: "bottom",
  },

  // ── Board Builder ──────────────────────────────────────────────────────────
  {
    id: "board-builder-header",
    route: "/tools/board-builder",
    target: '[data-tour="board-builder-main"]',
    title: "Board Builder — AI Flowcharts",
    description: "Paste any script, strategy, SOP, or content plan and the AI instantly turns it into a visual flowchart. Nodes are colour-coded by type — headers, steps, decisions, insights, results. Drag to rearrange, click any node to edit it, and export as a PNG when you're done.",
    position: "bottom",
    tip: "Paste your full onboarding DM script and the AI maps every step, branch, and response path as a visual flow — saves hours building it manually.",
  },

  // ── IG Growth Tracker ─────────────────────────────────────────────────────
  {
    id: "ig-tracker-header",
    route: "/tracking/content/instagram",
    target: '[data-tour="ig-tracker-main"]',
    title: "Instagram Tracking — Overview",
    description: "This is your Instagram performance hub. It shows your month-by-month post data — total posts, views, and follower growth. The follower growth panel at the top auto-scans any Instagram profile daily so you always have live data on yourself and your competitors.",
    position: "bottom",
  },
  {
    id: "ig-tracker-add",
    route: "/tracking/content/instagram",
    target: '[data-tour="ig-tracker-add"]',
    title: "Instagram Tracking — Your Stats",
    description: "These three cards show your total posts logged, total views across all content, and follower gain. Log each post after you publish it and the numbers build up over time. The data compounds — after 30 days you'll have a clear picture of exactly what content is growing your account.",
    position: "bottom",
    tip: "Import your Instagram profile using the Import button to pull your last 20 posts automatically — no manual logging needed.",
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
    description: "Every AI action in Oravini — generating ideas, coaching sessions, video plans, image generation, competitor analysis — uses credits. Your monthly allocation resets every billing cycle. Bonus credits from top-ups never expire and are used after your monthly credits run out.",
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
    description: "That's the full Oravini platform. The workflow is simple: generate ideas → refine with the coach → create content → track results → study competitors → repeat. Start with Content Ideas or drop a script into the Content Coach right now. You can restart this tour anytime from your dashboard.",
    position: "center",
  },
];

// ── Page-specific mini-tours ──────────────────────────────────────────────────
const PAGE_TOURS: Record<string, TourStep[]> = {
  "ai-ideas": [
    {
      id: "pt-ideas-1", route: "/ai-ideas", target: '[data-tour="ai-ideas-header"]',
      title: "Content Ideas — What it does",
      description: "This tool generates 6 non-generic, platform-specific content ideas tailored to your niche, audience, and goal. It's connected to your logged posts so it learns what's already worked for you and won't repeat it.",
      position: "bottom",
    },
    {
      id: "pt-ideas-2", route: "/ai-ideas", target: '[data-tour="ai-ideas-tabs"]',
      title: "Your 4 Tabs",
      description: "Generate Ideas creates new content. Liked Ideas is your saved library — heart any idea to store it here. Auto Schedule lets you publish directly to connected platforms. History shows everything you've generated before so nothing gets lost.",
      position: "bottom",
      tip: "Heart ideas you won't use today — build up a backlog in Liked Ideas so you always have content ready.",
    },
    {
      id: "pt-ideas-3", route: "/ai-ideas", target: '[data-tour="ai-ideas-form"]',
      title: "Niche & Targeting",
      description: "This is the most important part. Enter your niche as specifically as possible — 'fitness for busy mums over 35' beats 'fitness'. Choose your content type (Reel, Carousel, Thread), set your goal (viral reach, authority, leads), and optionally add your target audience for even sharper ideas.",
      position: "bottom",
      tip: "The more specific your niche, the more specific the ideas. Vague input = generic output.",
    },
    {
      id: "pt-ideas-4", route: "/ai-ideas", target: '[data-tour="ai-ideas-generate"]',
      title: "Generate Your Ideas",
      description: "Hit Generate and the AI scans what's performing right now in your niche, applies your targeting, and returns 6 ready-to-use ideas — each with a hook, caption direction, and posting tips. Paste your Instagram or YouTube profile URL at the top to get ideas personalised to your actual content.",
      position: "top",
    },
  ],

  "ai-coach": [
    {
      id: "pt-coach-1", route: "/ai-coach", target: '[data-tour="coach-header"]',
      title: "AI Content Coach — Overview",
      description: "This is your personal AI mentor. It reviews scripts, builds your brand positioning, creates 90-day growth roadmaps, analyses competitors, and answers any content strategy question in real time. Every conversation is saved and restorable.",
      position: "bottom",
    },
    {
      id: "pt-coach-2", route: "/ai-coach", target: '[data-tour="coach-modes"]',
      title: "Coaching Modes",
      description: "Chat is open conversation. Script Review pastes and analyses your content. Competitor Analysis studies a handle or URL. Brand Builder creates your positioning, bio, and pillars. Roadmap Generator gives you a step-by-step 90-day plan. Switch modes based on what you need each session.",
      position: "right",
      tip: "Start with Brand Builder on your first session — it sets the foundation everything else builds on.",
    },
    {
      id: "pt-coach-3", route: "/ai-coach", target: '[data-tour="coach-sessions"]',
      title: "Saved Sessions",
      description: "Every coaching conversation is automatically saved here the moment you send your first message. Click any session to restore it and pick up exactly where you left off. Sessions are organised by mode — so your Brand Builder work stays separate from your Script Review sessions.",
      position: "right",
    },
    {
      id: "pt-coach-4", route: "/ai-coach", target: '[data-tour="coach-chat-input"]',
      title: "Chat with Your Coach",
      description: "Type anything here — ask for a hook rewrite, paste a script for brutal feedback, request a posting strategy, or ask 'why isn't my content growing?' The coach holds the full conversation context so you can have a real back-and-forth. Press Enter or click Send.",
      position: "top",
      tip: "Paste a script and type 'be brutal' — the coach will tell you exactly what's broken and how to fix it.",
    },
  ],

  "video-editor": [
    {
      id: "pt-video-1", route: "/video-editor", target: '[data-tour="video-editor-main"]',
      title: "AI Video Editor — Overview",
      description: "This tool generates complete video production plans. Give it an idea, a script, a competitor video URL, or a quick description — and it returns a full shoot plan: hook, script, B-roll list, captions, audio recommendations, and a posting checklist. No editing experience needed.",
      position: "bottom",
    },
    {
      id: "pt-video-2", route: "/video-editor", target: '[data-tour="video-editor-input"]',
      title: "4 Ways to Work",
      description: "Idea Builder — describe your concept and the AI writes everything from scratch. Paste Script — drop in your existing script for a critique and enhancement. Video URL — paste an Instagram or YouTube link and the AI reverse-engineers why it worked. Quick Describe — a one-liner gets you a fast plan back.",
      position: "bottom",
      tip: "Paste a competitor video URL that went viral in your niche — the AI will break down exactly why it worked and how to replicate it.",
    },
    {
      id: "pt-video-3", route: "/video-editor", target: '[data-tour="video-editor-platform"]',
      title: "Platform & Duration",
      description: "Select which platform you're creating for and how long your video needs to be. Instagram Reels, YouTube Shorts, LinkedIn videos, and X posts each have different optimal pacing, hook styles, and CTAs. The AI adapts the entire production plan to match the platform's algorithm.",
      position: "top",
    },
  ],

  "ai-design": [
    {
      id: "pt-design-1", route: "/ai-design", target: '[data-tour="design-studio-main"]',
      title: "AI Design Studio — Overview",
      description: "Create professional branded content without design experience. Carousels, social graphics, thumbnails, lead magnets — all AI-generated and tailored to your brand. No Canva skills needed. Pick a tool below and the AI guides you through the rest.",
      position: "bottom",
    },
    {
      id: "pt-design-2", route: "/ai-design", target: '[data-tour="design-studio-tools"]',
      title: "Your Design Tools",
      description: "Carousel Creator builds multi-slide carousels with hooks and CTA slides — perfect for Instagram and LinkedIn saves. Social Graphics generates single-post visuals for any platform. Audience Psychology creates visuals built around emotional triggers. Brand Kit stores your colours, fonts, and logo for consistent branding across everything.",
      position: "bottom",
      tip: "Carousels get 3-5x more saves than single images. Run one per week for consistent reach and authority growth.",
    },
  ],

  "tracking": [
    {
      id: "pt-tracking-1", route: "/tracking", target: '[data-tour="tracking-home"]',
      title: "Your Tracking Hub",
      description: "Four dashboards in one place. Content Tracking logs every post and tracks views, likes, and comments over time. DM Pipeline manages your sales conversations and follow-ups. Content Calendar shows your scheduled and planned content. Competitor Study gives you research tools — all accessible from here.",
      position: "bottom",
      tip: "Log every post you publish — even if results look small early on. The data compounds and shows you exactly what content type is growing your account.",
    },
  ],

  "competitor": [
    {
      id: "pt-comp-1", route: "/tracking/competitor", target: '[data-tour="competitor-main"]',
      title: "Competitor Study — Overview",
      description: "Research any creator, brand, or competitor in your niche. Enter their Instagram handle or a reel URL and the AI analyses their content, identifies what's performing best, spots their posting patterns, and gives you actionable takeaways you can apply immediately.",
      position: "bottom",
      tip: "Pick 3 accounts that are 6-12 months ahead of you. Study them weekly — not the biggest accounts in the niche, the ones just ahead of you.",
    },
    {
      id: "pt-comp-2", route: "/tracking/competitor", target: '[data-tour="competitor-sections"]',
      title: "6 Analysis Sections",
      description: "Content Strategy breaks down their best-performing formats and topics. Hook Library extracts their top opening lines. Niche Trends shows what's heating up right now. Virality Score compares your content against theirs. Content Steal generates new ideas inspired by their top posts — but made uniquely yours.",
      position: "bottom",
    },
  ],

  "forms": [
    {
      id: "pt-forms-1", route: "/tools/forms", target: '[data-tour="forms-hub-main"]',
      title: "Forms & Quiz Builder",
      description: "Create lead capture forms, quizzes, and surveys without any code. Hit New Form, choose the type, build your questions, publish — then share the link in your bio or Story. Every response lands in your dashboard instantly.",
      position: "bottom",
      tip: "Use a short 3-question quiz as a lead magnet. 'What type of creator are you?' performs incredibly well for email list growth.",
    },
    {
      id: "pt-forms-2", route: "/tools/forms", target: '[data-tour="forms-hub-list"]',
      title: "Your Forms Library",
      description: "All your forms appear here. Click to edit questions or view responses. Toggle between Draft and Published — only published forms accept submissions. Use the copy-link button to grab the public URL and drop it anywhere: bio, Story, DM, or email.",
      position: "bottom",
    },
  ],

  "board-builder": [
    {
      id: "pt-board-1", route: "/tools/board-builder", target: '[data-tour="board-builder-main"]',
      title: "Board Builder — AI Flowcharts",
      description: "Paste any script, SOP, content plan, or strategy into the input below and the AI instantly converts it into a colour-coded visual flowchart. Headers, steps, decisions, results, and insights are each styled differently so the structure is immediately clear.",
      position: "bottom",
      tip: "Paste your full DM sales script and the AI maps every branch and follow-up path as a flow. Saves hours versus building it manually.",
    },
  ],

  "ig-tracker": [
    {
      id: "pt-ig-1", route: "/tracking/content/instagram", target: '[data-tour="ig-tracker-main"]',
      title: "Instagram Tracking",
      description: "This is your Instagram performance hub. It shows month-by-month post data — total posts, views, and follower growth. The follower growth panel auto-scans Instagram profiles daily so you always have live data on yourself and your competitors.",
      position: "bottom",
    },
    {
      id: "pt-ig-2", route: "/tracking/content/instagram", target: '[data-tour="ig-tracker-add"]',
      title: "Your Stats",
      description: "These cards show total posts logged, total views, and follower gain. Log each post after publishing and the data compounds over time. Use the Import button to pull your last 20 posts automatically — no manual logging needed.",
      position: "bottom",
      tip: "After 30 days of logging, you'll see exactly which content type drives the most growth — that data is worth more than any course.",
    },
  ],

  "credits": [
    {
      id: "pt-credits-1", route: "/credits", target: '[data-tour="credits-main"]',
      title: "Credits — How They Work",
      description: "Every AI action uses credits — generating ideas, coaching sessions, video plans, image generation, competitor analysis. Your monthly allocation resets every billing cycle. Bonus credits from top-ups never expire and are spent only after your monthly credits run out.",
      position: "bottom",
    },
    {
      id: "pt-credits-2", route: "/credits", target: '[data-tour="credits-balance"]',
      title: "Your Credit Balance",
      description: "Total Available shows everything you have right now. Monthly Credits (gold) are your plan's included allowance — the bar shows how much you've used this cycle. Bonus Credits (purple) are purchased top-ups that never expire. Scroll down to buy top-ups anytime.",
      position: "bottom",
      tip: "Top up before a big content push — competitor analysis and video planning use more credits than standard idea generation.",
    },
  ],
};

interface TourContextType {
  startTour: () => void;
  startPageTour: (pageKey: string) => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType>({ startTour: () => {}, startPageTour: () => {}, isActive: false });

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

function SpotlightOverlay({ rect, onNext }: { rect: DOMRect | null; onNext: () => void }) {
  const pad = 12;

  const overlayStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    background: "rgba(0,0,0,0.74)",
    zIndex: 9994,
    cursor: "default",
    ...extra,
  });

  if (!rect) {
    return <div className="fixed inset-0" style={{ zIndex: 9994, background: "rgba(0,0,0,0.74)" }} />;
  }

  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  return (
    <>
      <div className="fixed left-0 right-0 top-0" style={overlayStyle({ height: Math.max(0, y) })} />
      <div className="fixed left-0" style={overlayStyle({ top: Math.max(0, y), height: h, width: Math.max(0, x) })} />
      <div className="fixed right-0" style={overlayStyle({ top: Math.max(0, y), height: h, left: x + w })} />
      <div className="fixed left-0 right-0 bottom-0" style={overlayStyle({ top: y + h })} />
      {/* Spotlight hole — clicking it advances to the next step */}
      <div
        onClick={onNext}
        style={{
          position: "fixed",
          left: x, top: y, width: w, height: h,
          zIndex: 9995,
          borderRadius: 14,
          border: "2.5px solid #d4b461",
          boxShadow: "0 0 0 3px rgba(212,180,97,0.18), 0 0 28px rgba(212,180,97,0.4), inset 0 0 20px rgba(212,180,97,0.05)",
          cursor: "pointer",
        }}
        title="Click to continue"
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
  const margin = 16;
  const cardW = 370;
  // Overestimate height to avoid going off-screen (tips add ~80px)
  const cardH = step.tip ? 360 : 290;

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

    // Prefer "top" hint OR when below doesn't fit
    if (step.position === "top" || spaceBelow < cardH) {
      if (spaceAbove >= cardH) {
        // Enough room above — place above
        top = rect.top - pad - cardH - margin;
      } else if (spaceBelow >= cardH) {
        // Enough room below after all
        top = rect.bottom + pad + margin;
      } else {
        // Tight both sides — center vertically, shift to the side
        top = Math.max(margin, viewH / 2 - cardH / 2);
        const sideLeft = rect.right + margin;
        left = sideLeft + cardW + margin <= viewW ? sideLeft : Math.max(margin, rect.left - cardW - margin);
      }
    } else {
      // Default: place below
      top = rect.bottom + pad + margin;
    }

    // Hard clamp to viewport
    top = Math.max(margin, Math.min(top, viewH - cardH - margin));
    left = Math.max(margin, Math.min(left, viewW - cardW - margin));
    cardStyle = { ...cardStyle, top, left };
  }

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div style={cardStyle}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <TourMascot />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#d4b461" }}>
                Step {stepIndex + 1} of {totalSteps}
              </p>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                title="Exit tour (Esc)"
                style={{ cursor: "pointer" }}
              >
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

        {/* Progress bar */}
        <div className="mt-4 mb-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #b89848, #d4b461)" }}
          />
        </div>

        {/* Navigation hint */}
        {!isLast && (
          <p className="text-[10px] text-zinc-600 text-center mb-3">
            Click the highlighted area or press <span className="text-zinc-500">→</span> to continue
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-950/30 flex-shrink-0"
            style={{ cursor: "pointer" }}
          >
            <X className="w-3.5 h-3.5" /> Quit Tour
          </button>
          <div className="flex-1" />
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-300 hover:text-white transition-all px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 active:scale-95"
              style={{ cursor: "pointer" }}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-2 text-[14px] font-black px-6 py-2.5 rounded-xl transition-all active:scale-95 select-none"
            style={{ background: "linear-gradient(135deg, #c9a94e, #d4b461, #e8ca77)", color: "#000", cursor: "pointer", boxShadow: "0 4px 16px rgba(212,180,97,0.35), 0 2px 4px rgba(0,0,0,0.4)" }}
          >
            {isLast ? "Finish ✓" : "Next"}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeSteps, setActiveSteps] = useState<TourStep[]>(TOUR_STEPS);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, navigate] = useLocation();
  const busyRef = useRef(false);
  const activeStepsRef = useRef<TourStep[]>(TOUR_STEPS);
  const currentStep = activeSteps[stepIndex];

  // Keep ref in sync so goToStep always sees the latest steps
  useEffect(() => { activeStepsRef.current = activeSteps; }, [activeSteps]);

  const locateTarget = useCallback(async (target: string | null) => {
    if (!target) { setRect(null); return; }

    let el: Element | null = null;
    // Retry up to 30 times (4.5 seconds) to handle slow-loading pages
    for (let i = 0; i < 30; i++) {
      el = document.querySelector(target);
      if (el) break;
      await new Promise(r => setTimeout(r, 150));
    }

    if (!el) { setRect(null); return; }

    el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });

    await new Promise(r => setTimeout(r, 120));
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 80));

    const r = (el as HTMLElement).getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
    } else {
      setRect(r);
    }
  }, []);

  const goToStep = useCallback(async (index: number, steps?: TourStep[]) => {
    // Don't guard on busyRef — allow fast clicking to queue next step
    const stepsToUse = steps ?? activeStepsRef.current;
    const s = stepsToUse[index];
    if (!s) { setActive(false); return; }
    if (busyRef.current) return; // Still navigating — drop duplicate click
    busyRef.current = true;
    setRect(null);
    setStepIndex(index);

    const currentRoute = window.location.pathname;
    const isNewPage = s.route !== currentRoute;

    navigate(s.route);
    // Give new pages 1.4s to mount their components before looking for targets
    await new Promise(r => setTimeout(r, isNewPage ? 1400 : 180));
    await locateTarget(s.target);
    busyRef.current = false;
  }, [navigate, locateTarget]);

  const startTour = useCallback(() => {
    activeStepsRef.current = TOUR_STEPS;
    setActiveSteps(TOUR_STEPS);
    setStepIndex(0);
    setActive(true);
    goToStep(0, TOUR_STEPS);
  }, [goToStep]);

  const startPageTour = useCallback((pageKey: string) => {
    const steps = PAGE_TOURS[pageKey];
    if (!steps || steps.length === 0) return;
    activeStepsRef.current = steps;
    setActiveSteps(steps);
    setStepIndex(0);
    setActive(true);
    goToStep(0, steps);
  }, [goToStep]);

  const next = useCallback(() => {
    const steps = activeStepsRef.current;
    if (stepIndex < steps.length - 1) goToStep(stepIndex + 1);
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
    <TourContext.Provider value={{ startTour, startPageTour, isActive: active }}>
      {children}
      {active && currentStep && (
        <>
          <SpotlightOverlay rect={rect} onNext={next} />
          <TourCard
            step={currentStep}
            stepIndex={stepIndex}
            totalSteps={activeSteps.length}
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

export function PageTourButton({ pageKey, className }: { pageKey: string; className?: string }) {
  const { startPageTour } = useTour();
  return (
    <button
      onClick={() => startPageTour(pageKey)}
      data-testid={`btn-page-tour-${pageKey}`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95 flex-shrink-0 ${className ?? ""}`}
      style={{ background: "rgba(212,180,97,0.08)", border: "1px solid rgba(212,180,97,0.25)", color: "#d4b461" }}
    >
      <Map className="w-3.5 h-3.5" />
      Take a Tour
    </button>
  );
}
