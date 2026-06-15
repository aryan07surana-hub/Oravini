import { useState, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Layers, ChevronLeft, ChevronRight,
  Download, ImagePlus, RefreshCw, Upload, Check, Palette,
  LayoutTemplate, Wand2, Zap, History, Plus, Trash2, Clock,
  ArrowLeft, PlusCircle, Brain, Target, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

// ── Types ────────────────────────────────────────────────────────────────────
interface AiSlide { role: string; headline: string; body: string; }
interface DesignSlide extends AiSlide { 
  imageUrl: string | null; 
  layout: "full" | "split" | "text";
  textPosition?: { x: number; y: number };
  headlineSize?: number;
  bodySize?: number;
  overlayOpacity?: number;
  textColor?: string;
  headlineColor?: string;
  chartData?: ChartData;
}

interface BrandKit {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headlineFont?: string;
  bodyFont?: string;
  createdAt: Date;
}

interface CarouselTemplate {
  id: string;
  name: string;
  thumbnail: string;
  niche: string;
  style: string;
  slideCount: number;
  slides: DesignSlide[];
  theme: ThemeKey;
}

interface ChartData {
  type: "bar" | "pie" | "line" | "donut";
  data: { label: string; value: number; color?: string }[];
  title?: string;
}

type ThemeData = { name: string; bg: string; overlay: string; headline: string; body: string; accent: string; accentText: string };
type ThemeKey = "brandverse" | "minimal" | "navy" | "coral" | "viral" | "rose" | "forest" | "sunset" | "cyber" | "arctic" | "custom";

// ── Themes ───────────────────────────────────────────────────────────────────
const THEMES: Record<ThemeKey, ThemeData> = {
  brandverse: { name: "Oravini Gold", bg: "#0a0a0a", overlay: "rgba(0,0,0,0.58)",      headline: "#d4b461", body: "#ffffff", accent: "#d4b461", accentText: "#000000" },
  minimal:    { name: "Clean White",     bg: "#ffffff",  overlay: "rgba(255,255,255,0.72)",headline: "#111111", body: "#444444", accent: "#111111", accentText: "#ffffff" },
  navy:       { name: "Midnight Blue",   bg: "#0f172a",  overlay: "rgba(15,23,42,0.68)",   headline: "#818cf8", body: "#e2e8f0", accent: "#818cf8", accentText: "#0f172a" },
  coral:      { name: "Bold Coral",      bg: "#1a1a1a",  overlay: "rgba(0,0,0,0.52)",      headline: "#ff6b6b", body: "#ffffff", accent: "#ff6b6b", accentText: "#000000" },
  viral:      { name: "Viral Dark",      bg: "#0d0d0d",  overlay: "rgba(0,0,0,0.60)",      headline: "#ffffff", body: "#cccccc", accent: "#ff3b8e", accentText: "#ffffff" },
  rose:       { name: "Rose Gold",       bg: "#1a0a0e",  overlay: "rgba(20,5,8,0.58)",     headline: "#fda4af", body: "#ffffff", accent: "#f43f5e",  accentText: "#ffffff" },
  forest:     { name: "Forest Dark",     bg: "#0a1a0e",  overlay: "rgba(5,15,8,0.58)",     headline: "#86efac", body: "#ffffff", accent: "#22c55e",  accentText: "#000000" },
  sunset:     { name: "Sunset Vibes",    bg: "#18100a",  overlay: "rgba(18,8,3,0.52)",     headline: "#fdba74", body: "#ffffff", accent: "#f97316",  accentText: "#000000" },
  cyber:      { name: "Cyberpunk",       bg: "#050511",  overlay: "rgba(5,5,17,0.65)",     headline: "#e879f9", body: "#d4d4f8", accent: "#a855f7",  accentText: "#ffffff" },
  arctic:     { name: "Arctic Blue",     bg: "#0a0f1a",  overlay: "rgba(0,5,20,0.58)",     headline: "#7dd3fc", body: "#e2e8f0", accent: "#0ea5e9",  accentText: "#ffffff" },
  custom:     { name: "Custom",          bg: "#0a0a0a",  overlay: "rgba(0,0,0,0.58)",      headline: "#ffffff", body: "#cccccc", accent: "#d4b461",  accentText: "#000000" },
};

const TONES = ["Engaging & Educational", "Bold & Direct", "Motivational", "Storytelling", "Data-Driven", "Conversational"];
const SLIDE_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10];
const ROLE_COLORS: Record<string, string> = { Hook: "#d4b461", Problem: "#f87171", Insight: "#818cf8", Solution: "#34d399", CTA: "#fb923c", Benefit: "#38bdf8", Step: "#a78bfa" };

// ── Carousel Config Options ──────────────────────────────────────────────────
interface CarouselInspo {
  id: string; emoji: string; label: string; desc: string;
  niche: string; goal: string; topic: string; targetAudience: string;
  ctaType: string; slideCount: number; tone: string; color: string;
}

const CAROUSEL_INSPIRATIONS: CarouselInspo[] = [
  { id: "listicle", emoji: "📋", label: "Top 5 Listicle", desc: "Value-packed numbered list", niche: "Business", goal: "educate", topic: "5 mistakes killing your Instagram growth in 2025", targetAudience: "Creators with under 10K followers", ctaType: "save", slideCount: 7, tone: "Bold & Direct", color: "#dc2626" },
  { id: "howto", emoji: "🔧", label: "Step-by-Step Guide", desc: "Actionable how-to carousel", niche: "Marketing", goal: "educate", topic: "How to write hooks that stop the scroll every time", targetAudience: "Content creators and marketers", ctaType: "save", slideCount: 8, tone: "Engaging & Educational", color: "#2563eb" },
  { id: "myths", emoji: "💥", label: "Myth Buster", desc: "Controversial takes that get shares", niche: "Finance", goal: "viral", topic: "5 money myths that are keeping you broke", targetAudience: "Young professionals wanting financial freedom", ctaType: "share", slideCount: 6, tone: "Bold & Direct", color: "#7c3aed" },
  { id: "results", emoji: "📈", label: "Client Results", desc: "Proof-based credibility carousel", niche: "Coaching", goal: "sell", topic: "How my client went from 0 to $10K/mo in 90 days", targetAudience: "Aspiring coaches and consultants", ctaType: "dm", slideCount: 7, tone: "Storytelling", color: "#d4b461" },
  { id: "framework", emoji: "🧩", label: "Framework Breakdown", desc: "Teach a system in slides", niche: "Productivity", goal: "authority", topic: "The 4-step system I use to get 10x more done", targetAudience: "Entrepreneurs and founders", ctaType: "follow", slideCount: 6, tone: "Engaging & Educational", color: "#10b981" },
  { id: "story", emoji: "✨", label: "Origin Story", desc: "Personal journey that builds trust", niche: "Personal Brand", goal: "authority", topic: "How I went from broke to building a 6-figure brand", targetAudience: "Aspiring creators and entrepreneurs", ctaType: "follow", slideCount: 9, tone: "Storytelling", color: "#ec4899" },
  { id: "comparison", emoji: "⚔️", label: "This vs That", desc: "Comparison that educates", niche: "Tech", goal: "educate", topic: "Notion vs Obsidian — which one actually wins?", targetAudience: "Productivity enthusiasts and knowledge workers", ctaType: "save", slideCount: 6, tone: "Data-Driven", color: "#0ea5e9" },
  { id: "launch", emoji: "🚀", label: "Product Launch", desc: "Hype-building sales carousel", niche: "E-commerce", goal: "sell", topic: "Introducing my new course — here's what's inside", targetAudience: "People interested in the niche topic", ctaType: "link", slideCount: 8, tone: "Motivational", color: "#f97316" },
];

