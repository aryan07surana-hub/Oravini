import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Instagram, Sparkles, Wand2, Clock, Bookmark, Trash2,
  X, ChevronLeft, ChevronRight, Palette,
  Zap, Copy, Check, Film, AlignLeft, ImageIcon, Layers,
  Upload, Download, Camera, ArrowRight, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoryForm {
  goal: string; goalCustom: string;
  topic: string; niche: string;
  targetAudience: string; instagramUrl: string;
  ctaType: string; ctaCustom: string;
  slidesCount: number; style: string;
  tone: string;
  hookStyle: string;
  contentDepth: string;
}
interface StorySlide {
  slideNumber: number; slideType: string;
  headline: string; subtext: string; textContent: string;
  visualDirection: string;
  designNotes: { fontStyle: string; textSizeEmphasis: string; colorUsage: string };
  interaction: { type: string | null; content: string } | null;
  background?: string;
}
interface StoryResult {
  flowStrategy: { sequenceType: string; whyItWorks: string };
  slides: StorySlide[];
  ctaSlide: { variations: string[]; instruction: string };
  designSystem: { headingFont: string; bodyFont: string; primaryColor: string; accentColor: string; layoutStyle: string };
  imageUsagePlan: { slidesWithImages: number[]; textHeavySlides: number[]; balanceNotes: string };
  variations: { hook: string; tone: string; description: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NICHE_SUGGESTIONS = ["Fitness", "Finance", "Marketing", "Personal Brand", "Coaching", "SaaS", "Real Estate", "E-commerce", "Social Media", "Mindset", "Nutrition", "Business"];

const GOAL_OPTIONS = [
  { id: "value", label: "Provide Value", icon: "💡" },
  { id: "audience", label: "Build Audience", icon: "👥" },
  { id: "engagement", label: "Boost Engagement", icon: "❤️" },
  { id: "sell", label: "Sell Product", icon: "🛒" },
  { id: "traffic", label: "Drive Traffic", icon: "🔗" },
  { id: "other", label: "Other", icon: "✏️" },
];
const CTA_OPTIONS = [
  { id: "follow", label: "Follow Me" }, { id: "dm", label: "DM Me" },
  { id: "link", label: "Link in Bio" }, { id: "buy", label: "Buy / Shop" },
  { id: "join", label: "Join Community" }, { id: "book-call", label: "Book a Call" },
  { id: "custom", label: "Custom" },
];
const STYLE_OPTIONS = [
  { id: "minimal", label: "Minimal", desc: "Clean & elegant" },
  { id: "bold", label: "Bold", desc: "High contrast" },
  { id: "aesthetic", label: "Aesthetic", desc: "Warm & soft" },
  { id: "modern", label: "Modern", desc: "Dark & sharp" },
  { id: "luxury", label: "Luxury", desc: "Black & gold" },
  { id: "casual", label: "Casual", desc: "Light & fun" },
];
const TONE_OPTIONS = [
  { id: "inspirational", label: "Inspirational", emoji: "✨" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "entertaining", label: "Entertaining", emoji: "😂" },
  { id: "controversial", label: "Controversial", emoji: "🔥" },
  { id: "storytelling", label: "Storytelling", emoji: "📖" },
  { id: "motivational", label: "Motivational", emoji: "💪" },
];
const HOOK_STYLE_OPTIONS = [
  { id: "curiosity", label: "Curiosity Question", example: '"What if I told you…"' },
  { id: "bold-stat", label: "Bold Statistic", example: '"95% of creators fail at this…"' },
  { id: "story", label: "Story Opening", example: '"3 years ago I was completely broke…"' },
  { id: "challenge", label: "Challenge", example: '"Most people can\'t answer this…"' },
  { id: "bold-claim", label: "Bold Claim", example: '"This changed everything for me…"' },
  { id: "relatable", label: "Relatable Observation", example: '"We\'ve all been there…"' },
];
const DEPTH_OPTIONS = [
  { id: "quick", label: "Quick Hits", desc: "Punchy, digestible, fast-paced slides", emoji: "⚡" },
  { id: "balanced", label: "Balanced", desc: "Mix of quick hooks + deeper insights", emoji: "⚖️" },
  { id: "deep-dive", label: "Deep Dive", desc: "Detailed, comprehensive, educational", emoji: "🔬" },
];
const INSPIRATIONS = [
  { id: "mindset", emoji: "🧠", label: "7-Day Mindset Reset", desc: "Daily value sequence for personal development", niche: "Personal Development", goal: "value", topic: "7-day mindset reset challenge for entrepreneurs", targetAudience: "Entrepreneurs and coaches feeling burnt out", ctaType: "follow", slidesCount: 7, style: "minimal", color: "#7c3aed" },
  { id: "story", emoji: "✨", label: "My Origin Story", desc: "Storytelling to build deep connection", niche: "Personal Brand", goal: "audience", topic: "How I went from struggling creator to full-time income", targetAudience: "Aspiring content creators", ctaType: "follow", slidesCount: 8, style: "aesthetic", color: "#ec4899" },
  { id: "mistakes", emoji: "🚫", label: "3 Costly Mistakes", desc: "Educational problem-aware sequence", niche: "Business", goal: "engagement", topic: "3 mistakes that are killing your Instagram growth", targetAudience: "Small business owners on Instagram", ctaType: "dm", slidesCount: 6, style: "bold", color: "#dc2626" },
  { id: "launch", emoji: "🚀", label: "Product Launch Story", desc: "Behind-the-scenes sales sequence", niche: "E-commerce", goal: "sell", topic: "Behind the scenes of launching my new digital product", targetAudience: "Online shoppers interested in the niche", ctaType: "buy", slidesCount: 9, style: "modern", color: "#2563eb" },
  { id: "results", emoji: "📈", label: "Client Results Proof", desc: "Proof-based credibility sequence", niche: "Coaching", goal: "sell", topic: "Real results my clients achieved in 30 days", targetAudience: "People looking for a coach or mentor", ctaType: "book-call", slidesCount: 7, style: "luxury", color: "#d4b461" },
  { id: "challenge", emoji: "🎯", label: "Free Challenge Invite", desc: "Community building CTA sequence", niche: "Marketing", goal: "traffic", topic: "Join my free 5-day content challenge to grow your audience", targetAudience: "Content creators wanting to grow", ctaType: "link", slidesCount: 5, style: "casual", color: "#10b981" },
];
const SLIDE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Hook:       { bg: "#7c3aed", text: "#fff" },
  Problem:    { bg: "#dc2626", text: "#fff" },
  Value:      { bg: "#16a34a", text: "#fff" },
  Proof:      { bg: "#2563eb", text: "#fff" },
  Engagement: { bg: "#d97706", text: "#fff" },
  CTA:        { bg: "#d4b461", text: "#000" },
};
const STYLE_THEMES: Record<string, { bg: string; text: string; accent: string; sub: string }> = {
  minimal:   { bg: "#f8f9fa", text: "#111111", accent: "#d4b461", sub: "#666666" },
  bold:      { bg: "#000000", text: "#ffffff", accent: "#ff3366", sub: "#aaaaaa" },
  aesthetic: { bg: "#faf5ee", text: "#2c2017", accent: "#c9a96e", sub: "#8a7a6a" },
  modern:    { bg: "#0f172a", text: "#f8fafc", accent: "#38bdf8", sub: "#94a3b8" },
  luxury:    { bg: "#0c0c0c", text: "#d4b461", accent: "#d4b461", sub: "#888888" },
  casual:    { bg: "#f0f9ff", text: "#1e3a5f", accent: "#06b6d4", sub: "#64748b" },
};

// ─── Canvas Export ─────────────────────────────────────────────────────────────
function downloadSlide(slide: StorySlide, photo: string | null, style: string, count: number, index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d")!;
  const t = STYLE_THEMES[style] || STYLE_THEMES.minimal;
  const tc = SLIDE_TYPE_COLORS[slide.slideType] || SLIDE_TYPE_COLORS["Value"];

  const drawContent = () => {
    if (photo) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, "rgba(0,0,0,0.25)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.45)");
      grad.addColorStop(1, "rgba(0,0,0,0.70)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);
    }
    // Progress bars
    const total = count;
    const barAreaW = 1000;
    const barW = (barAreaW - (total - 1) * 8) / total;
    for (let i = 0; i < total; i++) {
      ctx.fillStyle = i < slide.slideNumber ? t.accent : t.accent + "35";
      ctx.beginPath();
      const bx = 40 + i * (barW + 8);
      if ((ctx as any).roundRect) (ctx as any).roundRect(bx, 110, barW, 10, 5);
      else ctx.rect(bx, 110, barW, 10);
      ctx.fill();
    }
    // Badge
    const badgeText = slide.slideType.toUpperCase();
    ctx.font = "bold 28px Inter, system-ui, sans-serif";
    const badgeW = ctx.measureText(badgeText).width + 64;
    ctx.fillStyle = tc.bg;
    ctx.beginPath();
    if ((ctx as any).roundRect) (ctx as any).roundRect(40, 160, badgeW, 56, 28);
    else ctx.rect(40, 160, badgeW, 56);
    ctx.fill();
    ctx.fillStyle = tc.text;
    ctx.fillText(badgeText, 72, 198);
    // Headline (word-wrap)
    const textColor = photo ? "#ffffff" : t.text;
    ctx.fillStyle = textColor;
    ctx.font = "bold 84px Inter, system-ui, sans-serif";
    const maxW = 1000;
    const words = slide.headline.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line + w + " ";
      if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = w + " "; }
      else line = test;
    }
    if (line) lines.push(line.trim());
    const lineH = 105;
    let ty = 1920 / 2 - (lines.length * lineH) / 2;
    for (const l of lines) { ctx.fillText(l, 40, ty); ty += lineH; }
    // Subtext
    if (slide.subtext) {
      ctx.fillStyle = photo ? "rgba(255,255,255,0.78)" : t.sub;
      ctx.font = "42px Inter, system-ui, sans-serif";
      const subWords = slide.subtext.split(" ");
      let sl = "";
      const sLines: string[] = [];
      for (const w of subWords) {
        const test = sl + w + " ";
        if (ctx.measureText(test).width > maxW && sl) { sLines.push(sl.trim()); sl = w + " "; }
        else sl = test;
      }
      if (sl) sLines.push(sl.trim());
      for (const l of sLines.slice(0, 2)) { ctx.fillText(l, 40, ty + 24); ty += 58; }
    }
    // Bottom bar
    const barGrad = ctx.createLinearGradient(0, 0, 1080, 0);
    barGrad.addColorStop(0, t.accent);
    barGrad.addColorStop(1, t.accent + "50");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 1920 - 14, 1080, 14);
    // Download
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `story-slide-${index + 1}.png`;
    a.click();
  };

  if (photo) {
    const img = new Image();
    img.onload = () => {
      const imgAR = img.width / img.height;
      const canAR = 1080 / 1920;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAR > canAR) { sw = img.height * canAR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canAR; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1080, 1920);
      drawContent();
    };
    img.src = photo;
  } else {
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, t.bg);
    grad.addColorStop(1, t.accent + "18");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);
    drawContent();
  }
}

