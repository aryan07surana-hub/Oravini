import { useState, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, Download, ImagePlus, ChevronLeft, ChevronRight,
  Palette, Layers, MoveUp, MoveDown, ChevronDown, Sparkles, X, Upload
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
  brandverse: { name: "Brandverse Gold", bg: "#0a0a0a", overlay: "rgba(0,0,0,0.55)", headline: "#d4b461", body: "#ffffff", accent: "#d4b461", accentText: "#000000" },
  minimal: { name: "Clean White", bg: "#ffffff", overlay: "rgba(255,255,255,0.7)", headline: "#111111", body: "#444444", accent: "#111111", accentText: "#ffffff" },
  navy: { name: "Midnight Blue", bg: "#0f172a", overlay: "rgba(15,23,42,0.65)", headline: "#818cf8", body: "#e2e8f0", accent: "#818cf8", accentText: "#0f172a" },
  coral: { name: "Bold Coral", bg: "#1a1a1a", overlay: "rgba(0,0,0,0.5)", headline: "#ff6b6b", body: "#ffffff", accent: "#ff6b6b", accentText: "#000000" },
};

const LAYOUTS = [
  { key: "full", label: "Full Bleed" },
  { key: "split", label: "Split" },
  { key: "text", label: "Text Only" },
] as const;

function genId() { return Math.random().toString(36).slice(2, 9); }

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else { line = testLine; }
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
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const t = THEMES[theme];

  if (slide.layout === "split" && slide.imageUrl) {
    const IMG_W = SIZE / 2;
    const img = await loadImage(slide.imageUrl);
    const scale = Math.max(IMG_W / img.width, SIZE / img.height);
    const dw = img.width * scale; const dh = img.height * scale;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, IMG_W, SIZE); ctx.clip();
    ctx.drawImage(img, (IMG_W - dw) / 2, (SIZE - dh) / 2, dw, dh); ctx.restore();
    ctx.fillStyle = t.bg; ctx.fillRect(IMG_W, 0, IMG_W, SIZE);
    ctx.fillStyle = t.accent; ctx.fillRect(IMG_W, 0, 6, SIZE);
    const textX = IMG_W + 60; const textW = IMG_W - 100;
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.roundRect(textX, 80, 60, 32, 8); ctx.fill();
    ctx.fillStyle = t.accentText; ctx.font = "bold 18px Inter, Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${slideNum}/${total}`, textX + 30, 102);
    ctx.fillStyle = t.headline; ctx.font = "bold 62px Inter, Arial, sans-serif"; ctx.textAlign = "left";
    const headY = wrapText(ctx, slide.headline || "Your Headline", textX, 200, textW, 74);
    ctx.fillStyle = t.accent; ctx.fillRect(textX, headY + 30, 60, 4);
    ctx.fillStyle = t.body; ctx.font = "36px Inter, Arial, sans-serif";
    wrapText(ctx, slide.body || "", textX, headY + 70, textW, 50);
  } else {
    if (slide.imageUrl && slide.layout !== "text") {
      const img = await loadImage(slide.imageUrl);
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const dw = img.width * scale; const dh = img.height * scale;
      ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
      ctx.fillStyle = t.overlay; ctx.fillRect(0, 0, SIZE, SIZE);
    } else { ctx.fillStyle = t.bg; ctx.fillRect(0, 0, SIZE, SIZE); }
    ctx.fillStyle = t.accent; ctx.fillRect(0, 0, SIZE, 8);
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.roundRect(SIZE / 2 - 35, 50, 70, 36, 10); ctx.fill();
    ctx.fillStyle = t.accentText; ctx.font = "bold 20px Inter, Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${slideNum} / ${total}`, SIZE / 2, 74);
    ctx.fillStyle = t.headline; ctx.font = "bold 78px Inter, Arial, sans-serif"; ctx.textAlign = "center";
    const headEndY = wrapText(ctx, slide.headline || "Your Headline", SIZE / 2, 220, SIZE - 120, 90);
    ctx.fillStyle = t.accent; ctx.fillRect(SIZE / 2 - 60, headEndY + 30, 120, 5);
    ctx.fillStyle = t.body; ctx.font = "38px Inter, Arial, sans-serif"; ctx.textAlign = "center";
    wrapText(ctx, slide.body || "", SIZE / 2, headEndY + 80, SIZE - 160, 52);
  }
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "22px Inter, Arial, sans-serif";
  ctx.textAlign = "right"; ctx.fillText("brandversee", SIZE - 40, SIZE - 30);
  ctx.fillStyle = t.accent; ctx.fillRect(0, SIZE - 8, SIZE, 8);
  return canvas.toDataURL("image/png");
}

