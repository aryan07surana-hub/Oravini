import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Download, ImagePlus, ChevronLeft, ChevronRight,
  Palette, AlignCenter, Layers, Sparkles, MoveUp, MoveDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Slide {
  id: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  layout: "full" | "split" | "text";
}

type ThemeKey = "brandverse" | "minimal" | "navy" | "coral";

const THEMES: Record<ThemeKey, { name: string; bg: string; overlay: string; headline: string; body: string; accent: string; accentText: string }> = {
  brandverse: {
    name: "Brandverse Gold",
    bg: "#0a0a0a",
    overlay: "rgba(0,0,0,0.55)",
    headline: "#d4b461",
    body: "#ffffff",
    accent: "#d4b461",
    accentText: "#000000",
  },
  minimal: {
    name: "Clean White",
    bg: "#ffffff",
    overlay: "rgba(255,255,255,0.7)",
    headline: "#111111",
    body: "#444444",
    accent: "#111111",
    accentText: "#ffffff",
  },
  navy: {
    name: "Midnight Blue",
    bg: "#0f172a",
    overlay: "rgba(15,23,42,0.65)",
    headline: "#818cf8",
    body: "#e2e8f0",
    accent: "#818cf8",
    accentText: "#0f172a",
  },
  coral: {
    name: "Bold Coral",
    bg: "#1a1a1a",
    overlay: "rgba(0,0,0,0.5)",
    headline: "#ff6b6b",
    body: "#ffffff",
    accent: "#ff6b6b",
    accentText: "#000000",
  },
};

const LAYOUTS = [
  { key: "full", label: "Full Bleed", desc: "Image background + text overlay" },
  { key: "split", label: "Split", desc: "Image left, text right" },
  { key: "text", label: "Text Only", desc: "No image needed" },
] as const;

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderSlideToCanvas(slide: Slide, theme: ThemeKey, slideNum: number, total: number): Promise<string> {
  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const t = THEMES[theme];

  if (slide.layout === "split" && slide.imageUrl) {
    const IMG_W = SIZE / 2;

    // Left half: image
    const img = await loadImage(slide.imageUrl);
    const scale = Math.max(IMG_W / img.width, SIZE / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, IMG_W, SIZE);
    ctx.clip();
    ctx.drawImage(img, (IMG_W - dw) / 2, (SIZE - dh) / 2, dw, dh);
    ctx.restore();

    // Right half: bg + text
    ctx.fillStyle = t.bg;
    ctx.fillRect(IMG_W, 0, IMG_W, SIZE);

    // Vertical accent bar
    ctx.fillStyle = t.accent;
    ctx.fillRect(IMG_W, 0, 6, SIZE);

    const textX = IMG_W + 60;
    const textW = IMG_W - 100;

    // Slide number badge
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.roundRect(textX, 80, 60, 32, 8);
    ctx.fill();
    ctx.fillStyle = t.accentText;
    ctx.font = "bold 18px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${slideNum}/${total}`, textX + 30, 102);

    // Headline
    ctx.fillStyle = t.headline;
    ctx.font = "bold 62px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    const headY = wrapText(ctx, slide.headline || "Your Headline", textX, 200, textW, 74);

    // Divider
    ctx.fillStyle = t.accent;
    ctx.fillRect(textX, headY + 30, 60, 4);

    // Body
    ctx.fillStyle = t.body;
    ctx.font = "36px Inter, Arial, sans-serif";
    wrapText(ctx, slide.body || "", textX, headY + 70, textW, 50);
  } else {
    // Full bleed or text only
    if (slide.imageUrl && slide.layout !== "text") {
      // Background image
      const img = await loadImage(slide.imageUrl);
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);

      // Overlay
      ctx.fillStyle = t.overlay;
      ctx.fillRect(0, 0, SIZE, SIZE);
    } else {
      // Solid bg
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }

    // Decorative top bar
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, SIZE, 8);

    // Slide number badge
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.roundRect(SIZE / 2 - 35, 50, 70, 36, 10);
    ctx.fill();
    ctx.fillStyle = t.accentText;
    ctx.font = "bold 20px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${slideNum} / ${total}`, SIZE / 2, 74);

    // Headline
    ctx.fillStyle = t.headline;
    ctx.font = "bold 78px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    const headEndY = wrapText(ctx, slide.headline || "Your Headline", SIZE / 2, 220, SIZE - 120, 90);

    // Accent line
    ctx.fillStyle = t.accent;
    ctx.fillRect(SIZE / 2 - 60, headEndY + 30, 120, 5);

    // Body
    ctx.fillStyle = t.body;
    ctx.font = "38px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, slide.body || "", SIZE / 2, headEndY + 80, SIZE - 160, 52);
  }

  // Brandverse watermark (bottom right)
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "22px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("brandversee", SIZE - 40, SIZE - 30);

  // Bottom accent bar
  ctx.fillStyle = t.accent;
  ctx.fillRect(0, SIZE - 8, SIZE, 8);

  return canvas.toDataURL("image/png");
}

