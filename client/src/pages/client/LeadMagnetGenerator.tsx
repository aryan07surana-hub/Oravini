import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wand2, Download, ChevronRight, CheckSquare, Copy,
  Layers2, RefreshCw, Sparkles, FileText, Palette,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeadMagnetForm {
  niche: string;
  type: string;
  topic: string;
  audience: string;
  goal: string;
  themeColor: string;
  fontStyle: string;
  sameDesign: boolean;
}

interface LMPage {
  id: string;
  type: "cover" | "problem" | "content" | "checklist" | "tips" | "cta";
  title?: string;
  subtitle?: string;
  hook?: string;
  heading?: string;
  body?: string;
  emphasis?: string;
  bullets?: string[];
  items?: string[];
  tips?: { number: string; title: string; body: string }[];
  headline?: string;
  cta?: string;
  customColor?: string;
  customLayout?: "standard" | "full-bleed" | "dark";
}

interface LMResult {
  titleOptions: string[];
  selectedTitle: string;
  hookLine: string;
  pages: LMPage[];
  ctas: string[];
  repurpose: {
    carousel: string[];
    linkedin: string;
    caption: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NICHES = ["Marketing / Personal Brand", "Fitness & Health", "Finance & Investing", "Business Coaching", "Real Estate", "E-commerce", "Social Media", "Mindset & Productivity", "Nutrition", "Other"];
const TYPES = ["Guide / eBook", "Checklist", "Cheat Sheet", "Template", "Mini Planner", "Swipe File"];
const FONT_STYLES = [
  { id: "modern", label: "Modern", class: "font-sans" },
  { id: "bold", label: "Bold", class: "font-sans font-black" },
  { id: "minimal", label: "Minimal", class: "font-sans font-light" },
];
const COLOR_PRESETS = [
  { label: "Gold", value: "#d4b461" },
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#10b981" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
];
const PAGE_LAYOUTS = ["standard", "full-bleed", "dark"] as const;

// ─── Page Renderer ────────────────────────────────────────────────────────────

function PageRenderer({
  page, color, fontStyle, layout,
}: { page: LMPage; color: string; fontStyle: string; layout: "standard" | "full-bleed" | "dark" }) {
  const isFull = layout === "full-bleed";
  const isDark = layout === "dark";
  const bg = isFull ? color : isDark ? "#111111" : "#ffffff";
  const textMain = isFull || isDark ? "#ffffff" : "#111111";
  const textSub = isFull || isDark ? "rgba(255,255,255,0.75)" : "#555555";
  const accentBg = isFull ? "rgba(255,255,255,0.15)" : isDark ? color : `${color}18`;
  const fontClass = fontStyle === "bold" ? "font-black" : fontStyle === "minimal" ? "font-light" : "font-sans";

  const baseStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1.414",
    background: bg,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
  };

  const accent: React.CSSProperties = {
    width: 6,
    minWidth: 6,
    background: color,
    borderRadius: 4,
    marginRight: 16,
    alignSelf: "stretch",
  };

  // Decorative corner
  const deco: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    borderRadius: "0 12px 0 100%",
    background: isFull ? "rgba(255,255,255,0.1)" : `${color}20`,
    pointerEvents: "none",
  };

  if (page.type === "cover") {
    return (
      <div style={baseStyle}>
        <div style={deco} />
        {/* Top bar */}
        <div style={{ height: 6, background: color, width: "100%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 36px", textAlign: "center", gap: 20 }}>
          {/* Type badge */}
          <div style={{ background: accentBg, border: `1px solid ${color}40`, borderRadius: 20, padding: "4px 14px", fontSize: 10, fontWeight: 700, color: isFull || isDark ? "#fff" : color, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Free Resource
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: textMain, lineHeight: 1.2, maxWidth: 380 }}>{page.title}</div>
          {page.subtitle && <div style={{ fontSize: 14, color: textSub, lineHeight: 1.5, maxWidth: 320 }}>{page.subtitle}</div>}
          {/* Divider */}
          <div style={{ width: 48, height: 3, background: color, borderRadius: 2 }} />
          {page.hook && <div style={{ fontSize: 13, color: isFull || isDark ? "rgba(255,255,255,0.85)" : color, fontStyle: "italic", fontWeight: 600, maxWidth: 300 }}>"{page.hook}"</div>}
        </div>
        {/* Bottom bar */}
        <div style={{ height: 4, background: `${color}50`, width: "100%" }} />
      </div>
    );
  }