function SlidePreview({ slide, theme: t, slideNum, total, mini = false }: { slide: Slide; theme: (typeof THEMES)[ThemeKey]; slideNum: number; total: number; mini?: boolean }) {
  const headSize = mini ? "7px" : "22px";
  const bodySize = mini ? "4px" : "13px";
  const badgeSize = mini ? "4px" : "10px";
  const pad = mini ? "3px" : "20px";

  if (slide.layout === "split" && slide.imageUrl) {
    return (
      <div className="w-full h-full flex" style={{ background: t.bg }}>
        <div className="w-1/2 h-full relative overflow-hidden">
          <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <div style={{ width: "4px", background: t.accent, flexShrink: 0 }} />
        <div className="flex-1 flex flex-col justify-center" style={{ padding: pad }}>
          <div style={{ background: t.accent, color: t.accentText, fontSize: badgeSize, borderRadius: "4px", padding: "2px 6px", display: "inline-block", marginBottom: "8px", fontWeight: 700, alignSelf: "flex-start" }}>{slideNum}/{total}</div>
          <div style={{ color: t.headline, fontSize: headSize, fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>{slide.headline || <span style={{ opacity: 0.3 }}>Headline…</span>}</div>
          <div style={{ color: t.body, fontSize: bodySize, lineHeight: 1.5, opacity: 0.9 }}>{slide.body}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative" style={{ background: slide.imageUrl && slide.layout !== "text" ? undefined : t.bg, overflow: "hidden" }}>
      {slide.imageUrl && slide.layout !== "text" && (
        <>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: t.overlay }} />
        </>
      )}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: mini ? "2px" : "8px", background: t.accent }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: pad }}>
        <div style={{ background: t.accent, color: t.accentText, fontSize: badgeSize, borderRadius: "4px", padding: "2px 8px", display: "inline-block", marginBottom: "10px", fontWeight: 700 }}>{slideNum}/{total}</div>
        <div style={{ color: t.headline, fontSize: headSize, fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>{slide.headline || <span style={{ opacity: 0.3 }}>Headline…</span>}</div>
        {!mini && <div style={{ width: "40px", height: "3px", background: t.accent, margin: "0 auto 10px" }} />}
        <div style={{ color: t.body, fontSize: bodySize, lineHeight: 1.5, opacity: 0.9 }}>{slide.body}</div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: mini ? "2px" : "8px", background: t.accent }} />
    </div>
  );
}