const CAROUSEL_GOALS = [
  { id: "educate", label: "Educate", icon: "📚", desc: "Teach something valuable" },
  { id: "grow", label: "Grow Followers", icon: "📈", desc: "Attract new audience" },
  { id: "sell", label: "Drive Sales", icon: "🛒", desc: "Sell a product or offer" },
  { id: "authority", label: "Build Authority", icon: "🏆", desc: "Position as expert" },
  { id: "viral", label: "Go Viral", icon: "🚀", desc: "Maximize shares & reach" },
  { id: "engagement", label: "Boost Engagement", icon: "❤️", desc: "Get saves & comments" },
];

const CAROUSEL_CTA_OPTIONS = [
  { id: "save", label: "Save This" },
  { id: "share", label: "Share" },
  { id: "follow", label: "Follow Me" },
  { id: "dm", label: "DM Me" },
  { id: "link", label: "Link in Bio" },
  { id: "comment", label: "Comment Below" },
  { id: "swipe", label: "Swipe →" },
  { id: "custom", label: "Custom" },
];

const CAROUSEL_STYLES = [
  { id: "minimal", label: "Minimal", desc: "Clean & elegant" },
  { id: "bold", label: "Bold", desc: "High contrast" },
  { id: "aesthetic", label: "Aesthetic", desc: "Warm & soft" },
  { id: "modern", label: "Modern", desc: "Dark & sharp" },
  { id: "luxury", label: "Luxury", desc: "Black & gold" },
  { id: "casual", label: "Casual", desc: "Light & fun" },
];

const CAROUSEL_STYLE_PREVIEWS: Record<string, { bg: string; accent: string }> = {
  minimal: { bg: "#f8f9fa", accent: "#111111" },
  bold: { bg: "#000000", accent: "#ff3366" },
  aesthetic: { bg: "#faf5ee", accent: "#c9a96e" },
  modern: { bg: "#0f172a", accent: "#38bdf8" },
  luxury: { bg: "#0c0c0c", accent: "#d4b461" },
  casual: { bg: "#f0f9ff", accent: "#06b6d4" },
};

const CAROUSEL_HOOK_STYLES = [
  { id: "curiosity", label: "Curiosity Question", example: '"What if I told you…"' },
  { id: "bold-stat", label: "Bold Statistic", example: '"95% of creators fail at this…"' },
  { id: "story", label: "Story Opening", example: '"3 years ago I was broke…"' },
  { id: "challenge", label: "Challenge", example: '"Most people can\'t answer this…"' },
  { id: "bold-claim", label: "Bold Claim", example: '"This changed everything…"' },
  { id: "relatable", label: "Relatable", example: '"We\'ve all been there…"' },
];

const CAROUSEL_DEPTH = [
  { id: "quick", label: "Quick Hits", desc: "Punchy, fast-paced slides", emoji: "⚡" },
  { id: "balanced", label: "Balanced", desc: "Mix of hooks + insights", emoji: "⚖️" },
  { id: "deep-dive", label: "Deep Dive", desc: "Detailed, educational", emoji: "🔬" },
];

const NICHE_SUGGESTIONS = [
  "Fitness", "Personal Finance", "Marketing", "Coaching", "E-commerce",
  "Personal Brand", "Tech", "Health", "Real Estate", "Productivity",
  "Mindset", "Fashion", "Food", "Travel", "Photography",
];

function genId() { return Math.random().toString(36).slice(2, 9); }

// ── Canvas renderer ───────────────────────────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" "); let line = ""; let cy = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line !== "") { ctx.fillText(line.trim(), x, cy); line = w + " "; cy += lh; }
    else line = test;
  }
  ctx.fillText(line.trim(), x, cy); return cy;
}
async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function renderSlide(slide: DesignSlide, t: ThemeData, num: number, total: number): Promise<string> {
  const S = 1080; 
  const canvas = document.createElement("canvas"); 
  canvas.width = S; 
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  
  // Get custom values or defaults
  const headlineSize = slide.headlineSize || 72;
  const bodySize = slide.bodySize || 36;
  const overlayOpacity = slide.overlayOpacity !== undefined ? slide.overlayOpacity : 0.58;
  const headlineColor = slide.headlineColor || t.headline;
  const textColor = slide.textColor || t.body;
  
  if (slide.layout === "split" && slide.imageUrl) {
    const W = S / 2; 
    const img = await loadImg(slide.imageUrl);
    const sc = Math.max(W / img.width, S / img.height); 
    const dw = img.width * sc; 
    const dh = img.height * sc;
    ctx.save(); 
    ctx.beginPath(); 
    ctx.rect(0, 0, W, S); 
    ctx.clip(); 
    ctx.drawImage(img, (W-dw)/2, (S-dh)/2, dw, dh); 
    ctx.restore();
    ctx.fillStyle = t.bg; 
    ctx.fillRect(W, 0, W, S);
    ctx.fillStyle = t.accent; 
    ctx.fillRect(W, 0, 6, S);
    const tx = W + 60; 
    const tw = W - 100;
    ctx.fillStyle = t.accent; 
    ctx.beginPath(); 
    ctx.roundRect(tx, 80, 70, 32, 8); 
    ctx.fill();
    ctx.fillStyle = t.accentText; 
    ctx.font = "bold 17px Inter,Arial,sans-serif"; 
    ctx.textAlign = "center";
    ctx.fillText(`${num}/${total}`, tx + 35, 102);
    ctx.fillStyle = headlineColor; 
    ctx.font = `bold ${Math.floor(headlineSize * 0.8)}px Inter,Arial,sans-serif`; 
    ctx.textAlign = "left";
    const hy = wrapText(ctx, slide.headline || "Your Headline", tx, 200, tw, Math.floor(headlineSize * 0.9));
    ctx.fillStyle = t.accent; 
    ctx.fillRect(tx, hy + 28, 60, 4);
    ctx.fillStyle = textColor; 
    ctx.font = `${Math.floor(bodySize * 0.9)}px Inter,Arial,sans-serif`; 
    wrapText(ctx, slide.body || "", tx, hy + 68, tw, Math.floor(bodySize * 1.3));
  } else {
    // Draw background image if exists
    if (slide.imageUrl && slide.layout !== "text") {
      const img = await loadImg(slide.imageUrl); 
      const sc = Math.max(S/img.width, S/img.height);
      ctx.drawImage(img, (S-img.width*sc)/2, (S-img.height*sc)/2, img.width*sc, img.height*sc);
      
      // Apply custom overlay opacity
      const overlayColor = t.overlay.match(/rgba?\(([^)]+)\)/);
      if (overlayColor) {
        const [r, g, b] = overlayColor[1].split(',').map(v => parseInt(v.trim()));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${overlayOpacity})`;
      } else {
        ctx.fillStyle = t.overlay;
      }
      ctx.fillRect(0,0,S,S);
      
      // Add gradient for better text contrast
      const gradient = ctx.createLinearGradient(0, 0, 0, S);
      gradient.addColorStop(0, `rgba(0,0,0,${overlayOpacity * 0.3})`);
      gradient.addColorStop(0.5, `rgba(0,0,0,${overlayOpacity * 0.5})`);
      gradient.addColorStop(1, `rgba(0,0,0,${overlayOpacity * 0.4})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, S, S);
    } else { 
      ctx.fillStyle = t.bg; 
      ctx.fillRect(0,0,S,S); 
    }
    
    // Top accent bar
    ctx.fillStyle = t.accent; 
    ctx.fillRect(0,0,S,8);
    
    // Slide number badge
    ctx.fillStyle = t.accent; 
    ctx.beginPath(); 
    ctx.roundRect(S/2-36,50,72,36,10); 
    ctx.fill();
    ctx.fillStyle = t.accentText; 
    ctx.font = "bold 19px Inter,Arial,sans-serif"; 
    ctx.textAlign = "center"; 
    ctx.fillText(`${num} / ${total}`, S/2, 74);
    
    // Custom text position or default
    const baseY = slide.textPosition?.y || 220;
    
    // Headline with shadow for better readability
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = headlineColor; 
    ctx.font = `bold ${headlineSize}px Inter,Arial,sans-serif`; 
    ctx.textAlign = "center";
    const hy = wrapText(ctx, slide.headline || "Your Headline", S/2, baseY, S-130, Math.floor(headlineSize * 1.2));
    
    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    
    // Accent line
    ctx.fillStyle = t.accent; 
    ctx.fillRect(S/2-60, hy+28, 120, 5);
    
    // Body text with shadow
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = textColor; 
    ctx.font = `${bodySize}px Inter,Arial,sans-serif`; 
    ctx.textAlign = "center";
    wrapText(ctx, slide.body || "", S/2, hy+76, S-170, Math.floor(bodySize * 1.4));
    
    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }
  
  // Watermark
  ctx.fillStyle = "rgba(255,255,255,0.22)"; 
  ctx.font = "20px Inter,Arial,sans-serif"; 
  ctx.textAlign = "right";
  ctx.fillText("oravini", S-36, S-28);
  
  // Bottom accent bar
  ctx.fillStyle = t.accent; 
  ctx.fillRect(0, S-8, S, 8);
  
  return canvas.toDataURL("image/png");
}