  if (page.type === "problem") {
    return (
      <div style={baseStyle}>
        <div style={deco} />
        <div style={{ height: 6, background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 36px", gap: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.12em" }}>The Challenge</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textMain, lineHeight: 1.3 }}>{page.heading}</div>
          <div style={{ fontSize: 12, color: textSub, lineHeight: 1.7 }}>{page.body}</div>
          {page.emphasis && (
            <div style={{ background: accentBg, border: `1px solid ${color}40`, borderRadius: 8, padding: "14px 18px", fontSize: 13, fontWeight: 700, color: isFull || isDark ? "#fff" : color, lineHeight: 1.4, marginTop: "auto" }}>
              💡 {page.emphasis}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (page.type === "content") {
    return (
      <div style={baseStyle}>
        <div style={deco} />
        <div style={{ height: 6, background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 36px", gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: textMain, lineHeight: 1.3 }}>{page.heading}</div>
          <div style={{ width: 32, height: 3, background: color, borderRadius: 2 }} />
          {page.body && <div style={{ fontSize: 11.5, color: textSub, lineHeight: 1.7 }}>{page.body}</div>}
          {page.bullets && page.bullets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {page.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 11.5, color: textMain }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (page.type === "checklist") {
    return (
      <div style={baseStyle}>
        <div style={deco} />
        <div style={{ height: 6, background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 36px", gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: textMain }}>{page.heading}</div>
          <div style={{ width: 32, height: 3, background: color, borderRadius: 2 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(page.items || []).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 11, color: textMain }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${color}`, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: `${color}30` }} />
                </div>
                <span style={{ lineHeight: 1.5, color: textSub }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (page.type === "tips") {
    return (
      <div style={baseStyle}>
        <div style={deco} />
        <div style={{ height: 6, background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 36px", gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: textMain }}>{page.heading}</div>
          <div style={{ width: 32, height: 3, background: color, borderRadius: 2 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(page.tips || []).map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, flexShrink: 0, minWidth: 32 }}>{tip.number}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: textMain, marginBottom: 3 }}>{tip.title}</div>
                  <div style={{ fontSize: 10.5, color: textSub, lineHeight: 1.6 }}>{tip.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (page.type === "cta") {
    return (
      <div style={{ ...baseStyle, background: isFull ? color : isDark ? "#111" : color }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 36px", textAlign: "center", gap: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Ready?</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.2, maxWidth: 340 }}>{page.headline}</div>
          {page.body && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, maxWidth: 300 }}>{page.body}</div>}
          {page.cta && (
            <div style={{ background: "#ffffff", color, borderRadius: 8, padding: "12px 24px", fontSize: 13, fontWeight: 800, marginTop: 8 }}>
              {page.cta}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: "config", label: "Setup" },
  { id: "preview", label: "Preview & Export" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadMagnetGenerator() {
  const { toast } = useToast();
  const [step, setStep] = useState<"config" | "generating" | "preview">("config");
  const [result, setResult] = useState<LMResult | null>(null);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [selectedCta, setSelectedCta] = useState(0);
  const [activeRepurpose, setActiveRepurpose] = useState<"carousel" | "linkedin" | "caption">("linkedin");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pageLayouts, setPageLayouts] = useState<{ color: string; layout: "standard" | "full-bleed" | "dark" }[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [form, setForm] = useState<LeadMagnetForm>({
    niche: "",
    type: "",
    topic: "",
    audience: "",
    goal: "",
    themeColor: "#d4b461",
    fontStyle: "modern",
    sameDesign: true,
  });

  const generateMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/lead-magnet/generate", body),
    onSuccess: (data: LMResult) => {
      setResult(data);
      setSelectedTitleIdx(0);
      setSelectedCta(0);
      setPageLayouts(data.pages.map(() => ({ color: form.themeColor, layout: "standard" as const })));
      setStep("preview");
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setStep("config");
    },
  });

  const handleGenerate = () => {
    if (!form.topic.trim()) {
      toast({ title: "Topic required", description: "Please enter a topic for your lead magnet.", variant: "destructive" });
      return;
    }
    setStep("generating");
    generateMutation.mutate({
      niche: form.niche,
      type: form.type,
      topic: form.topic,
      audience: form.audience,
      goal: form.goal,
    });
  };

  const handleExportPDF = useCallback(async () => {
    if (!result) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
      }
      const titleSlug = (result.titleOptions[selectedTitleIdx] || "lead-magnet").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      pdf.save(`${titleSlug}.pdf`);
      toast({ title: "PDF exported!", description: "Your lead magnet has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [result, selectedTitleIdx]);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const updatePageLayout = (idx: number, updates: Partial<{ color: string; layout: "standard" | "full-bleed" | "dark" }>) => {
    setPageLayouts(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  // ── Generating screen ───────────────────────────────────────────────────
  if (step === "generating") {
    return (
      <ClientLayout>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <Wand2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Generating your lead magnet…</h2>
            <p className="text-sm text-zinc-400">Our AI is writing content, designing pages, and crafting CTAs. This takes about 15–30 seconds.</p>
          </div>
          <div className="space-y-2 text-left">
            {["Analysing niche & audience", "Writing page content", "Structuring design pages", "Optimising CTAs & repurpose"].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
      </ClientLayout>
    );
  }

  // ── Config step ──────────────────────────────────────────────────────────
  if (step === "config") {
    return (
      <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <FileText className="w-3 h-3" />
              Lead Magnet Generator
            </div>
            <h1 className="text-3xl font-black text-white">Create Your Lead Magnet</h1>
            <p className="text-zinc-400 text-sm mt-1">Fill in the details below — AI will generate a full, designed, export-ready lead magnet.</p>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Niche */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Niche *</label>
              <Select value={form.niche} onValueChange={v => setForm(f => ({ ...f, niche: v }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white" data-testid="select-niche">
                  <SelectValue placeholder="Select your niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Type *</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white" data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Topic */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-300">Topic <span className="text-red-400">*</span></label>
              <Input
                placeholder="e.g. How to grow on Instagram from 0 to 10k"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-topic"
              />
            </div>

            {/* Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Target Audience</label>
              <Input
                placeholder="e.g. Aspiring coaches with under 1k followers"
                value={form.audience}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-audience"
              />
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Goal / CTA</label>
              <Input
                placeholder="e.g. Book a discovery call, grow email list"
                value={form.goal}
                onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-goal"
              />
            </div>
          </div>

          {/* Design options */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Palette className="w-4 h-4 text-primary" />
              Design Settings
            </div>

            {/* Theme color */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Theme Colour</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c.value}
                    data-testid={`color-${c.label.toLowerCase()}`}
                    onClick={() => setForm(f => ({ ...f, themeColor: c.value }))}
                    title={c.label}
                    className="relative w-9 h-9 rounded-lg border-2 transition-all"
                    style={{
                      background: c.value,
                      borderColor: form.themeColor === c.value ? "#fff" : "transparent",
                      boxShadow: form.themeColor === c.value ? `0 0 0 3px ${c.value}60` : "none",
                    }}
                  >
                    {form.themeColor === c.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white/80" />
                      </div>
                    )}
                  </button>
                ))}
                {/* Custom color */}
                <label className="w-9 h-9 rounded-lg border-2 border-zinc-700 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors overflow-hidden relative" title="Custom colour">
                  <span className="text-[10px] text-zinc-400">+</span>
                  <input type="color" value={form.themeColor} onChange={e => setForm(f => ({ ...f, themeColor: e.target.value }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
              </div>
            </div>

            {/* Font style */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Font Style</label>
              <div className="flex gap-2">
                {FONT_STYLES.map(fs => (
                  <button
                    key={fs.id}
                    data-testid={`font-${fs.id}`}
                    onClick={() => setForm(f => ({ ...f, fontStyle: fs.id }))}
                    className={`px-4 py-2 rounded-lg border text-xs transition-all ${form.fontStyle === fs.id ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}
                  >
                    <span className={fs.class}>{fs.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Design consistency */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Page Design</label>
              <div className="flex gap-2">
                {[
                  { val: true, label: "Same on all pages", desc: "Consistent throughout" },
                  { val: false, label: "Different per page", desc: "Customise each page" },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    data-testid={opt.val ? "design-same" : "design-different"}
                    onClick={() => setForm(f => ({ ...f, sameDesign: opt.val }))}
                    className={`flex-1 rounded-lg border p-3 text-left transition-all ${form.sameDesign === opt.val ? "border-primary bg-primary/10" : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"}`}
                  >
                    <p className={`text-xs font-semibold ${form.sameDesign === opt.val ? "text-primary" : "text-white"}`}>{opt.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black"
            data-testid="btn-generate-lead-magnet"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Lead Magnet
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
      </ClientLayout>
    );
  }

  // ── Preview step ─────────────────────────────────────────────────────────
  if (!result) return null;

  const activeTitle = result.titleOptions[selectedTitleIdx] || result.selectedTitle;

  return (
    <ClientLayout>
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-xs">Generated</Badge>
              <span className="text-xs text-zinc-500">{result.pages.length} pages</span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">{activeTitle}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStep("config"); setResult(null); }}
              className="border-zinc-700 text-zinc-300 hover:text-white"
              data-testid="btn-regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Regenerate
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
              className="bg-primary hover:bg-primary/90 text-black font-bold"
              data-testid="btn-export-pdf"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Title selector */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 mb-3">Choose a title (5 options generated)</p>
          <div className="flex flex-col gap-2">
            {result.titleOptions.map((title, i) => (
              <button
                key={i}
                data-testid={`title-option-${i}`}
                onClick={() => setSelectedTitleIdx(i)}
                className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${selectedTitleIdx === i ? "border-primary bg-primary/10 text-white font-semibold" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"}`}
              >
                <span className="text-primary font-bold mr-2">{i + 1}.</span>{title}
              </button>
            ))}
          </div>
        </div>

        {/* Pages grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Pages Preview</h2>
            {!form.sameDesign && <span className="text-xs text-zinc-500">Customise each page below</span>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {result.pages.map((page, idx) => {
              const pl = pageLayouts[idx] || { color: form.themeColor, layout: "standard" as const };
              const effectiveColor = form.sameDesign ? form.themeColor : pl.color;
              const effectiveLayout = form.sameDesign ? "standard" : pl.layout;
              return (
                <div key={page.id} className="space-y-2">
                  {/* Page number */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">Page {idx + 1}</span>
                    <Badge className="text-[9px] h-4 px-1.5 bg-zinc-800 text-zinc-400 border-0 capitalize">{page.type}</Badge>
                  </div>

                  {/* Page preview - screen view */}
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <PageRenderer page={page} color={effectiveColor} fontStyle={form.fontStyle} layout={effectiveLayout} />
                  </div>

                  {/* Per-page controls (if different per page) */}
                  {!form.sameDesign && (
                    <div className="space-y-1.5 pt-1">
                      {/* Color swatches */}
                      <div className="flex gap-1 flex-wrap">
                        {COLOR_PRESETS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => updatePageLayout(idx, { color: c.value })}
                            className="w-5 h-5 rounded transition-all"
                            style={{ background: c.value, outline: pl.color === c.value ? `2px solid ${c.value}` : "none", outlineOffset: 2 }}
                          />
                        ))}
                      </div>
                      {/* Layout pills */}
                      <div className="flex gap-1">
                        {PAGE_LAYOUTS.map(l => (
                          <button
                            key={l}
                            onClick={() => updatePageLayout(idx, { layout: l })}
                            className={`text-[9px] px-2 py-0.5 rounded capitalize transition-all ${pl.layout === l ? "bg-primary/20 text-primary border border-primary/40" : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-500"}`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTAs */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <p className="text-xs font-semibold text-white flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" />CTA Options (pick one for your lead magnet)</p>
          <div className="flex flex-col gap-2">
            {result.ctas.map((cta, i) => (
              <button
                key={i}
                data-testid={`cta-option-${i}`}
                onClick={() => setSelectedCta(i)}
                className={`flex items-center justify-between text-left px-4 py-3 rounded-lg border text-sm transition-all ${selectedCta === i ? "border-primary bg-primary/10 text-white" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"}`}
              >
                <span>{cta}</span>
                <button
                  onClick={e => { e.stopPropagation(); copyText(cta, i + 100); }}
                  className="text-zinc-600 hover:text-zinc-300 ml-3 flex-shrink-0"
                  data-testid={`copy-cta-${i}`}
                >
                  {copiedIdx === i + 100 ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Repurpose */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <p className="text-xs font-semibold text-white flex items-center gap-2"><Layers2 className="w-3.5 h-3.5 text-primary" />Repurpose This Content</p>
          <div className="flex gap-2">
            {(["linkedin", "carousel", "caption"] as const).map(tab => (
              <button
                key={tab}
                data-testid={`repurpose-tab-${tab}`}
                onClick={() => setActiveRepurpose(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeRepurpose === tab ? "bg-primary/20 text-primary border border-primary/40" : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"}`}
              >
                {tab === "linkedin" ? "LinkedIn Post" : tab === "carousel" ? "Carousel Slides" : "Instagram Caption"}
              </button>
            ))}
          </div>

          {activeRepurpose === "linkedin" && (
            <div className="relative">
              <Textarea
                readOnly
                value={result.repurpose.linkedin}
                className="bg-zinc-900 border-zinc-700 text-zinc-300 text-sm min-h-[140px] resize-none"
                data-testid="repurpose-linkedin"
              />
              <button onClick={() => copyText(result.repurpose.linkedin, 200)} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300">
                {copiedIdx === 200 ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
          {activeRepurpose === "carousel" && (
            <div className="flex flex-col gap-2">
              {result.repurpose.carousel.map((slide, i) => (
                <div key={i} className="flex items-start gap-3 bg-zinc-900 rounded-lg px-4 py-3 border border-zinc-800">
                  <span className="text-xs font-bold text-primary flex-shrink-0 mt-0.5">Slide {i + 1}</span>
                  <span className="text-sm text-zinc-300">{slide}</span>
                  <button onClick={() => copyText(slide, i + 300)} className="ml-auto text-zinc-600 hover:text-zinc-300 flex-shrink-0">
                    {copiedIdx === i + 300 ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
          {activeRepurpose === "caption" && (
            <div className="relative">
              <Textarea
                readOnly
                value={result.repurpose.caption}
                className="bg-zinc-900 border-zinc-700 text-zinc-300 text-sm min-h-[100px] resize-none"
                data-testid="repurpose-caption"
              />
              <button onClick={() => copyText(result.repurpose.caption, 201)} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300">
                {copiedIdx === 201 ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Export CTA */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">Ready to download?</p>
            <p className="text-xs text-zinc-400 mt-0.5">Export your full lead magnet as a PDF — ready to share, send, or upload.</p>
          </div>
          <Button
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-primary hover:bg-primary/90 text-black font-bold flex-shrink-0"
            data-testid="btn-export-pdf-bottom"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Hidden full-res pages for PDF export */}
      <div style={{ position: "fixed", top: -9999, left: -9999, zIndex: -1, width: 595 }}>
        {result.pages.map((page, idx) => {
          const pl = pageLayouts[idx] || { color: form.themeColor, layout: "standard" as const };
          const effectiveColor = form.sameDesign ? form.themeColor : pl.color;
          const effectiveLayout = form.sameDesign ? "standard" : pl.layout;
          return (
            <div
              key={page.id}
              ref={el => { pageRefs.current[idx] = el; }}
              style={{ width: 595, height: 842, marginBottom: 0, overflow: "hidden" }}
            >
              <PageRenderer page={page} color={effectiveColor} fontStyle={form.fontStyle} layout={effectiveLayout} />
            </div>
          );
        })}
      </div>
    </div>
    </ClientLayout>
  );
}