export default function CarouselStudio() {
  const [slides, setSlides] = useState<Slide[]>([
    { id: genId(), headline: "", body: "", imageUrl: null, layout: "full" },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>("brandverse");
  const [exporting, setExporting] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  const activeSlide = slides[activeIdx];

  function updateSlide(id: string, updates: Partial<Slide>) {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  function addSlide() {
    if (slides.length >= 10) {
      toast({ title: "Max 10 slides reached", variant: "destructive" });
      return;
    }
    const newSlide: Slide = { id: genId(), headline: "", body: "", imageUrl: null, layout: activeSlide.layout };
    setSlides(prev => [...prev, newSlide]);
    setActiveIdx(slides.length);
  }

  function removeSlide(idx: number) {
    if (slides.length === 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    setSlides(updated);
    setActiveIdx(Math.min(idx, updated.length - 1));
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const updated = [...slides];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setSlides(updated);
    setActiveIdx(newIdx);
  }

  function handleImageUpload(id: string, file: File) {
    const reader = new FileReader();
    reader.onload = e => updateSlide(id, { imageUrl: e.target?.result as string });
    reader.readAsDataURL(file);
  }

  async function downloadAll() {
    setExporting(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlideToCanvas(slides[i], theme, i + 1, slides.length);
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `carousel-slide-${i + 1}.png`;
        link.click();
        await new Promise(r => setTimeout(r, 200));
      }
      toast({ title: `${slides.length} slide${slides.length > 1 ? "s" : ""} downloaded!` });
    } catch (err) {
      toast({ title: "Export failed", description: "Try removing images and retrying", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  async function downloadSingle(idx: number) {
    try {
      const dataUrl = await renderSlideToCanvas(slides[idx], theme, idx + 1, slides.length);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `carousel-slide-${idx + 1}.png`;
      link.click();
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }

  const t = THEMES[theme];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#d4b461]" />
            Carousel Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Design Instagram carousel slides — paste your AI content ideas, upload photos</p>
        </div>
        <Button
          onClick={downloadAll}
          disabled={exporting}
          className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-2"
          data-testid="button-download-all"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting…" : `Download All (${slides.length})`}
        </Button>
      </div>

      {/* Theme picker */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Theme</Label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(THEMES) as ThemeKey[]).map(key => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              data-testid={`theme-${key}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                theme === key
                  ? "border-[#d4b461] text-[#d4b461] bg-[#d4b461]/10"
                  : "border-white/10 text-muted-foreground hover:border-white/30"
              }`}
            >
              {THEMES[key].name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div className="space-y-4">
          {/* Slide tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                data-testid={`slide-tab-${i + 1}`}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  i === activeIdx
                    ? "bg-[#d4b461] text-black"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Slide {i + 1}
              </button>
            ))}
            <button
              onClick={addSlide}
              data-testid="button-add-slide"
              className="px-3 py-1 rounded-lg text-sm bg-white/5 text-muted-foreground hover:bg-white/10 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Active slide editor */}
          {activeSlide && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Slide {activeIdx + 1} of {slides.length}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveSlide(activeIdx, -1)} disabled={activeIdx === 0} data-testid="button-move-up">
                    <MoveUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moveSlide(activeIdx, 1)} disabled={activeIdx === slides.length - 1} data-testid="button-move-down">
                    <MoveDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => removeSlide(activeIdx)} disabled={slides.length === 1} data-testid="button-remove-slide">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Layout selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Layout</Label>
                <div className="flex gap-2">
                  {LAYOUTS.map(l => (
                    <button
                      key={l.key}
                      onClick={() => updateSlide(activeSlide.id, { layout: l.key })}
                      data-testid={`layout-${l.key}`}
                      title={l.desc}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        activeSlide.layout === l.key
                          ? "border-[#d4b461] text-[#d4b461] bg-[#d4b461]/10"
                          : "border-white/10 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Headline</Label>
                <Input
                  value={activeSlide.headline}
                  onChange={e => updateSlide(activeSlide.id, { headline: e.target.value })}
                  placeholder="Your bold hook or slide title…"
                  className="bg-white/5 border-white/10"
                  data-testid="input-headline"
                />
              </div>

              {/* Body text */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#d4b461]" /> Body Text
                  <span className="ml-auto text-[10px] text-[#d4b461]/70">paste from AI Content Ideas</span>
                </Label>
                <Textarea
                  value={activeSlide.body}
                  onChange={e => updateSlide(activeSlide.id, { body: e.target.value })}
                  placeholder="Paste your AI-generated content here — keep it to 2-3 lines for best results…"
                  className="bg-white/5 border-white/10 min-h-[100px] resize-none"
                  data-testid="textarea-body"
                />
              </div>

              {/* Image upload */}
              {activeSlide.layout !== "text" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Photo</Label>
                  <input
                    ref={el => { fileRefs.current[activeSlide.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(activeSlide.id, file);
                    }}
                    data-testid="input-image"
                  />
                  {activeSlide.imageUrl ? (
                    <div className="relative rounded-lg overflow-hidden h-32">
                      <img src={activeSlide.imageUrl} alt="slide" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" onClick={() => fileRefs.current[activeSlide.id]?.click()} data-testid="button-change-image">
                          Change
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => updateSlide(activeSlide.id, { imageUrl: null })} data-testid="button-remove-image">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRefs.current[activeSlide.id]?.click()}
                      data-testid="button-upload-image"
                      className="w-full h-24 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#d4b461]/50 hover:text-[#d4b461] transition-all"
                    >
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-xs">Click to upload photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0} data-testid="button-prev-slide">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{activeIdx + 1} / {slides.length}</span>
              <Button size="sm" variant="ghost" onClick={() => setActiveIdx(Math.min(slides.length - 1, activeIdx + 1))} disabled={activeIdx === slides.length - 1} data-testid="button-next-slide">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <div
            className="w-full rounded-xl overflow-hidden"
            style={{ aspectRatio: "1 / 1", background: t.bg, position: "relative" }}
            data-testid="slide-preview"
          >
            {activeSlide && (
              <SlidePreview slide={activeSlide} theme={t} slideNum={activeIdx + 1} total={slides.length} />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/10 gap-2"
            onClick={() => downloadSingle(activeIdx)}
            data-testid="button-download-slide"
          >
            <Download className="w-3.5 h-3.5" /> Download this slide
          </Button>

          {/* All slides strip */}
          {slides.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">All Slides</Label>
              <div className="flex gap-2 flex-wrap">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveIdx(i)}
                    data-testid={`slide-thumb-${i + 1}`}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      i === activeIdx ? "border-[#d4b461]" : "border-white/10 hover:border-white/30"
                    }`}
                    style={{ background: t.bg }}
                  >
                    <div className="w-full h-full scale-[0.2] origin-top-left" style={{ width: "500%", height: "500%" }}>
                      <SlidePreview slide={s} theme={t} slideNum={i + 1} total={slides.length} mini />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-[#d4b461]/5 border border-[#d4b461]/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-[#d4b461] mb-2">Pro Tips for Viral Carousels</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Slide 1 = your hook — make it impossible to swipe past</li>
          <li>Keep body text to 2–3 short lines per slide</li>
          <li>Last slide = CTA — "Follow for more" or "DM me [word]"</li>
          <li>Use consistent image style across all slides for brand cohesion</li>
          <li>Paste your best AI Content Ideas directly into the body field</li>
        </ul>
      </div>
    </div>
  );
}

function SlidePreview({
  slide,
  theme: t,
  slideNum,
  total,
  mini = false,
}: {
  slide: Slide;
  theme: (typeof THEMES)[ThemeKey];
  slideNum: number;
  total: number;
  mini?: boolean;
}) {
  const textScale = mini ? 0.35 : 1;
  const headSize = `${Math.round(22 * textScale)}px`;
  const bodySize = `${Math.round(13 * textScale)}px`;
  const badgeSize = `${Math.round(10 * textScale)}px`;
  const pad = mini ? "4px" : "28px";

  if (slide.layout === "split" && slide.imageUrl) {
    return (
      <div className="w-full h-full flex" style={{ background: t.bg }}>
        <div className="w-1/2 h-full relative overflow-hidden">
          <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <div style={{ width: "4px", background: t.accent, flexShrink: 0 }} />
        <div className="flex-1 flex flex-col justify-center" style={{ padding: pad }}>
          <div style={{ background: t.accent, color: t.accentText, fontSize: badgeSize, borderRadius: "4px", padding: "2px 6px", display: "inline-block", marginBottom: "8px", fontWeight: 700, alignSelf: "flex-start" }}>
            {slideNum}/{total}
          </div>
          <div style={{ color: t.headline, fontSize: headSize, fontWeight: 800, lineHeight: 1.2, marginBottom: "10px" }}>
            {slide.headline || <span style={{ opacity: 0.3 }}>Your headline…</span>}
          </div>
          <div style={{ color: t.body, fontSize: bodySize, lineHeight: 1.5, opacity: 0.9 }}>
            {slide.body || ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center" style={{ background: t.bg }}>
      {/* BG image */}
      {slide.imageUrl && slide.layout !== "text" && (
        <>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: t.overlay }} />
        </>
      )}
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0" style={{ height: mini ? "3px" : "5px", background: t.accent }} />
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: mini ? "3px" : "5px", background: t.accent }} />

      <div className="relative z-10 flex flex-col items-center text-center" style={{ padding: pad, width: "100%" }}>
        {/* Slide badge */}
        <div style={{ background: t.accent, color: t.accentText, fontSize: badgeSize, borderRadius: "6px", padding: "2px 10px", fontWeight: 700, marginBottom: "12px" }}>
          {slideNum} / {total}
        </div>
        {/* Headline */}
        <div style={{ color: t.headline, fontSize: headSize, fontWeight: 800, lineHeight: 1.2, marginBottom: "10px", maxWidth: "100%" }}>
          {slide.headline || <span style={{ opacity: 0.3 }}>Your headline…</span>}
        </div>
        {/* Accent line */}
        <div style={{ width: mini ? "24px" : "50px", height: "3px", background: t.accent, marginBottom: "10px", borderRadius: "2px" }} />
        {/* Body */}
        <div style={{ color: t.body, fontSize: bodySize, lineHeight: 1.55, opacity: 0.9, maxWidth: "90%" }}>
          {slide.body || ""}
        </div>
      </div>

      {/* Watermark */}
      {!mini && (
        <div className="absolute bottom-2 right-3" style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>
          brandversee
        </div>
      )}
    </div>
  );
}