// ── Slide Preview Component ───────────────────────────────────────────────────
function SlidePreview({ slide, theme: t, num, total, mini = false }: { slide: DesignSlide; theme: typeof THEMES[ThemeKey]; num: number; total: number; mini?: boolean }) {
  const hs = mini ? "7px" : "20px"; const bs = mini ? "4px" : "12px"; const pad = mini ? "3px" : "18px"; const bads = mini ? "4px" : "10px";
  if (slide.layout === "split" && slide.imageUrl) return (
    <div className="w-full h-full flex" style={{ background: t.bg }}>
      <div className="w-1/2 h-full overflow-hidden"><img src={slide.imageUrl} alt="" className="w-full h-full object-cover" /></div>
      <div style={{ width: "4px", background: t.accent, flexShrink: 0 }} />
      <div className="flex-1 flex flex-col justify-center" style={{ padding: pad }}>
        <div style={{ background: t.accent, color: t.accentText, fontSize: bads, borderRadius: 4, padding: "2px 6px", display: "inline-block", marginBottom: 8, fontWeight: 700, alignSelf: "flex-start" }}>{num}/{total}</div>
        <div style={{ color: t.headline, fontSize: hs, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>{slide.headline || <span style={{ opacity: 0.3 }}>Headline…</span>}</div>
        <div style={{ color: t.body, fontSize: bs, lineHeight: 1.5, opacity: 0.9 }}>{slide.body}</div>
      </div>
    </div>
  );
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative" style={{ background: slide.imageUrl && slide.layout !== "text" ? undefined : t.bg, overflow: "hidden" }}>
      {slide.imageUrl && slide.layout !== "text" && (<><img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: t.overlay }} /></>)}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: mini ? "2px" : "8px", background: t.accent }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: pad }}>
        <div style={{ background: t.accent, color: t.accentText, fontSize: bads, borderRadius: 4, padding: "2px 8px", display: "inline-block", marginBottom: 10, fontWeight: 700 }}>{num}/{total}</div>
        <div style={{ color: t.headline, fontSize: hs, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>{slide.headline || <span style={{ opacity: 0.3 }}>Headline…</span>}</div>
        {!mini && <div style={{ width: 40, height: 3, background: t.accent, margin: "0 auto 8px" }} />}
        <div style={{ color: t.body, fontSize: bs, lineHeight: 1.5, opacity: 0.9 }}>{slide.body}</div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: mini ? "2px" : "8px", background: t.accent }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CarouselStudio({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Pull survey niche for smarter placeholder
  const { data: meData } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const surveyNiche: string = (meData as any)?.fields?.[0] || "";
  const surveyStruggles: string[] = (meData as any)?.struggles || [];
  const topStruggle = surveyStruggles[0] || "";

  // Setup state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [slideCount, setSlideCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [pendingSlides, setPendingSlides] = useState<DesignSlide[]>([]);

  // New config state (Story-Generator style)
  const [, navigate] = useLocation();
  const [carouselGoal, setCarouselGoal] = useState("");
  const [nicheInput, setNicheInput] = useState(surveyNiche || "");
  const [showNicheSugg, setShowNicheSugg] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [ctaType, setCtaType] = useState("save");
  const [ctaCustom, setCtaCustom] = useState("");
  const [visualStyle, setVisualStyle] = useState("minimal");
  const [hookStyle, setHookStyle] = useState("curiosity");
  const [contentDepth, setContentDepth] = useState("balanced");
  const [selectedInspo, setSelectedInspo] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Slides state
  const [slides, setSlides] = useState<DesignSlide[]>([]);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Design state
  const [theme, setTheme] = useState<ThemeKey>("brandverse");
  const [customAccent, setCustomAccent] = useState("#d4b461");
  const [applyToAll, setApplyToAll] = useState(true);
  const [globalImage, setGlobalImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [generatingImageIdx, setGeneratingImageIdx] = useState<number | "all" | null>(null);
  const [showDesignAssignment, setShowDesignAssignment] = useState(false);
  const [designAssignmentMode, setDesignAssignmentMode] = useState<"manual" | "ai">("manual");
  const [autoApplyDesigns, setAutoApplyDesigns] = useState(false);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [editHistory, setEditHistory] = useState<DesignSlide[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // New feature states
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false);
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [activeBrandKit, setActiveBrandKit] = useState<BrandKit | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [bulkTopics, setBulkTopics] = useState<string[]>([]);
  const [competitorUrl, setCompetitorUrl] = useState("");

  // Generate more + refine state
  const [addCount, setAddCount] = useState(3);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);

  // Right panel tab: "design" | "history"
  const [rightTab, setRightTab] = useState<"design" | "history">("design");

  // Export state
  const [exporting, setExporting] = useState(false);

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const globalRef = useRef<HTMLInputElement>(null);
  const multiRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const effectiveTheme: ThemeData = theme === "custom"
    ? { ...THEMES.custom, accent: customAccent, accentText: "#000000" }
    : THEMES[theme];
  const t = effectiveTheme;

  // History
  const { data: carouselHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/history?tool=carousel"],
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function readFile(file: File): Promise<string> {
    return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target!.result as string); fr.readAsDataURL(file); });
  }

  function updateSlide(idx: number, updates: Partial<DesignSlide>) {
    setSlides(prev => {
      const newSlides = prev.map((s, i) => i === idx ? { ...s, ...updates } : s);
      // Save to history for undo/redo
      setEditHistory(h => [...h.slice(0, historyIndex + 1), newSlides]);
      setHistoryIndex(i => i + 1);
      return newSlides;
    });
  }

  function undo() {
    if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setSlides(editHistory[historyIndex - 1]);
      toast({ title: "Undo" });
    }
  }

  function redo() {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(i => i + 1);
      setSlides(editHistory[historyIndex + 1]);
      toast({ title: "Redo" });
    }
  }

  function saveToHistory(generatedSlides: DesignSlide[], currentTopic: string) {
    apiRequest("POST", "/api/ai/history", {
      tool: "carousel",
      title: currentTopic.slice(0, 80),
      inputs: { topic: currentTopic, tone, slideCount },
      output: { slides: generatedSlides.map(s => ({ role: s.role, headline: s.headline, body: s.body })), theme },
    }).then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=carousel"] })).catch(() => {});
  }

  function restoreFromHistory(item: any) {
    const restoredSlides: DesignSlide[] = (item.output?.slides || []).map((s: any) => ({
      ...s,
      imageUrl: null,
      layout: "full" as const,
    }));
    setSlides(restoredSlides);
    setTopic(item.inputs?.topic || item.title || "");
    setTone(item.inputs?.tone || TONES[0]);
    if (item.output?.theme) setTheme(item.output.theme as ThemeKey);
    setActiveIdx(0);
    setRightTab("design");
    toast({ title: "Carousel restored!", description: "Text is loaded — add images and export." });
  }

  function deleteHistory(id: number) {
    apiRequest("DELETE", `/api/ai/history/${id}`)
      .then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=carousel"] }))
      .catch(() => {});
  }

  // ── Generate text (with 45s GeneratingScreen) ─────────────────────────────
  function applyCarouselInspo(ins: CarouselInspo) {
    setSelectedInspo(ins.id);
    setCarouselGoal(ins.goal);
    setTopic(ins.topic);
    setNicheInput(ins.niche);
    setTargetAudience(ins.targetAudience);
    setCtaType(ins.ctaType);
    setSlideCount(ins.slideCount);
    setTone(ins.tone);
  }

  async function generateText() {
    if (!topic.trim()) { toast({ title: "Enter a topic first", variant: "destructive" }); return; }
    setGenerating(true);
    setApiDone(false);
    setPendingSlides([]);
    try {
      const data = await apiRequest("POST", "/api/carousel/generate-text", { topic: topic.trim(), tone, slideCount });
      const designed: DesignSlide[] = (data.slides as AiSlide[]).map(s => ({ ...s, imageUrl: null, layout: "full" as const }));
      setPendingSlides(designed);
      setApiDone(true);
    } catch (err: any) {
      setGenerating(false);
      setApiDone(false);
      if (err instanceof ApiError && err.status === 402) {
        toast({ title: "Not enough credits", description: "Upgrade your plan to generate more carousels.", variant: "destructive" });
      } else if (err instanceof ApiError && err.status === 401) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
      } else {
        toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      }
    }
  }

  function handleDoneGenerating() {
    setSlides(pendingSlides);
    setActiveIdx(0);
    saveToHistory(pendingSlides, topic.trim());
    setGenerating(false);
    toast({ title: `${pendingSlides.length} slides ready!`, description: "Add images and export your carousel." });
  }

  // ── Generate more slides ────────────────────────────────────────────────────
  async function generateMoreSlides() {
    if (!topic.trim() || slides.length === 0) return;
    setGeneratingMore(true);
    try {
      const existingRoles = slides.map(s => s.role);
      const data = await apiRequest("POST", "/api/carousel/add-slides", { topic: topic.trim(), tone, addCount, existingRoles });
      const newSlides: DesignSlide[] = (data.slides as AiSlide[]).map(s => ({ ...s, imageUrl: null, layout: "full" as const }));
      setSlides(prev => [...prev, ...newSlides]);
      setActiveIdx(slides.length);
      toast({ title: `${newSlides.length} more slides added!`, description: `2 credits used · ${data.balance} remaining` });
    } catch (err: any) {
      const msg = err instanceof ApiError && err.status === 401 ? "Session expired. Please log in again." : err.message;
      toast({ title: "Failed to add slides", description: msg, variant: "destructive" });
    } finally { setGeneratingMore(false); }
  }

  // ── Refine all slides with AI ───────────────────────────────────────────────
  async function refineAll() {
    if (!refineInput.trim() || slides.length === 0) {
      toast({ title: "Enter a refinement prompt first", variant: "destructive" }); return;
    }
    setRefining(true);
    try {
      const data = await apiRequest("POST", "/api/carousel/refine", { topic, tone, slides, prompt: refineInput.trim() });
      const refined: DesignSlide[] = (data.slides as AiSlide[]).map((s, i) => ({
        ...s,
        imageUrl: slides[i]?.imageUrl ?? null,
        layout: slides[i]?.layout ?? "full" as const,
      }));
      setSlides(refined);
      setRefineInput("");
      toast({ title: "Carousel refined!", description: "2 credits used." });
    } catch (err: any) {
      const msg = err instanceof ApiError && err.status === 401 ? "Session expired. Please log in again." : err.message;
      toast({ title: "Refinement failed", description: msg, variant: "destructive" });
    } finally { setRefining(false); }
  }

  // ── Regenerate single slide ────────────────────────────────────────────────
  async function regenerateSlide(idx: number) {
    setRegenIdx(idx);
    try {
      const s = slides[idx];
      const data = await apiRequest("POST", "/api/carousel/regenerate-slide", { topic, tone, role: s.role, slideNum: idx + 1, totalSlides: slides.length });
      updateSlide(idx, { headline: data.headline, body: data.body });
      toast({ title: `Slide ${idx + 1} regenerated` });
    } catch (err: any) {
      const msg = err instanceof ApiError && err.status === 401 ? "Session expired. Please log in again." : err.message;
      toast({ title: "Regeneration failed", description: msg, variant: "destructive" });
    } finally { setRegenIdx(null); }
  }

  // ── Image handling ─────────────────────────────────────────────────────────
  async function handleGlobalImage(file: File) {
    const url = await readFile(file);
    setGlobalImage(url);
    if (applyToAll) setSlides(prev => prev.map(s => s.layout !== "text" ? { ...s, imageUrl: url } : s));
    toast({ title: "Design image applied" });
  }

  async function handleMultiUpload(files: FileList) {
    const urls: string[] = [];
    for (let i = 0; i < Math.min(files.length, 10); i++) urls.push(await readFile(files[i]));
    setUploadedImages(prev => [...prev, ...urls].slice(0, 10));
    
    // Auto-apply designs to slides if enabled
    if (autoApplyDesigns && slides.length > 0) {
      autoAssignDesignsToSlides(urls);
    }
    
    toast({ title: `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded` });
  }

  function autoAssignDesignsToSlides(designs: string[]) {
    const allDesigns = [...uploadedImages, ...designs];
    
    // Smart assignment: distribute designs evenly across slides
    setSlides(prev => prev.map((slide, idx) => {
      const designIdx = idx % allDesigns.length;
      return {
        ...slide,
        imageUrl: allDesigns[designIdx],
        layout: "full" as const
      };
    }));
    
    toast({ 
      title: "Designs auto-applied!", 
      description: `${allDesigns.length} designs distributed across ${slides.length} slides` 
    });
  }

  function applyDesignsIntelligently() {
    if (uploadedImages.length === 0 || slides.length === 0) {
      toast({ title: "Upload designs first", variant: "destructive" });
      return;
    }

    // Intelligent assignment based on slide roles
    setSlides(prev => prev.map((slide, idx) => {
      let designIdx = 0;
      
      // Assign designs based on slide role/type
      if (slide.role === "Hook" || slide.role === "CTA") {
        // Use first design for important slides
        designIdx = 0;
      } else if (slide.role === "Problem" || slide.role === "Solution") {
        // Use second design if available
        designIdx = Math.min(1, uploadedImages.length - 1);
      } else {
        // Distribute remaining designs
        designIdx = idx % uploadedImages.length;
      }
      
      return {
        ...slide,
        imageUrl: uploadedImages[designIdx],
        layout: "full" as const
      };
    }));
    
    toast({ 
      title: "Smart assignment complete!", 
      description: "Designs intelligently matched to slide types" 
    });
  }

  function assignImageToSlide(slideIdx: number, imgUrl: string) {
    updateSlide(slideIdx, { imageUrl: imgUrl, layout: "full" });
  }

  function handleDesignAssignment(designIdx: number, slideIdx: number) {
    const imgUrl = uploadedImages[designIdx];
    if (imgUrl) {
      updateSlide(slideIdx, { imageUrl: imgUrl, layout: "full" });
      toast({ title: `Design ${designIdx + 1} assigned to slide ${slideIdx + 1}` });
    }
  }

  // ── AI Image Generation ────────────────────────────────────────────────────
  async function generateAiImageForSlide(idx: number) {
    const slide = slides[idx];
    const prompt = `${slide.role} slide background for an Instagram carousel. Topic: "${topic}". Visual concept: ${slide.headline}. Style: cinematic, professional, no text, vibrant lighting, editorial photography, 1:1 square format, clean background, high contrast, modern aesthetic`;
    setGeneratingImageIdx(idx);
    try {
      const data = await apiRequest("POST", "/api/carousel/generate-image", { prompt });
      const imgUrl = data.imageBase64 || data.url;
      if (imgUrl) {
        updateSlide(idx, { imageUrl: imgUrl, layout: "full" });
        toast({ title: `AI image generated for slide ${idx + 1}!`, description: `Powered by ${data.provider === "google" ? "Google Imagen" : "Runware AI"}` });
      }
    } catch (err: any) {
      toast({ title: "Image generation failed", description: err.message, variant: "destructive" });
    } finally { setGeneratingImageIdx(null); }
  }

  async function generateAiImagesForAll() {
    setGeneratingImageIdx("all");
    let success = 0;
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const prompt = `${slide.role} slide background for an Instagram carousel. Topic: "${topic}". Visual concept: ${slide.headline}. Style: cinematic, professional, no text, vibrant, editorial photography, 1:1 format, modern`;
      try {
        const data = await apiRequest("POST", "/api/carousel/generate-image", { prompt });
        const imgUrl = data.imageBase64 || data.url;
        if (imgUrl) { setSlides(prev => prev.map((s, si) => si === i ? { ...s, imageUrl: imgUrl, layout: "full" } : s)); success++; }
      } catch { /* continue to next */ }
      await new Promise(r => setTimeout(r, 300));
    }
    setGeneratingImageIdx(null);
    toast({ title: `AI images generated for ${success}/${slides.length} slides!` });
  }

  function applyAllSameImage() {
    if (!globalImage) { toast({ title: "Upload a design image first", variant: "destructive" }); return; }
    setSlides(prev => prev.map(s => s.layout !== "text" ? { ...s, imageUrl: globalImage } : s));
    toast({ title: "Applied to all slides" });
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async function downloadOne(idx: number) {
    const dataUrl = await renderSlide(slides[idx], effectiveTheme, idx + 1, slides.length);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `slide-${idx + 1}-${slides[idx].role.toLowerCase()}.png`;
    a.click();
  }

  async function downloadAll() {
    setExporting(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlide(slides[i], effectiveTheme, i + 1, slides.length);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `slide-${i + 1}-${slides[i].role.toLowerCase()}.png`;
        a.click();
        await new Promise(r => setTimeout(r, 250));
      }
      toast({ title: `${slides.length} slides downloaded!` });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }

  function saveProject() {
    const blob = new Blob([JSON.stringify({ slides, theme, topic, tone }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "carousel-project.json"; a.click();
  }

  function loadProject(file: File) {
    const fr = new FileReader();
    fr.onload = e => {
      try {
        const d = JSON.parse(e.target!.result as string);
        if (d.slides) { setSlides(d.slides); if (d.theme) setTheme(d.theme); if (d.topic) setTopic(d.topic); if (d.tone) setTone(d.tone); setActiveIdx(0); toast({ title: "Project loaded!" }); }
      } catch { toast({ title: "Invalid file", variant: "destructive" }); }
    };
    fr.readAsText(file);
  }

  // ── Right Panel: Design Tab ────────────────────────────────────────────────
  function DesignPanel() {
    return (
      <div className="space-y-5">
        {/* Template picker */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><LayoutTemplate className="w-3 h-3" />Theme</p>
          <div className="space-y-1.5">
            {(Object.keys(THEMES) as ThemeKey[]).map(key => (
              <button key={key} onClick={() => setTheme(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${theme === key ? "border-[#d4b461]/70 text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/25"}`}
                data-testid={`theme-${key}`}>
                <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20" style={{ background: key === "custom" ? customAccent : THEMES[key].accent }} />
                {THEMES[key].name}
                {theme === key && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
          {/* Custom accent color picker */}
          {theme === "custom" && (
            <div className="mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#d4b461]/30 bg-[#d4b461]/5">
              <Palette className="w-3 h-3 text-[#d4b461] flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">Accent colour</span>
              <div className="relative flex items-center gap-2">
                <input
                  type="color"
                  value={customAccent}
                  onChange={e => setCustomAccent(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  data-testid="input-custom-accent"
                />
                <span className="text-[10px] font-mono text-zinc-400">{customAccent}</span>
              </div>
            </div>
          )}
        </div>

        {/* Layout toggle */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><ImagePlus className="w-3 h-3" />Slide Layout</p>
          <div className="flex gap-1.5">
            {["full", "split", "text"].map(l => (
              <button key={l} onClick={() => slides[activeIdx] && updateSlide(activeIdx, { layout: l as any })}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all capitalize ${slides[activeIdx]?.layout === l ? "border-[#d4b461]/60 text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/25"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* AI Images */}
        <div className="rounded-xl p-3.5 space-y-3" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#d4b461" }}><Sparkles className="w-3 h-3" />AI Images</p>
          <button onClick={generateAiImagesForAll} disabled={generatingImageIdx !== null}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: "#d4b461", color: "#000" }}
            data-testid="button-ai-images-all">
            {generatingImageIdx === "all" ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating all…</> : <><Zap className="w-3 h-3" />Generate All {slides.length} Slides</>}
          </button>
          <button onClick={() => generateAiImageForSlide(activeIdx)} disabled={generatingImageIdx !== null}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-white/15 text-muted-foreground hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
            data-testid={`button-ai-image-active`}>
            {generatingImageIdx === activeIdx ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating…</> : <><Sparkles className="w-3 h-3" />Generate for Slide {activeIdx + 1}</>}
          </button>
        </div>

        {/* Upload images */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Upload Designs</p>
          </div>
          <input ref={multiRef} type="file" accept="image/*" multiple className="hidden"
            onChange={async e => { const files = e.target.files; if (files) { await handleMultiUpload(files); } e.target.value = ""; }} />
          
          {uploadedImages.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden aspect-square border border-white/10 hover:border-[#d4b461]/40 transition-all group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">Design {idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Quick Actions */}
              <div className="space-y-2">
                <button onClick={applyDesignsIntelligently}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "#d4b461", color: "#000" }}>
                  <Sparkles className="w-3.5 h-3.5" />Auto-Apply Text Over Designs
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowDesignAssignment(true)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-medium border border-[#d4b461]/30 text-[#d4b461] hover:bg-[#d4b461]/10 transition-all">
                    <Layers className="w-3 h-3" />Manual Assign
                  </button>
                  <button onClick={() => setUploadedImages([])}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-400/30 transition-all">
                    <Trash2 className="w-3 h-3" />Clear All
                  </button>
                </div>
                
                {uploadedImages.length === 1 && (
                  <button onClick={applyAllSameImage}
                    className="w-full py-2 rounded-lg text-[10px] font-medium bg-[#d4b461]/20 text-[#d4b461] border border-[#d4b461]/30 hover:bg-[#d4b461]/30 transition-all">
                    Apply This Design to All Slides
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => multiRef.current?.click()}
                className="w-full h-20 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-[#d4b461]/40 hover:text-[#d4b461] transition-all">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-semibold">Upload Your Designs</span>
                <span className="text-[9px] text-zinc-600">Up to 10 images • Auto-overlay text</span>
              </button>
              
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#d4b461] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#d4b461] mb-1">Smart Text Overlay</p>
                    <p className="text-[9px] text-zinc-500 leading-relaxed">
                      Upload your brand images and AI will automatically overlay your carousel text with perfect formatting, fonts, and positioning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Refine with AI */}
        {slides.length > 0 && (
          <div className="rounded-xl p-3.5 space-y-3" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#a855f7" }}><Brain className="w-3 h-3" />Refine with AI</p>
            <Textarea
              value={refineInput}
              onChange={e => setRefineInput(e.target.value)}
              placeholder="e.g. Make it more urgent, add more emotion, use a storytelling angle…"
              className="text-xs min-h-[70px] resize-none"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(168,85,247,0.2)", color: "#e2e8f0" }}
              data-testid="input-refine-prompt"
            />
            <button onClick={refineAll} disabled={refining || !refineInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              style={{ background: "#a855f7", color: "#fff" }}
              data-testid="button-refine-all">
              {refining ? <><RefreshCw className="w-3 h-3 animate-spin" />Refining…</> : <><Wand2 className="w-3 h-3" />Refine All Slides</>}
            </button>
          </div>
        )}

        {/* Export */}
        <div className="space-y-2 pt-1">
          <button onClick={downloadAll} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            style={{ background: "#d4b461", color: "#000" }}
            data-testid="button-download-all">
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Downloading…" : `Download All (${slides.length})`}
          </button>
          <button onClick={() => downloadOne(activeIdx)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-all"
            data-testid="button-download-slide">
            <Download className="w-3 h-3" /> This Slide
          </button>
          <button onClick={saveProject}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-all">
            <Download className="w-3 h-3" /> Save Project (.json)
          </button>
        </div>

        {/* Instagram Auto-Post - Coming Soon */}
        <div className="rounded-xl p-3.5 space-y-2" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#a855f7" }}>
              <Target className="w-3 h-3" />Auto-Post to Instagram
            </p>
            <Badge className="text-[8px] h-4 px-2" style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}>Coming Soon</Badge>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">Post your carousel directly to Instagram with one click. Schedule posts and track performance.</p>
        </div>
      </div>
    );
  }

  // ── Right Panel: History Tab ───────────────────────────────────────────────
  function HistoryPanel() {
    if (!carouselHistory.length) {
      return (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <History className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No carousels yet — generate one to see it here</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {(carouselHistory as any[]).map((item: any) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-white/3 hover:border-[#d4b461]/30 transition-all group"
            data-testid={`carousel-history-${item.id}`}>
            <div className="p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(212,180,97,0.1)" }}>
                <Layers className="w-4 h-4" style={{ color: "#d4b461" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate" title={item.title}>{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{item.inputs?.slideCount || "?"} slides</span>
                  <span className="text-[10px] text-zinc-700">·</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => restoreFromHistory(item)}
                  className="p-1.5 rounded-lg bg-[#d4b461]/10 text-[#d4b461] hover:bg-[#d4b461]/20 transition-colors"
                  title="Restore" data-testid={`restore-carousel-${item.id}`}>
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button onClick={() => deleteHistory(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Design Assignment Modal ────────────────────────────────────────────────
  function DesignAssignmentModal() {
    if (!showDesignAssignment) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur flex items-center justify-center p-4" onClick={() => setShowDesignAssignment(false)}>
        <div className="relative w-full max-w-3xl bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#d4b461]" />
              <span className="text-sm font-semibold text-white">Assign Designs to Slides</span>
            </div>
            <button onClick={() => setShowDesignAssignment(false)} className="text-zinc-400 hover:text-white text-xl">×</button>
          </div>
          
          <div className="p-5 max-h-96 overflow-y-auto space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl">
              <button onClick={() => setDesignAssignmentMode("manual")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${designAssignmentMode === "manual" ? "bg-[#d4b461] text-black" : "text-zinc-400"}`}>
                Manual Assignment
              </button>
              <button onClick={() => setDesignAssignmentMode("ai")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${designAssignmentMode === "ai" ? "bg-[#d4b461] text-black" : "text-zinc-400"}`}>
                AI Smart Assignment
              </button>
            </div>

            {designAssignmentMode === "manual" ? (
              <>
              <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: "rgba(212,180,97,0.08)", border: "1px solid rgba(212,180,97,0.25)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#d4b461]">💡 Pro Tip</p>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Click the slide numbers below each design to assign. Your carousel text will automatically overlay with perfect formatting.
                </p>
              </div>
              <div className="space-y-3">
                {uploadedImages.map((img, designIdx) => (
                  <div key={designIdx} className="rounded-xl border border-zinc-800 p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white mb-1">Design {designIdx + 1}</p>
                        <p className="text-[10px] text-zinc-500">Click slides below to assign this design</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                      {slides.map((_, slideIdx) => (
                        <button key={slideIdx} onClick={() => handleDesignAssignment(designIdx, slideIdx)}
                          className={`aspect-square rounded text-[10px] font-bold transition-all ${
                            slides[slideIdx]?.imageUrl === img
                              ? "bg-[#d4b461] text-black"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}>
                          {slideIdx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl p-4 bg-zinc-900 border border-zinc-800">
                  <p className="text-xs font-semibold text-white mb-2">🤖 AI Smart Assignment</p>
                  <p className="text-[10px] text-zinc-400 mb-3">Describe how you want designs assigned. AI will understand and apply automatically with text overlay:</p>
                  <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] text-zinc-500">• "Use design 1 for hook slides, design 2 for content"</p>
                    <p className="text-[10px] text-zinc-500">• "Apply design 1 to slides 1-3, design 2 to slides 4-7"</p>
                    <p className="text-[10px] text-zinc-500">• "Use bright designs for problem slides, calm for solutions"</p>
                    <p className="text-[10px] text-zinc-500">• "Alternate between design 1 and 2 throughout"</p>
                  </div>
                  <Textarea placeholder="e.g., Use design 1 for the first 3 slides, design 2 for middle slides, and design 3 for the CTA..." className="text-xs min-h-[90px] bg-zinc-950 border-zinc-700" />
                  <button className="w-full mt-3 py-2.5 rounded-xl bg-[#a855f7] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#a855f7]/90 transition-all">
                    <Brain className="w-3.5 h-3.5" />
                    Apply AI Assignment (Coming Soon)
                  </button>
                  <p className="text-[9px] text-zinc-600 text-center mt-2">Text will automatically overlay your designs with perfect formatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const content = (
    <div className="max-w-6xl mx-auto px-5 py-8">
      {showDesignAssignment && <DesignAssignmentModal />}

      {/* 45-second generating screen */}
      {generating && (
        <GeneratingScreen
          label="your carousel"
          minMs={45000}
          isComplete={apiDone}
          onReady={handleDoneGenerating}
          steps={["Crafting your Hook slide", "Writing value slides", "Building CTA", "Structuring the flow", "Final quality check"]}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
          <Sparkles className="w-4 h-4" style={{ color: "#d4b461" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Carousel Generator</h1>
          <p className="text-xs text-muted-foreground">AI writes your slides · add designs · export as 1080×1080 PNG</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowCompetitorAnalysis(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/10 transition-all">
            <Target className="w-3 h-3" /> Analyze Viral
          </button>
          <button onClick={() => setShowBrandKit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#d4b461]/30 text-[#d4b461] hover:bg-[#d4b461]/10 transition-all">
            <Palette className="w-3 h-3" /> Brand Kit
          </button>
          <button onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all">
            <LayoutTemplate className="w-3 h-3" /> Templates
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) loadProject(f); e.target.value = ""; }} />
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all">
            <Upload className="w-3 h-3" /> Import
          </button>
        </div>
      </div>

      {slides.length === 0 ? (
        /* ── SETUP SCREEN — Story-Generator style ────────────────────────── */
        <div className="max-w-2xl mx-auto px-2 py-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <button
              onClick={() => navigate("/ai-design")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto mb-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />AI Design Hub
            </button>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />Carousel Generator
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Build a <span className="text-primary">High-Converting</span> Carousel
            </h1>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              AI writes your slides — hook, value, CTA — then you design and export as 1080×1080 PNG.
            </p>
          </div>

          {/* History button */}
          <div className="flex justify-end">
            <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-primary/30 bg-zinc-900">
              <Clock className="w-3.5 h-3.5" />View History
            </button>
          </div>

          {/* Inspirations */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />Start with an Inspiration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CAROUSEL_INSPIRATIONS.map(ins => (
                <button key={ins.id} onClick={() => applyCarouselInspo(ins)}
                  className={`relative rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${selectedInspo === ins.id ? "border-primary bg-primary/8" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                  {selectedInspo === ins.id && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                  <div className="text-xl mb-1">{ins.emoji}</div>
                  <div style={{ color: ins.color }} className="text-[9px] font-bold uppercase tracking-wide mb-0.5">{ins.niche}</div>
                  <div className="text-xs font-bold text-white leading-tight">{ins.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{ins.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800/60" />

          {/* Goal */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white">Goal <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {CAROUSEL_GOALS.map(opt => (
                <button key={opt.id} onClick={() => setCarouselGoal(opt.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${carouselGoal === opt.id ? "border-primary bg-primary/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${carouselGoal === opt.id ? "text-primary" : "text-zinc-300"}`}>{opt.label}</span>
                  <span className="text-[9px] text-zinc-600">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Niche */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Niche</label>
            <div className="relative">
              <Input placeholder="Type your niche…" value={nicheInput}
                onChange={e => { setNicheInput(e.target.value); setShowNicheSugg(true); }}
                onFocus={() => setShowNicheSugg(true)}
                onBlur={() => setTimeout(() => setShowNicheSugg(false), 150)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
              {showNicheSugg && nicheInput.length < 20 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                  {NICHE_SUGGESTIONS.filter(s => s.toLowerCase().includes(nicheInput.toLowerCase()) || !nicheInput).slice(0, 6).map(s => (
                    <button key={s} onMouseDown={() => { setNicheInput(s); setShowNicheSugg(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">{s}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {NICHE_SUGGESTIONS.slice(0, 8).map(s => (
                <button key={s} onMouseDown={() => setNicheInput(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${nicheInput === s ? "bg-primary/20 text-primary border-primary/40" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>{s}</button>
              ))}
            </div>
          </div>

          {/* Topic + Audience */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Topic <span className="text-red-400">*</span></label>
              <Input placeholder="e.g. 5 mistakes that stop Instagram growth, how to get clients from DMs…" value={topic} onChange={e => setTopic(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
              {surveyNiche && !topic && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] text-zinc-500">Quick start:</span>
                  {[
                    topStruggle ? `How to overcome: ${topStruggle.toLowerCase()}` : null,
                    `5 mistakes in ${surveyNiche.toLowerCase()}`,
                    `${surveyNiche} tips for beginners`,
                  ].filter(Boolean).map(suggestion => (
                    <button key={suggestion!} onClick={() => setTopic(suggestion!)}
                      className="text-[10px] px-2.5 py-1 rounded-full border transition-all hover:border-primary/40 hover:text-primary"
                      style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)", color: "#d4b461" }}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Target Audience</label>
              <Input placeholder="e.g. Coaches with under 1k followers wanting to monetize" value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">CTA Type</label>
            <div className="flex flex-wrap gap-2">
              {CAROUSEL_CTA_OPTIONS.map(c => (
                <button key={c.id} onClick={() => setCtaType(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${ctaType === c.id ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>{c.label}</button>
              ))}
            </div>
            {ctaType === "custom" && (
              <Input placeholder="e.g. Subscribe to my newsletter" value={ctaCustom} onChange={e => setCtaCustom(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 mt-2" />
            )}
          </div>

          {/* Design & Style section */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Palette className="w-4 h-4 text-primary" />Carousel Design & Style</div>

            {/* Slide count slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400">Number of slides</label>
                <span className="text-primary font-bold text-sm">{slideCount}</span>
              </div>
              <input type="range" min={3} max={10} value={slideCount} onChange={e => setSlideCount(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-zinc-600"><span>3</span><span>10</span></div>
            </div>

            {/* Visual style */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Visual style</label>
              <div className="grid grid-cols-3 gap-2">
                {CAROUSEL_STYLES.map(s => (
                  <button key={s.id} onClick={() => setVisualStyle(s.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${visualStyle === s.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                    <div className="w-6 h-4 rounded" style={{ background: CAROUSEL_STYLE_PREVIEWS[s.id]?.bg || "#fff", border: `2px solid ${CAROUSEL_STYLE_PREVIEWS[s.id]?.accent || "#d4b461"}` }} />
                    <span className={`text-[10px] font-semibold ${visualStyle === s.id ? "text-primary" : "text-zinc-400"}`}>{s.label}</span>
                    <span className="text-[9px] text-zinc-600">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Tone of voice</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(tn => (
                  <button key={tn} onClick={() => setTone(tn)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${tone === tn ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                    {tn}
                  </button>
                ))}
              </div>
            </div>

            {/* Hook Style */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Opening hook style</label>
              <div className="space-y-1.5">
                {CAROUSEL_HOOK_STYLES.map(h => (
                  <button key={h.id} onClick={() => setHookStyle(h.id)}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${hookStyle === h.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                    <div className={`w-3 h-3 rounded-full border-2 mt-0.5 flex-shrink-0 ${hookStyle === h.id ? "bg-primary border-primary" : "border-zinc-600"}`} />
                    <div>
                      <div className={`text-xs font-semibold ${hookStyle === h.id ? "text-primary" : "text-zinc-300"}`}>{h.label}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{h.example}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Depth */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Content depth</label>
              <div className="grid grid-cols-3 gap-2">
                {CAROUSEL_DEPTH.map(d => (
                  <button key={d.id} onClick={() => setContentDepth(d.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${contentDepth === d.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                    <span className="text-lg">{d.emoji}</span>
                    <span className={`text-[10px] font-bold ${contentDepth === d.id ? "text-primary" : "text-zinc-300"}`}>{d.label}</span>
                    <span className="text-[9px] text-zinc-600 leading-tight">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={generateText} disabled={generating || !topic.trim() || !carouselGoal}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl">
              <Wand2 className="w-4 h-4 mr-2" />Generate Carousel
            </Button>
            <Button onClick={() => setShowVoiceRecorder(true)}
              className="w-full h-12 text-sm font-bold bg-[#a855f7] hover:bg-[#a855f7]/90 text-white rounded-xl">
              <Sparkles className="w-4 h-4 mr-2" />Voice to Carousel
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">Uses 3 credits · AI writes Hook → Content → CTA structure automatically</p>
          
          {/* Bulk Create Button */}
          <button onClick={() => setShowBulkCreate(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#d4b461]/30 text-[#d4b461] hover:bg-[#d4b461]/5 transition-all flex items-center justify-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="text-sm font-semibold">Bulk Create Mode</span>
            <span className="text-xs text-zinc-500">· Generate 10 carousels at once</span>
          </button>

          {/* History modal */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur flex items-center justify-center p-4">
              <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden" style={{ maxHeight: 500 }}>
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-white">Past Carousels</span>
                  </div>
                  <button onClick={() => setShowHistoryModal(false)} className="text-zinc-400 hover:text-white text-lg">×</button>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <HistoryPanel />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── EDITOR SCREEN (slides generated) ────────────────────────────── */
        <div className="flex gap-4 min-h-[600px]">

          {/* Left: Slide strip */}
          <div className="w-28 flex-shrink-0 space-y-2 overflow-y-auto max-h-[calc(100vh-160px)]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center mb-3">{slides.length} Slides</p>
            {slides.map((s, i) => (
              <div key={i} onClick={() => setActiveIdx(i)}
                className="cursor-pointer space-y-1"
                data-testid={`slide-thumb-${i + 1}`}>
                <div className={`rounded-lg overflow-hidden transition-all border-2 ${i === activeIdx ? "border-[#d4b461]" : "border-white/10 hover:border-white/25"}`}
                  style={{ aspectRatio: "1/1", background: t.bg }}>
                  <SlidePreview slide={s} theme={t} num={i + 1} total={slides.length} mini />
                </div>
                <p className="text-[8px] text-center font-bold truncate" style={{ color: i === activeIdx ? ROLE_COLORS[s.role] || "#d4b461" : "rgba(255,255,255,0.3)" }}>
                  {i + 1}. {s.role}
                </p>
              </div>
            ))}
            <button onClick={() => { setSlides([]); setActiveIdx(0); }}
              className="w-full mt-3 py-2 rounded-xl border border-white/10 text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-all flex items-center justify-center gap-1.5"
              data-testid="button-new-carousel">
              <Plus className="w-3 h-3" /> New
            </button>

            {/* Generate More section */}
            <div className="mt-4 space-y-2 border-t border-white/8 pt-4">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">Add Slides</p>
              <div className="flex gap-1">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setAddCount(n)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${addCount === n ? "border-[#d4b461]/60 text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                    data-testid={`add-count-${n}`}>
                    +{n}
                  </button>
                ))}
              </div>
              <button onClick={generateMoreSlides} disabled={generatingMore}
                className="w-full py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "rgba(212,180,97,0.15)", color: "#d4b461", border: "1px solid rgba(212,180,97,0.3)" }}
                data-testid="button-generate-more">
                {generatingMore
                  ? <><RefreshCw className="w-3 h-3 animate-spin" />Adding…</>
                  : <><PlusCircle className="w-3 h-3" />Generate More</>}
              </button>
            </div>
          </div>

          {/* Center: Active slide editor */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Preview */}
            <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "1/1", maxHeight: "360px", background: t.bg, position: "relative" }} data-testid="slide-preview">
              <SlidePreview slide={slides[activeIdx]} theme={t} num={activeIdx + 1} total={slides.length} />
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={activeIdx === 0}
                className="p-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <p className="text-xs font-bold text-white">{slides[activeIdx]?.role}</p>
                <p className="text-[10px] text-muted-foreground">Slide {activeIdx + 1} of {slides.length}</p>
              </div>
              <button onClick={() => setActiveIdx(i => Math.min(slides.length - 1, i + 1))} disabled={activeIdx === slides.length - 1}
                className="p-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Inline editor for active slide */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] h-5 border-0 font-semibold"
                    style={{ background: `${ROLE_COLORS[slides[activeIdx]?.role] || "#d4b461"}18`, color: ROLE_COLORS[slides[activeIdx]?.role] || "#d4b461" }}>
                    {slides[activeIdx]?.role}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Slide {activeIdx + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowChartBuilder(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-[#38bdf8]/30 text-[#38bdf8] hover:bg-[#38bdf8]/10 transition-all">
                    <Layers className="w-3 h-3" />
                    Add Chart
                  </button>
                  <button onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${showAdvancedEditor ? "border-[#d4b461] bg-[#d4b461]/10 text-[#d4b461]" : "border-white/10 text-muted-foreground hover:text-white hover:border-white/25"}`}>
                    <Palette className="w-3 h-3" />
                    {showAdvancedEditor ? "Hide" : "Customize"}
                  </button>
                  <button onClick={() => regenerateSlide(activeIdx)} disabled={regenIdx === activeIdx}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all disabled:opacity-50"
                    data-testid={`regen-slide-${activeIdx + 1}`}>
                    <RefreshCw className={`w-3 h-3 ${regenIdx === activeIdx ? "animate-spin" : ""}`} />
                    {regenIdx === activeIdx ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
              </div>
              
              <Input value={slides[activeIdx]?.headline || ""} onChange={e => updateSlide(activeIdx, { headline: e.target.value })}
                placeholder="Headline…" className="bg-white/5 border-white/10 text-sm font-semibold h-9"
                data-testid={`input-headline-${activeIdx + 1}`} />
              <Textarea value={slides[activeIdx]?.body || ""} onChange={e => updateSlide(activeIdx, { body: e.target.value })}
                placeholder="Body text…" className="bg-white/5 border-white/10 text-xs resize-none min-h-[64px]"
                data-testid={`textarea-body-${activeIdx + 1}`} />
              
              {/* Advanced Editing Controls */}
              {showAdvancedEditor && (
                <div className="rounded-xl p-3 space-y-3 mt-3" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
                  <p className="text-xs font-semibold text-[#d4b461] flex items-center gap-1.5">
                    <Wand2 className="w-3 h-3" />Advanced Customization
                  </p>
                  
                  {/* Headline Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-400">Headline Size</label>
                      <span className="text-[10px] text-[#d4b461] font-bold">{slides[activeIdx]?.headlineSize || 72}px</span>
                    </div>
                    <input type="range" min="40" max="120" value={slides[activeIdx]?.headlineSize || 72}
                      onChange={e => updateSlide(activeIdx, { headlineSize: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#d4b461]" />
                  </div>
                  
                  {/* Body Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-400">Body Text Size</label>
                      <span className="text-[10px] text-[#d4b461] font-bold">{slides[activeIdx]?.bodySize || 36}px</span>
                    </div>
                    <input type="range" min="20" max="60" value={slides[activeIdx]?.bodySize || 36}
                      onChange={e => updateSlide(activeIdx, { bodySize: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#d4b461]" />
                  </div>
                  
                  {/* Overlay Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-400">Background Overlay</label>
                      <span className="text-[10px] text-[#d4b461] font-bold">{Math.round((slides[activeIdx]?.overlayOpacity || 0.58) * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={(slides[activeIdx]?.overlayOpacity || 0.58) * 100}
                      onChange={e => updateSlide(activeIdx, { overlayOpacity: Number(e.target.value) / 100 })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#d4b461]" />
                  </div>
                  
                  {/* Text Colors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400">Headline Color</label>
                      <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-700">
                        <input type="color" value={slides[activeIdx]?.headlineColor || t.headline}
                          onChange={e => updateSlide(activeIdx, { headlineColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer" />
                        <span className="text-[9px] font-mono text-zinc-500">{slides[activeIdx]?.headlineColor || t.headline}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400">Body Color</label>
                      <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-700">
                        <input type="color" value={slides[activeIdx]?.textColor || t.body}
                          onChange={e => updateSlide(activeIdx, { textColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer" />
                        <span className="text-[9px] font-mono text-zinc-500">{slides[activeIdx]?.textColor || t.body}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reset Button */}
                  <button onClick={() => updateSlide(activeIdx, { headlineSize: 72, bodySize: 36, overlayOpacity: 0.58, headlineColor: t.headline, textColor: t.body })}
                    className="w-full py-1.5 rounded-lg text-[10px] font-medium border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
                    Reset to Default
                  </button>
                </div>
              )}
            </div>

            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-2">
              <button onClick={undo} disabled={historyIndex <= 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeft className="w-3 h-3" />Undo
              </button>
              <button onClick={redo} disabled={historyIndex >= editHistory.length - 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                Redo<ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right: Design + History tabs */}
          <div className="w-64 flex-shrink-0 flex flex-col">
            {/* Tab bar */}
            <div className="flex rounded-xl border border-white/10 overflow-hidden mb-4 flex-shrink-0">
              <button onClick={() => setRightTab("design")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${rightTab === "design" ? "bg-[#d4b461]/15 text-[#d4b461]" : "text-muted-foreground hover:text-white"}`}
                data-testid="tab-design">
                <Palette className="w-3.5 h-3.5" />Design
              </button>
              <button onClick={() => setRightTab("history")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${rightTab === "history" ? "bg-[#d4b461]/15 text-[#d4b461]" : "text-muted-foreground hover:text-white"}`}
                data-testid="tab-history">
                <History className="w-3.5 h-3.5" />History
                {carouselHistory.length > 0 && <span className="ml-0.5 text-[9px] px-1 py-0.5 rounded-full font-bold" style={{ background: "rgba(212,180,97,0.2)", color: "#d4b461" }}>{carouselHistory.length}</span>}
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto">
              {rightTab === "design" ? <DesignPanel /> : <HistoryPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return embedded ? content : <ClientLayout>{content}</ClientLayout>;
}