export default function CarouselStudio() {
  const [open, setOpen] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([
    { id: genId(), headline: "", body: "", imageUrl: null, layout: "full" },
    { id: genId(), headline: "", body: "", imageUrl: null, layout: "full" },
    { id: genId(), headline: "", body: "", imageUrl: null, layout: "full" },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>("brandverse");
  const [exporting, setExporting] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const globalImageRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const activeSlide = slides[activeIdx];
  const t = THEMES[theme];

  function updateSlide(id: string, updates: Partial<Slide>) {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  function addSlide() {
    if (slides.length >= 10) { toast({ title: "Max 10 slides", variant: "destructive" }); return; }
    const newSlide: Slide = { id: genId(), headline: "", body: "", imageUrl: null, layout: activeSlide?.layout || "full" };
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

  function handleGlobalImage(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setSlides(prev => prev.map(s => s.layout !== "text" ? { ...s, imageUrl: url } : s));
      toast({ title: "Design image applied to all slides" });
    };
    reader.readAsDataURL(file);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.slides && Array.isArray(data.slides)) {
          setSlides(data.slides);
          if (data.theme) setTheme(data.theme);
          setActiveIdx(0);
          toast({ title: "Carousel imported!" });
        }
      } catch { toast({ title: "Invalid file", variant: "destructive" }); }
    };
    reader.readAsText(file);
  }

  function exportProject() {
    const data = JSON.stringify({ slides, theme }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "carousel-project.json"; link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAll() {
    setExporting(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlideToCanvas(slides[i], theme, i + 1, slides.length);
        const link = document.createElement("a");
        link.href = dataUrl; link.download = `carousel-slide-${i + 1}.png`; link.click();
        await new Promise(r => setTimeout(r, 200));
      }
      toast({ title: `${slides.length} slides downloaded!` });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }

  async function downloadSingle(idx: number) {
    try {
      const dataUrl = await renderSlideToCanvas(slides[idx], theme, idx + 1, slides.length);
      const link = document.createElement("a");
      link.href = dataUrl; link.download = `carousel-slide-${idx + 1}.png`; link.click();
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
  }

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "#d4b461" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Design</h1>
            <p className="text-xs text-muted-foreground">Create stunning content designs for your brand</p>
          </div>
        </div>

        {/* Square subsection card — Carousel Generator */}
        <div
          onClick={() => setOpen(v => !v)}
          data-testid="carousel-card-toggle"
          className="rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] select-none mb-4"
          style={{
            background: open ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${open ? "rgba(212,180,97,0.4)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: open ? "0 0 40px rgba(212,180,97,0.08)" : "none",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.25)" }}>
                <Layers className="w-5 h-5" style={{ color: "#d4b461" }} />
              </div>
              <div>
                <p className="text-base font-black text-white">Carousel Generator</p>
                <p className="text-xs text-muted-foreground mt-0.5">Design up to 10 slides · add images · export as PNG</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(212,180,97,0.12)", color: "#d4b461" }}>Up to 10 slides</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>Image upload</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>PNG export</span>
                </div>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </div>
        </div>

        {/* Expanded carousel editor */}
        {open && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Theme picker */}
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(THEMES) as ThemeKey[]).map(key => (
                  <button key={key} onClick={() => setTheme(key)} data-testid={`theme-${key}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${theme === key ? "border-[#d4b461] text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/30"}`}>
                    {THEMES[key].name}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              {/* Global image */}
              <input ref={globalImageRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleGlobalImage(f); e.target.value = ""; }} />
              <button onClick={() => globalImageRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:border-white/25 hover:text-white transition-all">
                <ImagePlus className="w-3.5 h-3.5" /> Apply Design Image to All
              </button>
              {/* Import */}
              <input ref={importRef} type="file" accept=".json" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
              <button onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:border-white/25 hover:text-white transition-all">
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
              {/* Export project */}
              <button onClick={exportProject}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:border-white/25 hover:text-white transition-all">
                <Download className="w-3.5 h-3.5" /> Save Project
              </button>
              {/* Download all */}
              <Button onClick={downloadAll} disabled={exporting}
                className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-1.5 text-xs h-8"
                data-testid="button-download-all">
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Exporting…" : `Download All (${slides.length})`}
              </Button>
            </div>

            {/* Slide tabs row */}
            <div className="flex items-center gap-2 flex-wrap">
              {slides.map((s, i) => (
                <button key={s.id} onClick={() => setActiveIdx(i)} data-testid={`slide-tab-${i + 1}`}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${i === activeIdx ? "bg-[#d4b461] text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                  Slide {i + 1}
                </button>
              ))}
              <button onClick={addSlide} data-testid="button-add-slide"
                className="px-3 py-1 rounded-lg text-xs bg-white/5 text-muted-foreground hover:bg-white/10 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Slide
              </button>
              <span className="text-xs text-muted-foreground ml-auto">{slides.length}/10 slides</span>
            </div>

            {/* Editor + preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: All slides text input list */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slide Content</p>
                {slides.map((slide, i) => (
                  <div key={slide.id}
                    className={`rounded-xl border p-4 space-y-3 transition-all cursor-pointer ${i === activeIdx ? "border-[#d4b461]/50 bg-[#d4b461]/04" : "border-white/08 bg-white/02 hover:border-white/15"}`}
                    onClick={() => setActiveIdx(i)}
                    style={{ background: i === activeIdx ? "rgba(212,180,97,0.04)" : "rgba(255,255,255,0.02)", borderColor: i === activeIdx ? "rgba(212,180,97,0.4)" : "rgba(255,255,255,0.07)" }}>

                    {/* Slide header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: i === activeIdx ? "rgba(212,180,97,0.2)" : "rgba(255,255,255,0.06)", color: i === activeIdx ? "#d4b461" : "rgba(255,255,255,0.4)" }}>
                          {i + 1}
                        </div>
                        <span className="text-xs font-semibold text-white">Slide {i + 1}</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-white/08 text-muted-foreground disabled:opacity-30 transition-colors">
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="p-1 rounded hover:bg-white/08 text-muted-foreground disabled:opacity-30 transition-colors">
                          <MoveDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeSlide(i)} disabled={slides.length === 1} className="p-1 rounded hover:bg-white/08 text-red-400/70 disabled:opacity-30 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Inputs — always visible */}
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                      <Input
                        value={slide.headline}
                        onChange={e => updateSlide(slide.id, { headline: e.target.value })}
                        placeholder={`Slide ${i + 1} headline / hook…`}
                        className="bg-white/5 border-white/10 text-sm h-9"
                        data-testid={`input-headline-${i + 1}`}
                      />
                      <Textarea
                        value={slide.body}
                        onChange={e => updateSlide(slide.id, { body: e.target.value })}
                        placeholder={`Slide ${i + 1} body text — keep it to 2-3 lines…`}
                        className="bg-white/5 border-white/10 text-xs resize-none min-h-[72px]"
                        data-testid={`textarea-body-${i + 1}`}
                      />

                      {/* Layout + image on same row */}
                      <div className="flex items-center gap-2">
                        {LAYOUTS.map(l => (
                          <button key={l.key} onClick={() => updateSlide(slide.id, { layout: l.key })}
                            className={`flex-1 py-1 rounded text-[10px] font-medium border transition-all ${slide.layout === l.key ? "border-[#d4b461]/60 text-[#d4b461] bg-[#d4b461]/08" : "border-white/08 text-muted-foreground hover:border-white/20"}`}>
                            {l.label}
                          </button>
                        ))}
                      </div>

                      {/* Image upload per slide */}
                      {slide.layout !== "text" && (
                        <>
                          <input ref={el => { fileRefs.current[slide.id] = el; }} type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(slide.id, f); e.target.value = ""; }}
                            data-testid={`input-image-${i + 1}`} />
                          {slide.imageUrl ? (
                            <div className="relative rounded-lg overflow-hidden h-24">
                              <img src={slide.imageUrl} alt="slide" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                                <button onClick={() => fileRefs.current[slide.id]?.click()} className="px-2 py-1 bg-white/20 rounded text-white text-xs font-medium">Change</button>
                                <button onClick={() => updateSlide(slide.id, { imageUrl: null })} className="px-2 py-1 bg-red-500/40 rounded text-white text-xs font-medium">Remove</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => fileRefs.current[slide.id]?.click()}
                              className="w-full h-16 rounded-lg border border-dashed border-white/15 flex items-center justify-center gap-2 text-muted-foreground hover:border-[#d4b461]/40 hover:text-[#d4b461] transition-all text-xs">
                              <ImagePlus className="w-3.5 h-3.5" /> Upload photo for slide {i + 1}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Live preview */}
              <div className="space-y-4 lg:sticky lg:top-6 self-start">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0}
                      className="p-1 rounded hover:bg-white/08 text-muted-foreground disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground">{activeIdx + 1}/{slides.length}</span>
                    <button onClick={() => setActiveIdx(Math.min(slides.length - 1, activeIdx + 1))} disabled={activeIdx === slides.length - 1}
                      className="p-1 rounded hover:bg-white/08 text-muted-foreground disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: "1/1", background: t.bg, position: "relative" }} data-testid="slide-preview">
                  {activeSlide && <SlidePreview slide={activeSlide} theme={t} slideNum={activeIdx + 1} total={slides.length} />}
                </div>

                <button onClick={() => downloadSingle(activeIdx)}
                  className="w-full py-2 rounded-xl border border-white/10 text-xs font-medium text-muted-foreground hover:border-white/25 hover:text-white transition-all flex items-center justify-center gap-2"
                  data-testid="button-download-slide">
                  <Download className="w-3.5 h-3.5" /> Download this slide
                </button>

                {/* Thumbnail strip */}
                {slides.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {slides.map((s, i) => (
                      <button key={s.id} onClick={() => setActiveIdx(i)} data-testid={`slide-thumb-${i + 1}`}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === activeIdx ? "border-[#d4b461]" : "border-white/10 hover:border-white/30"}`}
                        style={{ background: t.bg }}>
                        <div className="w-full h-full" style={{ transform: "scale(0.2)", transformOrigin: "top left", width: "500%", height: "500%" }}>
                          <SlidePreview slide={s} theme={t} slideNum={i + 1} total={slides.length} mini />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tips */}
                <div className="rounded-xl p-4" style={{ background: "rgba(212,180,97,0.05)", border: "1px solid rgba(212,180,97,0.15)" }}>
                  <p className="text-xs font-semibold text-[#d4b461] mb-2">Carousel Tips</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Slide 1 = hook — make it impossible to scroll past</li>
                    <li>2–3 lines max per slide body</li>
                    <li>Last slide = CTA — "DM me [word]"</li>
                    <li>Use "Apply Design Image to All" for brand consistency</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