// ─── Story Slide Card ─────────────────────────────────────────────────────────
function StorySlideCard({ slide, style, count, small = false, photo = null }: {
  slide: StorySlide; style: string; count: number; small?: boolean; photo?: string | null;
}) {
  const t = STYLE_THEMES[style] || STYLE_THEMES.minimal;
  const tc = SLIDE_TYPE_COLORS[slide.slideType] || SLIDE_TYPE_COLORS["Value"];
  const fs = small ? 0.6 : 1;
  const hasPhoto = !!photo;
  const textColor = hasPhoto ? "#ffffff" : t.text;
  const subColor = hasPhoto ? "rgba(255,255,255,0.78)" : t.sub;

  return (
    <div style={{
      width: "100%", aspectRatio: "9/16",
      background: !hasPhoto
        ? (t.bg === "#0c0c0c" || t.bg === "#000000" || t.bg === "#0f172a"
          ? `linear-gradient(160deg, ${t.bg} 60%, ${t.accent}18 100%)`
          : `linear-gradient(160deg, ${t.bg} 80%, ${t.accent}14 100%)`)
        : "transparent",
      backgroundImage: hasPhoto ? `url(${photo})` : undefined,
      backgroundSize: hasPhoto ? "cover" : undefined,
      backgroundPosition: hasPhoto ? "center" : undefined,
      borderRadius: small ? 8 : 16,
      overflow: "hidden", position: "relative",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Photo overlay */}
      {hasPhoto && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.42) 50%, rgba(0,0,0,0.72) 100%)",
          zIndex: 0,
        }} />
      )}
      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Progress bars */}
        <div style={{ display: "flex", gap: 2, padding: `${8 * fs}px ${10 * fs}px ${4 * fs}px`, flexShrink: 0 }}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: small ? 1.5 : 2.5, borderRadius: 2,
              background: i < slide.slideNumber ? t.accent : `${t.accent}35`,
            }} />
          ))}
        </div>
        {/* Profile row */}
        {!small && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 6px", flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${t.accent}30`, border: `1.5px solid ${t.accent}` }} />
            <div style={{ fontSize: 9, fontWeight: 600, color: textColor, opacity: 0.7 }}>your_handle</div>
          </div>
        )}
        {/* Type badge */}
        <div style={{ padding: `${small ? 3 : 8}px ${small ? 7 : 12}px`, flexShrink: 0 }}>
          <span style={{ display: "inline-block", background: tc.bg, color: tc.text, borderRadius: 20, padding: `${small ? 1 : 2}px ${small ? 6 : 8}px`, fontSize: small ? 7 : 9, fontWeight: 700, letterSpacing: "0.03em" }}>
            {slide.slideType}
          </span>
        </div>
        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: small ? "6px 9px" : "14px 14px", gap: 8 }}>
          <div style={{ fontSize: small ? 10 : 18, fontWeight: 900, color: textColor, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {slide.headline}
          </div>
          {!small && slide.subtext && (
            <div style={{ fontSize: 10.5, color: subColor, lineHeight: 1.5 }}>{slide.subtext}</div>
          )}
        </div>
        {/* Interaction element */}
        {!small && slide.interaction?.type && (
          <div style={{ padding: "6px 12px 10px", flexShrink: 0 }}>
            <div style={{ background: `${t.accent}18`, border: `1px solid ${t.accent}40`, borderRadius: 8, padding: "5px 10px", fontSize: 9, color: t.accent, fontWeight: 600 }}>
              {slide.interaction.type === "Poll" && "📊 "}
              {slide.interaction.type === "Question" && "❓ "}
              {slide.interaction.type === "Slider" && "❤️ "}
              {slide.interaction.type === "Tap" && "👆 "}
              {slide.interaction.content}
            </div>
          </div>
        )}
        {/* Bottom accent bar */}
        <div style={{ height: small ? 2 : 3, background: `linear-gradient(90deg, ${t.accent}, ${t.accent}50)`, flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Photo Upload Step ────────────────────────────────────────────────────────
function PhotoUploadStep({ slides, photos, onPhotoChange, onComplete, onBack }: {
  slides: StorySlide[];
  photos: (string | null)[];
  onPhotoChange: (i: number, url: string) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const uploadedCount = photos.filter(Boolean).length;
  const allUploaded = uploadedCount === slides.length;

  const handleFile = (i: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) onPhotoChange(i, e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Camera className="w-3.5 h-3.5" />Photo Designer
          </div>
          <h2 className="text-2xl font-black text-white">
            Upload a photo for <span className="text-primary">every slide</span>
          </h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Your photo becomes the background. The AI-generated text overlays on top — every slide needs exactly one photo before you can open the designer.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(uploadedCount / slides.length) * 100}%`, background: allUploaded ? "#22c55e" : "#d4b461" }}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-400 flex-shrink-0">
            {uploadedCount} / {slides.length} photos
          </span>
          {allUploaded && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
        </div>

        {/* Slide grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {slides.map((slide, i) => {
            const photo = photos[i];
            const tc = SLIDE_TYPE_COLORS[slide.slideType] || SLIDE_TYPE_COLORS["Value"];
            return (
              <label key={i} className="cursor-pointer group" data-testid={`photo-upload-${i}`}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFile(i, e.target.files?.[0])}
                />
                <div
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${photo ? "border-green-500/60 hover:border-green-400" : "border-zinc-700 hover:border-primary/60"}`}
                  style={{
                    aspectRatio: "9/16",
                    backgroundImage: photo ? `url(${photo})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    background: photo ? undefined : "#18181b",
                  }}
                >
                  {/* Dark overlay on photo */}
                  {photo && <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/65" />}

                  {/* Slide type badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text }}>
                      {slide.slideType}
                    </span>
                  </div>

                  {/* Slide number */}
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-zinc-900/80 flex items-center justify-center text-[9px] text-zinc-300 font-bold">
                    {i + 1}
                  </div>

                  {/* Uploaded state — hover shows change icon */}
                  {photo ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all bg-black/30">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-white">Change photo</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 group-hover:bg-primary/5 transition-all">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-600 group-hover:border-primary flex items-center justify-center transition-colors">
                        <Upload className="w-4.5 h-4.5 text-zinc-600 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[10px] text-zinc-600 group-hover:text-primary transition-colors font-medium">Upload photo</span>
                      <span className="text-[9px] text-zinc-700">Required</span>
                    </div>
                  )}

                  {/* Uploaded checkmark overlay */}
                  {photo && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none group-hover:opacity-0 transition-all">
                      <div className="w-8 h-8 rounded-full bg-green-500/90 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Headline text at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-[9px] font-bold leading-tight line-clamp-2">{slide.headline}</p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Warning if not all uploaded */}
        {!allUploaded && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
            <Camera className="w-4 h-4 flex-shrink-0" />
            <span>Upload photos for all {slides.length} slides to continue. Each slide needs its own image.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pb-8">
          <Button variant="outline" onClick={onBack} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <ChevronLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <Button
            onClick={onComplete}
            disabled={!allUploaded}
            className="flex-1 h-11 font-bold bg-primary hover:bg-primary/90 text-black disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="btn-open-designer"
          >
            {allUploaded
              ? <><ArrowRight className="w-4 h-4 mr-2" />Open Designer</>
              : <><Camera className="w-4 h-4 mr-2" />{slides.length - uploadedCount} more photo{slides.length - uploadedCount !== 1 ? "s" : ""} needed</>
            }
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ onLoad, onClose }: { onLoad: (entry: any) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/ai/history", "story-generator"],
    queryFn: () => apiRequest("GET", "/api/ai/history?tool=story-generator"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "story-generator"] }),
  });
  return (
    <div className="absolute inset-0 bg-zinc-950 z-20 flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-white">Saved Story Sequences</h3>
          <Badge className="bg-primary/10 text-primary border-0 text-xs">{(history as any[]).length}</Badge>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
        {!isLoading && (history as any[]).length === 0 && (
          <div className="text-center py-16">
            <Bookmark className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No saved sequences yet</p>
            <p className="text-xs text-zinc-600 mt-1">Generate one and it'll appear here automatically</p>
          </div>
        )}
        {(history as any[]).map((entry: any) => (
          <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-zinc-600 transition-all group">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{entry.title || "Untitled Sequence"}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {entry.inputs?.niche && <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px]">{entry.inputs.niche}</Badge>}
                {entry.inputs?.slidesCount && <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px]">{entry.inputs.slidesCount} slides</Badge>}
                {entry.inputs?.style && <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px] capitalize">{entry.inputs.style}</Badge>}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => onLoad(entry)} className="h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30">Load</Button>
              <button onClick={() => deleteMut.mutate(entry.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InstagramStoryGenerator() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "photos" | "editor">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [slidePhotos, setSlidePhotos] = useState<(string | null)[]>([]);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [rightTab, setRightTab] = useState<"details" | "design" | "cta" | "variations">("details");
  const [nicheInput, setNicheInput] = useState("");
  const [showNicheSugg, setShowNicheSugg] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInspo, setSelectedInspo] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [form, setForm] = useState<StoryForm>({
    goal: "", goalCustom: "", topic: "", niche: "",
    targetAudience: "", instagramUrl: "",
    ctaType: "follow", ctaCustom: "",
    slidesCount: 7, style: "minimal",
    tone: "inspirational",
    hookStyle: "curiosity",
    contentDepth: "balanced",
  });
  const setF = (k: keyof StoryForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/history", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/history", "story-generator"] }),
  });

  const applyInspo = (ins: typeof INSPIRATIONS[0]) => {
    setSelectedInspo(ins.id);
    setF("goal", ins.goal); setF("topic", ins.topic); setF("niche", ins.niche);
    setNicheInput(ins.niche); setF("targetAudience", ins.targetAudience);
    setF("ctaType", ins.ctaType); setF("slidesCount", ins.slidesCount); setF("style", ins.style);
  };

  const handleGenerate = async () => {
    if (!form.topic.trim() || !form.goal) {
      toast({ title: "Fill in required fields", description: "Topic and Goal are required.", variant: "destructive" }); return;
    }
    setGenerating(true);
    setApiDone(false);
    try {
      const data: StoryResult = await apiRequest("POST", "/api/ai/story/generate", {
        goal: form.goal === "other" ? form.goalCustom : form.goal,
        topic: form.topic, niche: nicheInput || form.niche,
        targetAudience: form.targetAudience, instagramUrl: form.instagramUrl,
        ctaType: form.ctaType === "custom" ? form.ctaCustom : form.ctaType,
        slidesCount: form.slidesCount, style: form.style,
        tone: form.tone, hookStyle: form.hookStyle, contentDepth: form.contentDepth,
      });
      setResult(data);
      // Initialize photos array with nulls
      setSlidePhotos(Array(data.slides?.length || form.slidesCount).fill(null));
      setApiDone(true);
      saveMut.mutate({
        tool: "story-generator",
        title: form.topic.slice(0, 60),
        inputs: { niche: nicheInput || form.niche, slidesCount: form.slidesCount, style: form.style, goal: form.goal },
        output: data,
      });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  };

  // Called by GeneratingScreen when min time + API are both done
  const handleDoneGenerating = () => {
    setGenerating(false);
    setStep("photos"); // go to photo upload step first
    setSelectedSlideIdx(0);
    setRightTab("details");
  };

  const handlePhotosComplete = () => {
    setStep("editor");
  };

  const handlePhotoChange = (i: number, url: string) => {
    setSlidePhotos(prev => { const n = [...prev]; n[i] = url; return n; });
  };

  // Change photo from editor thumbnail strip
  const handleThumbPhotoChange = useCallback((i: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) handlePhotoChange(i, e.target.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLoadHistory = (entry: any) => {
    if (entry.output) {
      setResult(entry.output);
      setSlidePhotos(Array((entry.output.slides?.length) || 7).fill(null));
      if (entry.inputs) {
        setF("niche", entry.inputs.niche || ""); setNicheInput(entry.inputs.niche || "");
        setF("slidesCount", entry.inputs.slidesCount || 7);
        setF("style", entry.inputs.style || "minimal"); setF("goal", entry.inputs.goal || "");
      }
      setStep("photos"); // go to photo upload after loading history
      setSelectedSlideIdx(0);
      setShowHistory(false);
    }
  };

  const copyCta = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const slides = result?.slides || [];
  const activeSlide = slides[selectedSlideIdx];

  // ── Generating screen ──────────────────────────────────────────────────────
  if (generating) {
    return (
      <GeneratingScreen
        label="Crafting your story sequence…"
        steps={[
          "Analysing your goal and niche",
          "Crafting slide-by-slide breakdown",
          "Designing your CTA slide",
          "Building design system",
          "Writing variation ideas",
        ]}
        isComplete={apiDone}
        onReady={handleDoneGenerating}
      />
    );
  }

  // ── Config step ────────────────────────────────────────────────────────────
  if (step === "config") {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <button
                onClick={() => navigate("/ai-design")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mx-auto mb-2"
                data-testid="btn-back-ai-design"
              >
                <ChevronLeft className="w-3.5 h-3.5" />AI Design Hub
              </button>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Film className="w-3.5 h-3.5" />Instagram Story Generator
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Build a <span className="text-primary">High-Converting</span> Story Sequence
              </h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                AI generates a slide-by-slide Instagram story — then you upload your own photos and the text overlays automatically.
              </p>
            </div>

            {/* History button */}
            <div className="flex justify-end">
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-primary/30 bg-zinc-900">
                <Clock className="w-3.5 h-3.5" />View History
              </button>
            </div>

            {/* Inspirations */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />Start with an Inspiration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INSPIRATIONS.map(ins => (
                  <button key={ins.id} onClick={() => applyInspo(ins)} data-testid={`inspo-${ins.id}`}
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
                {GOAL_OPTIONS.map(opt => (
                  <button key={opt.id} data-testid={`goal-${opt.id}`} onClick={() => setF("goal", opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${form.goal === opt.id ? "border-primary bg-primary/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                    <span className="text-xl">{opt.icon}</span>
                    <span className={`text-xs font-semibold ${form.goal === opt.id ? "text-primary" : "text-zinc-300"}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
              {form.goal === "other" && (
                <Input placeholder="Describe your goal…" value={form.goalCustom} onChange={e => setF("goalCustom", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
              )}
            </div>

            {/* Niche */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">Niche</label>
              <div className="relative">
                <Input placeholder="Type your niche…" value={nicheInput}
                  onChange={e => { setNicheInput(e.target.value); setShowNicheSugg(true); }}
                  onFocus={() => setShowNicheSugg(true)}
                  onBlur={() => setTimeout(() => setShowNicheSugg(false), 150)}
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                  data-testid="input-niche" />
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
                <Input placeholder="e.g. How I grew from 0 to 10k followers in 90 days" value={form.topic} onChange={e => setF("topic", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" data-testid="input-topic" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Target Audience</label>
                <Input placeholder="e.g. Coaches with under 1k followers wanting to monetize" value={form.targetAudience} onChange={e => setF("targetAudience", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" data-testid="input-audience" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Instagram Profile URL <span className="text-zinc-600">(optional)</span></label>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 h-9">
                  <Instagram className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <input value={form.instagramUrl} onChange={e => setF("instagramUrl", e.target.value)} placeholder="https://instagram.com/yourhandle" className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none" data-testid="input-instagram" />
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">CTA Type</label>
              <div className="flex flex-wrap gap-2">
                {CTA_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setF("ctaType", c.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${form.ctaType === c.id ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>{c.label}</button>
                ))}
              </div>
              {form.ctaType === "custom" && (
                <Input placeholder="e.g. Subscribe to my newsletter" value={form.ctaCustom} onChange={e => setF("ctaCustom", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 mt-2" />
              )}
            </div>

            {/* Design */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Palette className="w-4 h-4 text-primary" />Story Design & Style</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-400">Number of slides</label>
                  <span className="text-primary font-bold text-sm">{form.slidesCount}</span>
                </div>
                <input type="range" min={3} max={15} value={form.slidesCount} onChange={e => setF("slidesCount", Number(e.target.value))} className="w-full accent-primary" data-testid="slider-slides" />
                <div className="flex justify-between text-[10px] text-zinc-600"><span>3</span><span>15</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Visual style</label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => setF("style", s.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${form.style === s.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                      <div className="w-6 h-4 rounded" style={{ background: STYLE_THEMES[s.id]?.bg || "#fff", border: `2px solid ${STYLE_THEMES[s.id]?.accent || "#d4b461"}` }} />
                      <span className={`text-[10px] font-semibold ${form.style === s.id ? "text-primary" : "text-zinc-400"}`}>{s.label}</span>
                      <span className="text-[9px] text-zinc-600">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Tone of voice</label>
                <div className="grid grid-cols-3 gap-2">
                  {TONE_OPTIONS.map(t => (
                    <button key={t.id} onClick={() => setF("tone", t.id)}
                      data-testid={`tone-${t.id}`}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${form.tone === t.id ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                      <span>{t.emoji}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hook Style */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Opening hook style</label>
                <div className="space-y-1.5">
                  {HOOK_STYLE_OPTIONS.map(h => (
                    <button key={h.id} onClick={() => setF("hookStyle", h.id)}
                      data-testid={`hook-${h.id}`}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${form.hookStyle === h.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                      <div className={`w-3 h-3 rounded-full border-2 mt-0.5 flex-shrink-0 ${form.hookStyle === h.id ? "bg-primary border-primary" : "border-zinc-600"}`} />
                      <div>
                        <div className={`text-xs font-semibold ${form.hookStyle === h.id ? "text-primary" : "text-zinc-300"}`}>{h.label}</div>
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
                  {DEPTH_OPTIONS.map(d => (
                    <button key={d.id} onClick={() => setF("contentDepth", d.id)}
                      data-testid={`depth-${d.id}`}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${form.contentDepth === d.id ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                      <span className="text-lg">{d.emoji}</span>
                      <span className={`text-[10px] font-bold ${form.contentDepth === d.id ? "text-primary" : "text-zinc-300"}`}>{d.label}</span>
                      <span className="text-[9px] text-zinc-600 leading-tight">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Photo upload notice */}
            <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
              <Camera className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary">Photos required after generation</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">You'll upload {form.slidesCount} photos (one per slide) before opening the designer. Your photos become the background with text overlaid on top.</p>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!form.goal || !form.topic.trim()}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black rounded-xl" data-testid="btn-generate-story">
              <Wand2 className="w-4 h-4 mr-2" />Generate Story Sequence ({form.slidesCount} slides)
            </Button>
          </div>

          {showHistory && (
            <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur flex items-center justify-center p-4">
              <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden" style={{ height: 500 }}>
                <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />
              </div>
            </div>
          )}
        </div>
      </ClientLayout>
    );
  }

  // ── Photo upload step ──────────────────────────────────────────────────────
  if (step === "photos") {
    return (
      <PhotoUploadStep
        slides={slides}
        photos={slidePhotos}
        onPhotoChange={handlePhotoChange}
        onComplete={handlePhotosComplete}
        onBack={() => setStep("config")}
      />
    );
  }

  // ── Editor / Designer step ─────────────────────────────────────────────────
  if (!result) return null;

  return (
    <ClientLayout fullWidth>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("photos")} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors" data-testid="btn-back-photos">
              <ChevronLeft className="w-4 h-4" />Photos
            </button>
            <div className="w-px h-4 bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-white truncate max-w-xs">{form.topic || "Story Sequence"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{slides.length} slides</Badge>
            <Badge className="bg-zinc-800 text-zinc-400 border-0 text-xs capitalize">{form.style}</Badge>
            <button
              onClick={() => {
                slides.forEach((sl, i) => downloadSlide(sl, slidePhotos[i] || null, form.style, slides.length, i));
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-primary/30"
              data-testid="btn-download-all"
            >
              <Download className="w-3.5 h-3.5" />Download All
            </button>
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-primary/30">
              <Clock className="w-3.5 h-3.5" />History
            </button>
          </div>
        </div>

        {/* 3-panel body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — slide strip with photo change */}
          <div className="w-28 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 overflow-y-auto py-3 space-y-2 px-2">
            {slides.map((slide, i) => {
              const photo = slidePhotos[i] || null;
              return (
                <div key={i} className="relative group">
                  <button onClick={() => setSelectedSlideIdx(i)}
                    className={`w-full rounded-lg overflow-hidden border transition-all ${selectedSlideIdx === i ? "border-primary ring-1 ring-primary/40" : "border-zinc-800 hover:border-zinc-600"}`}
                    data-testid={`thumb-slide-${i}`}>
                    <StorySlideCard slide={slide} style={form.style} count={slides.length} small photo={photo} />
                    <div className="text-center text-[9px] font-semibold py-1 bg-zinc-900 text-zinc-500">{i + 1}</div>
                  </button>
                  {/* Change photo overlay */}
                  <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 bg-black/40 rounded-lg" title="Change photo">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleThumbPhotoChange(i, e.target.files?.[0])} />
                    <div className="w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                      <Camera className="w-3.5 h-3.5 text-black" />
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Center — designer preview */}
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/40 overflow-y-auto p-6 gap-4">
            {/* Nav arrows */}
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedSlideIdx(i => Math.max(0, i - 1))} disabled={selectedSlideIdx === 0}
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" data-testid="btn-prev-slide">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-500 font-medium">{selectedSlideIdx + 1} / {slides.length}</span>
              <button onClick={() => setSelectedSlideIdx(i => Math.min(slides.length - 1, i + 1))} disabled={selectedSlideIdx === slides.length - 1}
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" data-testid="btn-next-slide">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Main story designer card */}
            {activeSlide && (
              <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
                <div className="w-full relative group">
                  <StorySlideCard slide={activeSlide} style={form.style} count={slides.length} photo={slidePhotos[selectedSlideIdx] || null} />
                  {/* Change photo overlay on the main card */}
                  <label className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleThumbPhotoChange(selectedSlideIdx, e.target.files?.[0])} />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white text-[11px] font-semibold">
                      <Camera className="w-3 h-3" />Change Photo
                    </div>
                  </label>
                </div>
                {/* Per-slide download */}
                <button
                  onClick={() => downloadSlide(activeSlide, slidePhotos[selectedSlideIdx] || null, form.style, slides.length, selectedSlideIdx)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-primary transition-colors"
                  data-testid="btn-download-slide"
                >
                  <Download className="w-3.5 h-3.5" />Download slide {selectedSlideIdx + 1}
                </button>
              </div>
            )}

            {/* Story flow strategy */}
            {result.flowStrategy && (
              <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary"><Zap className="w-3.5 h-3.5" />Story Strategy</div>
                <p className="text-[11px] text-zinc-400 capitalize font-semibold">{result.flowStrategy.sequenceType}</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{result.flowStrategy.whyItWorks}</p>
              </div>
            )}
          </div>

          {/* Right — details panel */}
          <div className="w-80 flex-shrink-0 bg-zinc-950 border-l border-zinc-800 flex flex-col">
            <div className="flex border-b border-zinc-800 flex-shrink-0">
              {([
                { id: "details", label: "Slide", icon: AlignLeft },
                { id: "design", label: "Design", icon: Palette },
                { id: "cta", label: "CTA", icon: Zap },
                { id: "variations", label: "Ideas", icon: Layers },
              ] as const).map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setRightTab(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors border-b-2 ${rightTab === tab.id ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                    data-testid={`tab-${tab.id}`}>
                    <Icon className="w-3.5 h-3.5" />{tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Details tab */}
              {rightTab === "details" && activeSlide && (
                <>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Slide {activeSlide.slideNumber} — {activeSlide.slideType}</div>
                    <div className="bg-zinc-900 rounded-xl p-3 space-y-3">
                      <div>
                        <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">Headline</div>
                        <p className="text-xs text-white font-semibold leading-snug">{activeSlide.headline}</p>
                      </div>
                      {activeSlide.subtext && (
                        <div>
                          <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">Subtext</div>
                          <p className="text-xs text-zinc-300 leading-snug">{activeSlide.subtext}</p>
                        </div>
                      )}
                      <div>
                        <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">Full Text</div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{activeSlide.textContent}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Visual Direction</div>
                    <div className="bg-zinc-900 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-300 leading-relaxed">{activeSlide.visualDirection}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Design Notes</div>
                    <div className="bg-zinc-900 rounded-xl p-3 space-y-2">
                      {[
                        { label: "Font Style", val: activeSlide.designNotes?.fontStyle },
                        { label: "Text Emphasis", val: activeSlide.designNotes?.textSizeEmphasis },
                        { label: "Colour Usage", val: activeSlide.designNotes?.colorUsage },
                      ].map(row => row.val ? (
                        <div key={row.label}>
                          <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">{row.label}</div>
                          <p className="text-xs text-zinc-400 leading-snug mt-0.5">{row.val}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                  {activeSlide.interaction?.type && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Interaction</div>
                      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                        <div className="text-[9px] font-bold text-primary uppercase tracking-wide mb-1">{activeSlide.interaction.type}</div>
                        <p className="text-xs text-zinc-300">{activeSlide.interaction.content}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Design tab */}
              {rightTab === "design" && result.designSystem && (
                <>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Typography</div>
                    <div className="bg-zinc-900 rounded-xl p-3 space-y-2">
                      <div>
                        <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">Heading</div>
                        <p className="text-xs text-zinc-300 mt-0.5">{result.designSystem.headingFont}</p>
                      </div>
                      <div>
                        <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">Body</div>
                        <p className="text-xs text-zinc-300 mt-0.5">{result.designSystem.bodyFont}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Colour Palette</div>
                    <div className="bg-zinc-900 rounded-xl p-3 space-y-2">
                      {[
                        { label: "Primary", hex: result.designSystem.primaryColor },
                        { label: "Accent", hex: result.designSystem.accentColor },
                      ].map(c => (
                        <div key={c.label} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-zinc-700 flex-shrink-0" style={{ background: c.hex }} />
                          <div>
                            <div className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wide">{c.label}</div>
                            <div className="text-xs text-zinc-300 font-mono">{c.hex}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Layout Style</div>
                    <div className="bg-zinc-900 rounded-xl p-3">
                      <p className="text-xs text-zinc-300 leading-relaxed">{result.designSystem.layoutStyle}</p>
                    </div>
                  </div>
                  {result.imageUsagePlan && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Image Usage Plan</div>
                      <div className="bg-zinc-900 rounded-xl p-3 space-y-2">
                        <div>
                          <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">Slides with images</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(result.imageUsagePlan.slidesWithImages || []).map(n => (
                              <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Slide {n}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">{result.imageUsagePlan.balanceNotes}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* CTA tab */}
              {rightTab === "cta" && result.ctaSlide && (
                <>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">CTA Instruction</div>
                    <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                      <p className="text-xs text-zinc-300 leading-relaxed">{result.ctaSlide.instruction}</p>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">3 CTA Variations</div>
                    <div className="space-y-2">
                      {(result.ctaSlide.variations || []).map((v, i) => (
                        <div key={i} className="bg-zinc-900 rounded-xl p-3 flex items-start justify-between gap-3 group hover:border-zinc-600 border border-zinc-800 transition-all">
                          <p className="text-xs text-zinc-200 leading-snug flex-1">{v}</p>
                          <button onClick={() => copyCta(v, i)} className="flex-shrink-0 text-zinc-600 hover:text-primary transition-colors" data-testid={`copy-cta-${i}`}>
                            {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Variations tab */}
              {rightTab === "variations" && (
                <>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alternative Angles</div>
                  {(result.variations || []).map((v, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">Variation {i + 1}</span>
                        <span className="text-[9px] text-zinc-600 capitalize">{v.tone}</span>
                      </div>
                      <div>
                        <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">Alternative Hook</div>
                        <p className="text-xs text-white font-semibold leading-snug">"{v.hook}"</p>
                      </div>
                      <div>
                        <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide mb-1">Why It Works</div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{v.description}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* History overlay */}
        {showHistory && (
          <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden" style={{ height: 500 }}>
              <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
