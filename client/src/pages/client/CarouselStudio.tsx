import { useState, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Layers, ChevronDown, ChevronLeft, ChevronRight,
  Download, ImagePlus, RefreshCw, Upload, Check, Palette,
  LayoutTemplate, Wand2, Play, ArrowRight, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Types ────────────────────────────────────────────────────────────────────
interface AiSlide { role: string; headline: string; body: string; }
interface DesignSlide extends AiSlide { imageUrl: string | null; layout: "full" | "split" | "text"; }

type ThemeKey = "brandverse" | "minimal" | "navy" | "coral" | "viral";
type Step = 1 | 2 | 3 | 4;

// ── Themes ───────────────────────────────────────────────────────────────────
const THEMES: Record<ThemeKey, { name: string; bg: string; overlay: string; headline: string; body: string; accent: string; accentText: string }> = {
  brandverse: { name: "Brandverse Gold", bg: "#0a0a0a", overlay: "rgba(0,0,0,0.58)", headline: "#d4b461", body: "#ffffff", accent: "#d4b461", accentText: "#000000" },
  minimal:    { name: "Clean White",     bg: "#ffffff",  overlay: "rgba(255,255,255,0.72)", headline: "#111111", body: "#444444", accent: "#111111", accentText: "#ffffff" },
  navy:       { name: "Midnight Blue",   bg: "#0f172a",  overlay: "rgba(15,23,42,0.68)",   headline: "#818cf8", body: "#e2e8f0", accent: "#818cf8", accentText: "#0f172a" },
  coral:      { name: "Bold Coral",      bg: "#1a1a1a",  overlay: "rgba(0,0,0,0.52)",      headline: "#ff6b6b", body: "#ffffff", accent: "#ff6b6b", accentText: "#000000" },
  viral:      { name: "Viral Dark",      bg: "#0d0d0d",  overlay: "rgba(0,0,0,0.60)",      headline: "#ffffff", body: "#cccccc", accent: "#ff3b8e", accentText: "#ffffff" },
};

const TONES = ["Engaging & Educational", "Bold & Direct", "Motivational", "Storytelling", "Data-Driven", "Conversational"];
const SLIDE_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10];
const ROLE_COLORS: Record<string, string> = { Hook: "#d4b461", Problem: "#f87171", Insight: "#818cf8", Solution: "#34d399", CTA: "#fb923c", Benefit: "#38bdf8", Step: "#a78bfa" };

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
async function renderSlide(slide: DesignSlide, theme: ThemeKey, num: number, total: number): Promise<string> {
  const S = 1080; const canvas = document.createElement("canvas"); canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d")!; const t = THEMES[theme];
  if (slide.layout === "split" && slide.imageUrl) {
    const W = S / 2; const img = await loadImg(slide.imageUrl);
    const sc = Math.max(W / img.width, S / img.height); const dw = img.width * sc; const dh = img.height * sc;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, S); ctx.clip(); ctx.drawImage(img, (W-dw)/2, (S-dh)/2, dw, dh); ctx.restore();
    ctx.fillStyle = t.bg; ctx.fillRect(W, 0, W, S);
    ctx.fillStyle = t.accent; ctx.fillRect(W, 0, 6, S);
    const tx = W + 60; const tw = W - 100;
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.roundRect(tx, 80, 70, 32, 8); ctx.fill();
    ctx.fillStyle = t.accentText; ctx.font = "bold 17px Inter,Arial,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${num}/${total}`, tx + 35, 102);
    ctx.fillStyle = t.headline; ctx.font = "bold 58px Inter,Arial,sans-serif"; ctx.textAlign = "left";
    const hy = wrapText(ctx, slide.headline || "Your Headline", tx, 200, tw, 68);
    ctx.fillStyle = t.accent; ctx.fillRect(tx, hy + 28, 60, 4);
    ctx.fillStyle = t.body; ctx.font = "34px Inter,Arial,sans-serif"; wrapText(ctx, slide.body || "", tx, hy + 68, tw, 48);
  } else {
    if (slide.imageUrl && slide.layout !== "text") {
      const img = await loadImg(slide.imageUrl); const sc = Math.max(S/img.width, S/img.height);
      ctx.drawImage(img, (S-img.width*sc)/2, (S-img.height*sc)/2, img.width*sc, img.height*sc);
      ctx.fillStyle = t.overlay; ctx.fillRect(0,0,S,S);
    } else { ctx.fillStyle = t.bg; ctx.fillRect(0,0,S,S); }
    ctx.fillStyle = t.accent; ctx.fillRect(0,0,S,8);
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.roundRect(S/2-36,50,72,36,10); ctx.fill();
    ctx.fillStyle = t.accentText; ctx.font = "bold 19px Inter,Arial,sans-serif"; ctx.textAlign = "center"; ctx.fillText(`${num} / ${total}`, S/2, 74);
    ctx.fillStyle = t.headline; ctx.font = "bold 72px Inter,Arial,sans-serif"; ctx.textAlign = "center";
    const hy = wrapText(ctx, slide.headline || "Your Headline", S/2, 220, S-130, 86);
    ctx.fillStyle = t.accent; ctx.fillRect(S/2-60, hy+28, 120, 5);
    ctx.fillStyle = t.body; ctx.font = "36px Inter,Arial,sans-serif"; ctx.textAlign = "center";
    wrapText(ctx, slide.body || "", S/2, hy+76, S-170, 50);
  }
  ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.font = "20px Inter,Arial,sans-serif"; ctx.textAlign = "right";
  ctx.fillText("brandversee", S-36, S-28);
  ctx.fillStyle = t.accent; ctx.fillRect(0, S-8, S, 8);
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

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ["Setup", "Edit Text", "Design", "Preview & Export"];
function StepBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step; const done = step > n; const active = step === n;
        return (
          <div key={n} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
                style={{ background: done ? "#d4b461" : active ? "rgba(212,180,97,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${done || active ? "#d4b461" : "rgba(255,255,255,0.1)"}`, color: done ? "#000" : active ? "#d4b461" : "rgba(255,255,255,0.35)" }}>
                {done ? <Check className="w-3 h-3" /> : n}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: active ? "#d4b461" : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: step > n ? "rgba(212,180,97,0.5)" : "rgba(255,255,255,0.08)" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CarouselStudio() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [slideCount, setSlideCount] = useState(6);
  const [generating, setGenerating] = useState(false);

  // Step 2 state
  const [slides, setSlides] = useState<DesignSlide[]>([]);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Step 3 state
  const [theme, setTheme] = useState<ThemeKey>("brandverse");
  const [applyToAll, setApplyToAll] = useState(true);
  const [globalImage, setGlobalImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [generatingImageIdx, setGeneratingImageIdx] = useState<number | "all" | null>(null);

  // Step 4 state
  const [exporting, setExporting] = useState(false);

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const globalRef = useRef<HTMLInputElement>(null);
  const multiRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const t = THEMES[theme];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function readFile(file: File): Promise<string> {
    return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target!.result as string); fr.readAsDataURL(file); });
  }

  function updateSlide(idx: number, updates: Partial<DesignSlide>) {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  }

  // ── Step 1 → Generate text ─────────────────────────────────────────────────
  async function generateText() {
    if (!topic.trim()) { toast({ title: "Enter a topic first", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const data = await apiRequest("POST", "/api/carousel/generate-text", { topic: topic.trim(), tone, slideCount });
      const designed: DesignSlide[] = (data.slides as AiSlide[]).map(s => ({ ...s, imageUrl: null, layout: "full" as const }));
      setSlides(designed);
      setActiveIdx(0);
      setStep(2);
      toast({ title: `${designed.length} slides generated!`, description: `3 credits used · ${data.balance} remaining` });
    } catch (err: any) {
      if (err.message?.includes("402") || err.insufficientCredits) {
        toast({ title: "Not enough credits", description: "Upgrade your plan to generate more carousels.", variant: "destructive" });
      } else {
        toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      }
    } finally { setGenerating(false); }
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
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally { setRegenIdx(null); }
  }

  // ── Step 3 image handling ──────────────────────────────────────────────────
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
    toast({ title: `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded` });
  }

  function assignImageToSlide(slideIdx: number, imgUrl: string) {
    updateSlide(slideIdx, { imageUrl: imgUrl, layout: "full" });
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
  async function downloadAll() {
    setExporting(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const url = await renderSlide(slides[i], theme, i + 1, slides.length);
        const a = document.createElement("a"); a.href = url; a.download = `slide-${i + 1}.png`; a.click();
        await new Promise(r => setTimeout(r, 220));
      }
      toast({ title: `${slides.length} slides downloaded!` });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
    finally { setExporting(false); }
  }

  async function downloadOne(idx: number) {
    try {
      const url = await renderSlide(slides[idx], theme, idx + 1, slides.length);
      const a = document.createElement("a"); a.href = url; a.download = `slide-${idx + 1}.png`; a.click();
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
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
        if (d.slides) { setSlides(d.slides); if (d.theme) setTheme(d.theme); if (d.topic) setTopic(d.topic); if (d.tone) setTone(d.tone); setStep(2); setActiveIdx(0); toast({ title: "Project loaded!" }); }
      } catch { toast({ title: "Invalid file", variant: "destructive" }); }
    };
    fr.readAsText(file);
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

        {/* Square subsection card */}
        <div
          onClick={() => setOpen(v => !v)}
          data-testid="carousel-card-toggle"
          className="rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] select-none mb-4"
          style={{ background: open ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${open ? "rgba(212,180,97,0.4)" : "rgba(255,255,255,0.07)"}`, boxShadow: open ? "0 0 40px rgba(212,180,97,0.07)" : "none" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.25)" }}>
                <Layers className="w-5 h-5" style={{ color: "#d4b461" }} />
              </div>
              <div>
                <p className="text-base font-black text-white">Carousel Generator</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI writes your slides · add your designs · export as PNG</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {["AI text generation", "Up to 10 slides", "Image upload", "PNG export"].map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </div>
        </div>

        {/* Expanded content */}
        {open && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">

            {/* Import / Save project toolbar */}
            <div className="flex items-center gap-2 justify-end">
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadProject(f); e.target.value = ""; }} />
              <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all">
                <Upload className="w-3 h-3" /> Import Project
              </button>
              {slides.length > 0 && (
                <button onClick={saveProject} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all">
                  <Download className="w-3 h-3" /> Save Project
                </button>
              )}
            </div>

            <StepBar step={step} />

            {/* ── STEP 1: Setup ──────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">What's your carousel about? <span className="text-[#d4b461]">*</span></Label>
                    <Input
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. 5 mistakes that stop Instagram growth, how to get clients from DMs, morning routine for productivity…"
                      className="bg-white/5 border-white/10 text-sm h-12"
                      data-testid="input-topic"
                      onKeyDown={e => e.key === "Enter" && generateText()}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Tone</Label>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map(t => (
                          <button key={t} onClick={() => setTone(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tone === t ? "border-[#d4b461]/60 text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/25"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Number of slides</Label>
                      <div className="flex flex-wrap gap-2">
                        {SLIDE_COUNTS.map(n => (
                          <button key={n} onClick={() => setSlideCount(n)}
                            className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${slideCount === n ? "border-[#d4b461]/60 text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/25"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={generateText} disabled={generating || !topic.trim()}
                  className="w-full h-13 font-bold text-base gap-3 bg-[#d4b461] hover:bg-[#c4a451] text-black"
                  data-testid="button-generate-text">
                  {generating ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Generating {slideCount} slides…</>
                  ) : (
                    <><Wand2 className="w-5 h-5" /> Generate Carousel Text with AI <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">Uses 3 credits · AI writes Hook → Content → CTA structure automatically</p>
              </div>
            )}

            {/* ── STEP 2: Edit Text ──────────────────────────────────────── */}
            {step === 2 && slides.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Review & Edit Your Slides</p>
                    <p className="text-xs text-muted-foreground mt-0.5">AI has written all {slides.length} slides — edit any text or regenerate individual slides</p>
                  </div>
                  <Button onClick={() => setStep(3)} className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-2 h-9 text-sm" data-testid="button-next-design">
                    Next: Design <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  {slides.map((slide, i) => (
                    <div key={i} onClick={() => setActiveIdx(i)}
                      className="rounded-xl border p-4 space-y-3 transition-all cursor-pointer"
                      style={{ background: i === activeIdx ? "rgba(212,180,97,0.04)" : "rgba(255,255,255,0.02)", borderColor: i === activeIdx ? "rgba(212,180,97,0.4)" : "rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{i + 1}</div>
                          <Badge className="text-[10px] h-4 px-2 border-0 font-semibold"
                            style={{ background: `${ROLE_COLORS[slide.role] || "#d4b461"}18`, color: ROLE_COLORS[slide.role] || "#d4b461" }}>
                            {slide.role}
                          </Badge>
                        </div>
                        <button onClick={e => { e.stopPropagation(); regenerateSlide(i); }} disabled={regenIdx === i}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all disabled:opacity-50"
                          data-testid={`regen-slide-${i + 1}`}>
                          <RefreshCw className={`w-3 h-3 ${regenIdx === i ? "animate-spin" : ""}`} />
                          {regenIdx === i ? "Regenerating…" : "Regenerate"}
                        </button>
                      </div>
                      <div className="space-y-2" onClick={e => e.stopPropagation()}>
                        <Input value={slide.headline} onChange={e => updateSlide(i, { headline: e.target.value })}
                          placeholder="Headline…" className="bg-white/5 border-white/10 text-sm font-semibold h-9"
                          data-testid={`input-headline-${i + 1}`} />
                        <Textarea value={slide.body} onChange={e => updateSlide(i, { body: e.target.value })}
                          placeholder="Body text…" className="bg-white/5 border-white/10 text-xs resize-none min-h-[64px]"
                          data-testid={`textarea-body-${i + 1}`} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Back to Setup
                  </button>
                  <Button onClick={() => setStep(3)} className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-2 h-9 text-sm">
                    Next: Design <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Design ────────────────────────────────────────── */}
            {step === 3 && slides.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Choose Your Design</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pick a template and upload your images</p>
                  </div>
                  <Button onClick={() => setStep(4)} className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-2 h-9 text-sm" data-testid="button-next-preview">
                    <Play className="w-3.5 h-3.5" /> Preview Carousel
                  </Button>
                </div>

                {/* Template picker */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-3 flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> Template</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(THEMES) as ThemeKey[]).map(key => (
                      <button key={key} onClick={() => setTheme(key)} data-testid={`theme-${key}`}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${theme === key ? "border-[#d4b461]/70 text-[#d4b461] bg-[#d4b461]/10" : "border-white/10 text-muted-foreground hover:border-white/25"}`}>
                        <div className="w-3 h-3 rounded-full" style={{ background: THEMES[key].accent }} />
                        {THEMES[key].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image section */}
                <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Slide Images</Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Same image for all</span>
                        <button onClick={() => setApplyToAll(v => !v)}
                          className="w-9 h-5 rounded-full transition-all relative"
                          style={{ background: applyToAll ? "#d4b461" : "rgba(255,255,255,0.1)" }}>
                          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{ left: applyToAll ? "calc(100% - 18px)" : "2px" }} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI Generate Images - primary action */}
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: "#d4b461" }} />
                      <span className="text-xs font-semibold" style={{ color: "#d4b461" }}>Generate AI Images</span>
                      <span className="text-[10px] text-muted-foreground ml-1">Powered by Google Imagen</span>
                    </div>
                    <p className="text-xs text-muted-foreground">AI creates unique backgrounds for each slide based on your content — cinematic, professional, no text overlays.</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={generateAiImagesForAll} disabled={generatingImageIdx !== null} data-testid="button-ai-images-all"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        style={{ background: "#d4b461", color: "#000" }}>
                        {generatingImageIdx === "all" ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating all slides…</> : <><Zap className="w-4 h-4" /> Generate All {slides.length} Slides</>}
                      </button>
                    </div>
                    {generatingImageIdx !== null && generatingImageIdx !== "all" && (
                      <p className="text-xs" style={{ color: "#d4b461" }}><RefreshCw className="w-3 h-3 inline animate-spin mr-1" />Generating image for slide {(generatingImageIdx as number) + 1}…</p>
                    )}

                    {/* Per-slide generate buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {slides.map((slide, si) => (
                        <div key={si} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "1/1", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {slide.imageUrl ? (
                            <>
                              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity">
                                <button onClick={() => generateAiImageForSlide(si)} disabled={generatingImageIdx !== null}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#d4b461] text-black disabled:opacity-50"
                                  data-testid={`button-ai-image-${si + 1}`}>
                                  <RefreshCw className="w-3 h-3" /> Regenerate
                                </button>
                                <button onClick={() => updateSlide(si, { imageUrl: null })}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/40 text-white">
                                  Remove
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 py-1 px-1.5 text-center text-[9px] font-semibold bg-black/70 text-white truncate">{slide.role}</div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                              <span className="text-[9px] font-semibold text-center" style={{ color: ROLE_COLORS[slide.role] || "#d4b461" }}>{slide.role}</span>
                              <span className="text-[8px] text-muted-foreground text-center leading-tight line-clamp-2">{slide.headline}</span>
                              <button onClick={() => generateAiImageForSlide(si)} disabled={generatingImageIdx !== null}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all mt-1 disabled:opacity-50"
                                style={{ background: "rgba(212,180,97,0.15)", color: "#d4b461", border: "1px solid rgba(212,180,97,0.3)" }}
                                data-testid={`button-ai-image-slide-${si + 1}`}>
                                {generatingImageIdx === si ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                {generatingImageIdx === si ? "…" : "Generate"}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                    <span className="text-[10px] text-muted-foreground px-2">or upload your own</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                  </div>

                  {/* Global image upload */}
                  <input ref={globalRef} type="file" accept="image/*" className="hidden"
                    onChange={async e => { const f = e.target.files?.[0]; if (f) { await handleGlobalImage(f); } e.target.value = ""; }} />
                  {globalImage ? (
                    <div className="relative rounded-xl overflow-hidden h-28">
                      <img src={globalImage} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                        <button onClick={() => globalRef.current?.click()} className="px-3 py-1.5 bg-white/20 rounded-lg text-white text-xs font-medium">Change</button>
                        <button onClick={() => { setGlobalImage(null); if (applyToAll) setSlides(prev => prev.map(s => ({ ...s, imageUrl: null }))); }} className="px-3 py-1.5 bg-red-500/40 rounded-lg text-white text-xs font-medium">Remove</button>
                      </div>
                      {applyToAll && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d4b461] text-black">Applied to all slides</div>}
                    </div>
                  ) : (
                    <button onClick={() => globalRef.current?.click()}
                      className="w-full h-24 rounded-xl border border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#d4b461]/40 hover:text-[#d4b461] transition-all">
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-xs font-medium">{applyToAll ? "Upload design image → applied to all slides" : "Upload brand design image"}</span>
                    </button>
                  )}

                  {/* Multiple images upload + per-slide assignment */}
                  {!applyToAll && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Upload multiple images → assign to slides</span>
                        <input ref={multiRef} type="file" accept="image/*" multiple className="hidden"
                          onChange={e => { if (e.target.files?.length) handleMultiUpload(e.target.files); e.target.value = ""; }} />
                        <button onClick={() => multiRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-muted-foreground hover:text-white hover:border-white/25 transition-all">
                          <Upload className="w-3 h-3" /> Upload images
                        </button>
                      </div>
                      {uploadedImages.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {uploadedImages.map((img, ii) => (
                            <div key={ii} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-center text-white py-0.5">Img {ii + 1}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Per-slide assignment */}
                      {uploadedImages.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Assign images to slides:</p>
                          {slides.map((slide, si) => (
                            <div key={si} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                              <span className="text-xs font-medium text-white w-14">Slide {si + 1}</span>
                              <Badge className="text-[10px] border-0 mr-auto" style={{ background: `${ROLE_COLORS[slide.role] || "#d4b461"}18`, color: ROLE_COLORS[slide.role] || "#d4b461" }}>{slide.role}</Badge>
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => updateSlide(si, { imageUrl: null })}
                                  className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${!slide.imageUrl ? "border-[#d4b461]/50 text-[#d4b461] bg-[#d4b461]/08" : "border-white/08 text-muted-foreground hover:border-white/20"}`}>
                                  None
                                </button>
                                {uploadedImages.map((img, ii) => (
                                  <button key={ii} onClick={() => assignImageToSlide(si, img)}
                                    className={`w-7 h-7 rounded overflow-hidden border-2 transition-all ${slide.imageUrl === img ? "border-[#d4b461]" : "border-white/15 hover:border-white/35"}`}>
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-1">
                  <button onClick={() => setStep(2)} className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Back to Text
                  </button>
                  <Button onClick={() => setStep(4)} className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-2 h-9 text-sm">
                    <Play className="w-3.5 h-3.5" /> Preview Carousel
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Preview & Export ──────────────────────────────── */}
            {step === 4 && slides.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Preview & Export</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{slides.length} slides ready · 1080×1080 PNG</p>
                  </div>
                  <Button onClick={downloadAll} disabled={exporting} className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-bold gap-2 h-10" data-testid="button-download-all">
                    <Download className="w-4 h-4" />
                    {exporting ? "Downloading…" : `Download All (${slides.length})`}
                  </Button>
                </div>

                {/* Slide tabs */}
                <div className="flex flex-wrap gap-2 items-center">
                  {slides.map((s, i) => (
                    <button key={i} onClick={() => setActiveIdx(i)} data-testid={`slide-tab-${i + 1}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${i === activeIdx ? "bg-[#d4b461] text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                      <span>{i + 1}</span>
                      <span className="hidden sm:inline" style={{ color: i === activeIdx ? "rgba(0,0,0,0.7)" : ROLE_COLORS[s.role] || "inherit" }}>{s.role}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Preview */}
                  <div className="space-y-3">
                    <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "1/1", background: t.bg, position: "relative" }} data-testid="slide-preview">
                      <SlidePreview slide={slides[activeIdx]} theme={t} num={activeIdx + 1} total={slides.length} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={activeIdx === 0}
                        className="p-2 rounded-lg border border-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center">
                        <p className="text-xs font-semibold text-white">{slides[activeIdx]?.role}</p>
                        <p className="text-[10px] text-muted-foreground">Slide {activeIdx + 1} of {slides.length}</p>
                      </div>
                      <button onClick={() => setActiveIdx(i => Math.min(slides.length - 1, i + 1))} disabled={activeIdx === slides.length - 1}
                        className="p-2 rounded-lg border border-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => downloadOne(activeIdx)}
                      className="w-full py-2 rounded-xl border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-all flex items-center justify-center gap-2"
                      data-testid="button-download-slide">
                      <Download className="w-3.5 h-3.5" /> Download this slide
                    </button>
                  </div>

                  {/* All slides grid */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Slides</p>
                    <div className="grid grid-cols-3 gap-2">
                      {slides.map((s, i) => (
                        <div key={i} className="space-y-1 cursor-pointer" onClick={() => setActiveIdx(i)}>
                          <div className={`rounded-lg overflow-hidden border-2 transition-all ${i === activeIdx ? "border-[#d4b461]" : "border-white/10 hover:border-white/25"}`} style={{ aspectRatio: "1/1", background: t.bg }}>
                            <SlidePreview slide={s} theme={t} num={i + 1} total={slides.length} mini />
                          </div>
                          <p className="text-[9px] text-center font-medium" style={{ color: ROLE_COLORS[s.role] || "#d4b461" }}>{s.role}</p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 space-y-2">
                      <button onClick={() => setStep(3)} className="w-full py-2 rounded-xl border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-all flex items-center justify-center gap-2">
                        <Palette className="w-3.5 h-3.5" /> Change Design
                      </button>
                      <button onClick={() => setStep(2)} className="w-full py-2 rounded-xl border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-all flex items-center justify-center gap-2">
                        Edit Text
                      </button>
                      <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-[10px] text-muted-foreground">🚧</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Auto-post to Instagram — Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
