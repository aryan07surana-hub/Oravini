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
  Wand2, Download, ChevronRight, CheckSquare, Copy, RefreshCw, Sparkles,
  FileText, Palette, Plus, Trash2, ArrowUp, ArrowDown, MessageSquare,
  Send, LayoutTemplate, ChevronDown, ChevronUp, X, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LMForm {
  niche: string;
  nicheCustom: string;
  type: string;
  topic: string;
  audience: string;
  goal: string;
  goalCustom: string;
  ctaType: string;
  calendlyUrl: string;
  referenceUrl: string;
  pageCount: number;
  themeColor: string;
  theme: string;
  sameDesign: boolean;
}
interface LMPage {
  id: string; type: string;
  title?: string; subtitle?: string; hook?: string;
  heading?: string; body?: string; emphasis?: string;
  bullets?: string[]; items?: string[];
  tips?: { number: string; title: string; body: string }[];
  headline?: string; cta?: string;
}
interface LMResult {
  titleOptions: string[]; selectedTitle: string; hookLine: string;
  pages: LMPage[]; ctas: string[];
  repurpose: { carousel: string[]; linkedin: string; caption: string };
}
interface ChatMsg { role: "user" | "ai"; text: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const NICHE_SUGGESTIONS = ["Marketing", "Fitness", "Finance", "Personal Brand", "Coaching", "SaaS", "Real Estate", "E-commerce", "Mindset", "Nutrition", "Social Media", "Business"];
const GOAL_OPTIONS = [
  { id: "grow-email", label: "Grow Email List", icon: "📧" },
  { id: "book-call", label: "Book Calls", icon: "📞" },
  { id: "sell-product", label: "Sell Product", icon: "🛒" },
  { id: "build-audience", label: "Build Audience", icon: "👥" },
  { id: "follow-instagram", label: "Follow on Instagram", icon: "📸" },
  { id: "other", label: "Other", icon: "✏️" },
];
const CTA_OPTIONS = [
  { id: "book-call", label: "Book a Call" },
  { id: "email-list", label: "Join Newsletter" },
  { id: "follow-instagram", label: "Follow on Instagram" },
  { id: "buy-product", label: "Buy Product" },
  { id: "download", label: "Download Resource" },
  { id: "other", label: "Other" },
];
const TYPE_OPTIONS = ["Guide / eBook", "Checklist", "Cheat Sheet", "Template", "Mini Planner", "Swipe File"];
const COLOR_PRESETS = [
  { label: "Gold", value: "#d4b461" }, { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#10b981" }, { label: "Purple", value: "#7c3aed" },
  { label: "Rose", value: "#f43f5e" }, { label: "Orange", value: "#f97316" },
];
const THEMES: Record<string, { name: string; bg: string; text: string; sub: string; card: string; usesAccent?: boolean }> = {
  minimal: { name: "Minimal", bg: "#ffffff", text: "#111111", sub: "#666666", card: "#f8f8f8" },
  bold: { name: "Bold", bg: "#0f0f0f", text: "#ffffff", sub: "#aaaaaa", card: "#1a1a1a" },
  dark: { name: "Dark", bg: "#0a0a14", text: "#ffffff", sub: "#8888aa", card: "#12121f" },
  gradient: { name: "Gradient", bg: "gradient", text: "#111111", sub: "#444444", card: "#ffffff" },
  aesthetic: { name: "Aesthetic", bg: "#faf8f5", text: "#2c2c2c", sub: "#8a8a8a", card: "#f0ede9" },
};
const PAGE_TYPES = ["content", "checklist", "tips", "problem"] as const;

// ─── Page Renderer ────────────────────────────────────────────────────────────
function PageRenderer({ page, color, theme }: { page: LMPage; color: string; theme: string }) {
  const t = THEMES[theme] || THEMES.minimal;
  const isGrad = t.bg === "gradient";
  const bg = isGrad ? `linear-gradient(135deg, #ffffff 0%, ${color}18 100%)` : t.bg;
  const textMain = t.text; const textSub = t.sub;
  const accentBg = `${color}18`;

  const base: React.CSSProperties = {
    width: "100%", aspectRatio: "1 / 1.414", borderRadius: 10, overflow: "hidden",
    position: "relative", fontFamily: "Inter, system-ui, sans-serif",
    display: "flex", flexDirection: "column",
    background: bg, boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
  };
  const deco: React.CSSProperties = {
    position: "absolute", top: 0, right: 0, width: 80, height: 80,
    borderRadius: "0 10px 0 80px", background: `${color}15`, pointerEvents: "none",
  };

  if (page.type === "cover") return (
    <div style={base}>
      <div style={deco} /><div style={{ height: 5, background: color }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "28px 24px", textAlign: "center", gap: 14 }}>
        <div style={{ background: accentBg, border: `1px solid ${color}40`, borderRadius: 20, padding: "3px 10px", fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.1em" }}>Free Resource</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: textMain, lineHeight: 1.2, maxWidth: 260 }}>{page.title}</div>
        {page.subtitle && <div style={{ fontSize: 10, color: textSub, lineHeight: 1.5, maxWidth: 220 }}>{page.subtitle}</div>}
        <div style={{ width: 32, height: 3, background: color, borderRadius: 2 }} />
        {page.hook && <div style={{ fontSize: 9.5, color, fontStyle: "italic", fontWeight: 600, maxWidth: 200 }}>"{page.hook}"</div>}
      </div>
      <div style={{ height: 3, background: `${color}40` }} />
    </div>
  );

  if (page.type === "problem") return (
    <div style={base}>
      <div style={deco} /><div style={{ height: 5, background: color }} />
      <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.1em" }}>The Challenge</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: textMain, lineHeight: 1.3 }}>{page.heading}</div>
        <div style={{ fontSize: 9, color: textSub, lineHeight: 1.6 }}>{page.body}</div>
        {page.emphasis && <div style={{ background: accentBg, border: `1px solid ${color}40`, borderRadius: 6, padding: "10px 12px", fontSize: 9, fontWeight: 700, color, lineHeight: 1.4, marginTop: "auto" }}>💡 {page.emphasis}</div>}
      </div>
    </div>
  );

  if (page.type === "content") return (
    <div style={base}>
      <div style={deco} /><div style={{ height: 5, background: color }} />
      <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: textMain, lineHeight: 1.3 }}>{page.heading}</div>
        <div style={{ width: 24, height: 2.5, background: color, borderRadius: 2 }} />
        {page.body && <div style={{ fontSize: 9, color: textSub, lineHeight: 1.6 }}>{page.body}</div>}
        {page.bullets?.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 9, color: textMain }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, marginTop: 4, flexShrink: 0 }} />
            <span style={{ lineHeight: 1.5 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (page.type === "checklist") return (
    <div style={base}>
      <div style={deco} /><div style={{ height: 5, background: color }} />
      <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: textMain }}>{page.heading}</div>
        <div style={{ width: 24, height: 2.5, background: color, borderRadius: 2 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {page.items?.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 9, color: textMain }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${color}`, flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.5, color: textSub }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (page.type === "tips") return (
    <div style={base}>
      <div style={deco} /><div style={{ height: 5, background: color }} />
      <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: textMain }}>{page.heading}</div>
        <div style={{ width: 24, height: 2.5, background: color, borderRadius: 2 }} />
        {page.tips?.map((tip, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1, flexShrink: 0, minWidth: 24 }}>{tip.number}</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: textMain, marginBottom: 2 }}>{tip.title}</div>
              <div style={{ fontSize: 8.5, color: textSub, lineHeight: 1.5 }}>{tip.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (page.type === "cta") return (
    <div style={{ ...base, background: color }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "28px 24px", textAlign: "center", gap: 14 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Ready?</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1.2, maxWidth: 240 }}>{page.headline}</div>
        {page.body && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, maxWidth: 210 }}>{page.body}</div>}
        {page.cta && <div style={{ background: "#fff", color, borderRadius: 6, padding: "8px 16px", fontSize: 9, fontWeight: 800 }}>{page.cta}</div>}
      </div>
    </div>
  );
  return null;
}

// ─── Editable Field ───────────────────────────────────────────────────────────
function EditField({
  label, value, multiline = false, onChange, onImprove, improvingKey, activeImproving,
}: {
  label: string; value: string; multiline?: boolean;
  onChange: (v: string) => void; onImprove: () => void;
  improvingKey: string; activeImproving: string | null;
}) {
  const improving = activeImproving === improvingKey;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</label>
        <button
          onClick={onImprove}
          disabled={improving}
          className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
          data-testid={`improve-${improvingKey}`}
        >
          <Zap className="w-2.5 h-2.5" />{improving ? "Improving…" : "✨ Improve"}
        </button>
      </div>
      {multiline ? (
        <Textarea value={value} onChange={e => onChange(e.target.value)} className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs min-h-[80px] resize-none" />
      ) : (
        <Input value={value} onChange={e => onChange(e.target.value)} className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs h-8" />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadMagnetGenerator() {
  const { toast } = useToast();
  const [step, setStep] = useState<"config" | "generating" | "editor">("config");
  const [result, setResult] = useState<LMResult | null>(null);
  const [pages, setPages] = useState<LMPage[]>([]);
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [selectedCta, setSelectedCta] = useState(0);
  const [activeRepurpose, setActiveRepurpose] = useState<"linkedin" | "carousel" | "caption">("linkedin");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeImproving, setActiveImproving] = useState<string | null>(null);
  const [rearranging, setRearranging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showRepurpose, setShowRepurpose] = useState(false);
  const [addPageType, setAddPageType] = useState("content");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [nicheInput, setNicheInput] = useState("");
  const [showNicheSuggestions, setShowNicheSuggestions] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<LMForm>({
    niche: "", nicheCustom: "", type: "Guide / eBook", topic: "", audience: "",
    goal: "", goalCustom: "", ctaType: "book-call", calendlyUrl: "", referenceUrl: "",
    pageCount: 8, themeColor: "#d4b461", theme: "minimal", sameDesign: true,
  });

  const setF = (k: keyof LMForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── Mutations ────────────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/lead-magnet/generate", body),
    onSuccess: (data: LMResult) => {
      setResult(data);
      setPages(data.pages.map((p, i) => ({ ...p, id: `page-${i}` })));
      setSelectedPageIdx(0); setSelectedTitleIdx(0); setSelectedCta(0);
      setStep("editor");
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setStep("config");
    },
  });

  const improveTextMutation = useMutation({
    mutationFn: (body: { text: string; context: string; key: string }) =>
      apiRequest("POST", "/api/ai/lead-magnet/improve-text", body),
  });

  const rearrangeMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/lead-magnet/rearrange", body),
  });

  const chatMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/lead-magnet/chat", body),
    onSuccess: (data: { response: string }) => {
      setChatMsgs(msgs => [...msgs, { role: "ai", text: data.response }]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: () => {
      setChatMsgs(msgs => [...msgs, { role: "ai", text: "Sorry, something went wrong. Please try again." }]);
    },
  });

  const fillPageMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/lead-magnet/fill-page", body),
    onSuccess: (newPage: LMPage) => {
      setPages(prev => {
        const updated = [...prev, { ...newPage, id: `page-${prev.length}` }];
        setSelectedPageIdx(updated.length - 1);
        return updated;
      });
    },
    onError: (err: any) => toast({ title: "Failed to add page", description: err.message, variant: "destructive" }),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!form.topic.trim()) {
      toast({ title: "Topic required", description: "Enter a topic for your lead magnet.", variant: "destructive" });
      return;
    }
    setStep("generating");
    generateMutation.mutate({
      niche: form.niche || form.nicheCustom || nicheInput,
      type: form.type, topic: form.topic, audience: form.audience,
      goal: form.goal === "other" ? form.goalCustom : form.goal,
      ctaType: form.ctaType, calendlyUrl: form.calendlyUrl,
      referenceUrl: form.referenceUrl, pageCount: form.pageCount,
    });
  };

  const updatePage = (idx: number, updates: Partial<LMPage>) => {
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  const updatePageField = (idx: number, field: string, value: any) => {
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleImprove = async (idx: number, field: string, value: string, context: string) => {
    const key = `${idx}-${field}`;
    setActiveImproving(key);
    try {
      const data = await improveTextMutation.mutateAsync({ text: value, context, key });
      updatePageField(idx, field, (data as any).text);
    } catch { toast({ title: "Improve failed", variant: "destructive" }); }
    finally { setActiveImproving(null); }
  };

  const handleRearrange = async (idx: number) => {
    setRearranging(true);
    try {
      const updated = await rearrangeMutation.mutateAsync({
        page: pages[idx],
        niche: form.niche || nicheInput,
        goal: form.goal,
      });
      updatePage(idx, updated as LMPage);
      toast({ title: "Page rearranged!", description: "Content restructured by AI." });
    } catch { toast({ title: "Rearrange failed", variant: "destructive" }); }
    finally { setRearranging(false); }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMsgs(prev => [...prev, { role: "user", text: msg }]);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    chatMutation.mutate({ message: msg, pages, niche: form.niche || nicheInput, goal: form.goal, topic: form.topic });
  };

  const movePage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= pages.length) return;
    setPages(prev => { const a = [...prev]; [a[idx], a[newIdx]] = [a[newIdx], a[idx]]; return a; });
    setSelectedPageIdx(newIdx);
  };

  const deletePage = (idx: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== idx));
    setSelectedPageIdx(Math.max(0, idx - 1));
  };

  const addPage = () => {
    fillPageMutation.mutate({
      pageType: addPageType, niche: form.niche || nicheInput,
      goal: form.goal, topic: form.topic, pageIndex: pages.length,
    });
  };

  const handleExportPDF = useCallback(async () => {
    if (!pages.length) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      }
      const titleSlug = ((result?.titleOptions[selectedTitleIdx] || "lead-magnet")).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      pdf.save(`${titleSlug}.pdf`);
      toast({ title: "PDF exported!", description: "Your lead magnet has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally { setExporting(false); }
  }, [pages, result, selectedTitleIdx]);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const selectedPage = pages[selectedPageIdx];

  // ── Generating screen ─────────────────────────────────────────────────────
  if (step === "generating") return (
    <ClientLayout>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <Wand2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Building your lead magnet…</h2>
            <p className="text-sm text-zinc-400">AI is crafting {form.pageCount} pages of premium content. ~20–40 seconds.</p>
          </div>
          <div className="space-y-2 text-left">
            {["Analysing niche & audience", "Writing page content", "Structuring design", "Optimising CTAs"].map((s, i) => (
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

  // ── Config step ───────────────────────────────────────────────────────────
  if (step === "config") return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <FileText className="w-3 h-3" />Lead Magnet Generator
            </div>
            <h1 className="text-3xl font-black text-white">Create Your Lead Magnet</h1>
            <p className="text-zinc-400 text-sm mt-1">Fill in the details — AI builds a full, designed, export-ready lead magnet.</p>
          </div>

          {/* Goal selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white">What's your goal?</label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  data-testid={`goal-${opt.id}`}
                  onClick={() => setF("goal", opt.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${form.goal === opt.id ? "border-primary bg-primary/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${form.goal === opt.id ? "text-primary" : "text-zinc-300"}`}>{opt.label}</span>
                </button>
              ))}
            </div>
            {form.goal === "other" && (
              <Input
                placeholder="Describe your goal…"
                value={form.goalCustom}
                onChange={e => setF("goalCustom", e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-goal-custom"
              />
            )}
            {form.goal === "book-call" && (
              <Input
                placeholder="Calendly link (optional) — e.g. https://calendly.com/yourname"
                value={form.calendlyUrl}
                onChange={e => setF("calendlyUrl", e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-calendly"
              />
            )}
          </div>

          {/* Niche input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Niche</label>
            <div className="relative">
              <Input
                placeholder="Type your niche (e.g. Fitness, Finance, Coaching…)"
                value={nicheInput}
                onChange={e => { setNicheInput(e.target.value); setShowNicheSuggestions(true); }}
                onFocus={() => setShowNicheSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNicheSuggestions(false), 150)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-niche"
              />
              {showNicheSuggestions && nicheInput.length < 20 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                  {NICHE_SUGGESTIONS.filter(s => s.toLowerCase().includes(nicheInput.toLowerCase()) || !nicheInput).slice(0, 6).map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setNicheInput(s); setShowNicheSuggestions(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >{s}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {NICHE_SUGGESTIONS.slice(0, 8).map(s => (
                <button
                  key={s}
                  onMouseDown={() => setNicheInput(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${nicheInput === s ? "bg-primary/20 text-primary border-primary/40" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Topic + audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-300">Topic <span className="text-red-400">*</span></label>
              <Input
                placeholder="e.g. How to grow on Instagram from 0 to 10k"
                value={form.topic}
                onChange={e => setF("topic", e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                data-testid="input-topic"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Type</label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(t => (
                  <button key={t} onClick={() => setF("type", t)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${form.type === t ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Target Audience</label>
              <Input placeholder="e.g. Coaches with under 1k followers" value={form.audience} onChange={e => setF("audience", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" data-testid="input-audience" />
            </div>
          </div>

          {/* CTA type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">CTA Type</label>
            <div className="flex flex-wrap gap-2">
              {CTA_OPTIONS.map(c => (
                <button key={c.id} onClick={() => setF("ctaType", c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${form.ctaType === c.id ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            {form.ctaType === "book-call" && !form.calendlyUrl && (
              <Input placeholder="Calendly link (optional)" value={form.calendlyUrl} onChange={e => setF("calendlyUrl", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 mt-2" />
            )}
          </div>

          {/* Reference URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Reference URL <span className="text-zinc-600">(optional)</span></label>
            <Input placeholder="Website, Instagram profile, or resource URL" value={form.referenceUrl} onChange={e => setF("referenceUrl", e.target.value)} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" data-testid="input-reference" />
            <p className="text-[10px] text-zinc-600">AI will match the tone and style from this source</p>
          </div>

          {/* Page count + Design */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Palette className="w-4 h-4 text-primary" />Design & Structure</div>

            {/* Page count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400">Number of pages</label>
                <span className="text-primary font-bold text-sm">{form.pageCount}</span>
              </div>
              <input type="range" min={5} max={25} value={form.pageCount} onChange={e => setF("pageCount", Number(e.target.value))} className="w-full accent-primary" data-testid="slider-pages" />
              <div className="flex justify-between text-[10px] text-zinc-600"><span>5</span><span>25</span></div>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Theme</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(THEMES).map(([key, th]) => (
                  <button key={key} onClick={() => setF("theme", key)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${form.theme === key ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                    {th.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Accent Colour</label>
              <div className="flex gap-2 flex-wrap items-center">
                {COLOR_PRESETS.map(c => (
                  <button key={c.value} onClick={() => setF("themeColor", c.value)} title={c.label}
                    className="w-8 h-8 rounded-lg border-2 transition-all"
                    style={{ background: c.value, borderColor: form.themeColor === c.value ? "#fff" : "transparent", boxShadow: form.themeColor === c.value ? `0 0 0 2px ${c.value}60` : "none" }}
                  />
                ))}
                <label className="w-8 h-8 rounded-lg border-2 border-zinc-700 flex items-center justify-center cursor-pointer hover:border-zinc-500 relative overflow-hidden">
                  <span className="text-[10px] text-zinc-400">+</span>
                  <input type="color" value={form.themeColor} onChange={e => setF("themeColor", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending}
            className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-black" data-testid="btn-generate">
            <Sparkles className="w-4 h-4 mr-2" />Generate {form.pageCount}-Page Lead Magnet
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </ClientLayout>
  );

  // ── Editor ────────────────────────────────────────────────────────────────
  if (!result || !pages.length) return null;
  const activeTitle = result.titleOptions[selectedTitleIdx] || result.selectedTitle;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background flex flex-col">

        {/* Top bar */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => { setStep("config"); setResult(null); setPages([]); }}
              className="text-xs text-zinc-500 hover:text-white border border-zinc-700 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0">
              ← New
            </button>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Lead Magnet</p>
              <p className="text-sm font-bold text-white truncate max-w-xs">{activeTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-xs">{pages.length} pages</Badge>
            <Button variant="outline" size="sm" onClick={() => setShowRepurpose(v => !v)}
              className="border-zinc-700 text-zinc-300 hover:text-white text-xs">
              <LayoutTemplate className="w-3 h-3 mr-1" />Repurpose
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={exporting}
              className="bg-primary hover:bg-primary/90 text-black font-bold text-xs" data-testid="btn-export">
              <Download className="w-3 h-3 mr-1" />{exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Title selector row */}
        <div className="border-b border-zinc-800 bg-zinc-950/60 px-5 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-[10px] text-zinc-500 flex-shrink-0 self-center mr-1">Title:</span>
          {result.titleOptions.map((t, i) => (
            <button key={i} onClick={() => setSelectedTitleIdx(i)}
              className={`text-[10px] px-3 py-1 rounded-full border flex-shrink-0 transition-all ${selectedTitleIdx === i ? "border-primary bg-primary/10 text-primary font-semibold" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
              {i + 1}. {t.length > 45 ? t.slice(0, 45) + "…" : t}
            </button>
          ))}
        </div>

        {/* Repurpose panel */}
        {showRepurpose && (
          <div className="border-b border-zinc-800 bg-zinc-950/80 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-white flex items-center gap-2"><Sparkles className="w-3 h-3 text-primary" />Repurpose Content</p>
              <button onClick={() => setShowRepurpose(false)} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 mb-3">
              {(["linkedin", "carousel", "caption"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveRepurpose(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeRepurpose === tab ? "bg-primary/20 text-primary border border-primary/40" : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"}`}>
                  {tab === "linkedin" ? "LinkedIn" : tab === "carousel" ? "Carousel" : "Caption"}
                </button>
              ))}
            </div>
            {activeRepurpose === "linkedin" && (
              <div className="relative">
                <Textarea readOnly value={result.repurpose.linkedin} className="bg-zinc-900 border-zinc-700 text-zinc-300 text-xs min-h-[100px] resize-none" />
                <button onClick={() => copyText(result.repurpose.linkedin, 200)} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300">
                  {copiedIdx === 200 ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
            {activeRepurpose === "carousel" && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {result.repurpose.carousel.map((slide, i) => (
                  <div key={i} className="min-w-[140px] bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300">
                    <span className="text-primary font-bold text-[10px] block mb-1">Slide {i + 1}</span>{slide}
                  </div>
                ))}
              </div>
            )}
            {activeRepurpose === "caption" && (
              <div className="relative">
                <Textarea readOnly value={result.repurpose.caption} className="bg-zinc-900 border-zinc-700 text-zinc-300 text-xs min-h-[80px] resize-none" />
                <button onClick={() => copyText(result.repurpose.caption, 201)} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300">
                  {copiedIdx === 201 ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3-panel editor */}
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>

          {/* Left — Page thumbnails */}
          <div className="w-48 border-r border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-zinc-800 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Pages</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {pages.map((page, idx) => (
                <div key={page.id} className={`group relative rounded-lg border cursor-pointer transition-all ${selectedPageIdx === idx ? "border-primary ring-1 ring-primary/30" : "border-zinc-800 hover:border-zinc-600"}`}
                  onClick={() => setSelectedPageIdx(idx)}>
                  <div className="overflow-hidden rounded-t-lg" style={{ aspectRatio: "1/1.414" }}>
                    <PageRenderer page={page} color={form.themeColor} theme={form.theme} />
                  </div>
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[9px] text-zinc-500">{idx + 1}. {page.type}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); movePage(idx, -1); }} disabled={idx === 0} className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowUp className="w-2.5 h-2.5" /></button>
                      <button onClick={e => { e.stopPropagation(); movePage(idx, 1); }} disabled={idx === pages.length - 1} className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowDown className="w-2.5 h-2.5" /></button>
                      <button onClick={e => { e.stopPropagation(); deletePage(idx); }} disabled={pages.length <= 1} className="p-0.5 text-zinc-600 hover:text-red-400 disabled:opacity-20"><Trash2 className="w-2.5 h-2.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Add page */}
            <div className="p-2 border-t border-zinc-800 space-y-1.5">
              <select value={addPageType} onChange={e => setAddPageType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] rounded-lg px-2 py-1.5">
                {PAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Button size="sm" onClick={addPage} disabled={fillPageMutation.isPending}
                className="w-full h-7 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700" variant="outline">
                <Plus className="w-3 h-3 mr-1" />{fillPageMutation.isPending ? "Adding…" : "Add Page"}
              </Button>
            </div>
          </div>

          {/* Center — Page editor */}
          <div className="flex-1 overflow-y-auto bg-zinc-950/30 p-5 space-y-5">
            {selectedPage && (
              <>
                {/* Page preview */}
                <div className="max-w-xs mx-auto rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                  <PageRenderer page={selectedPage} color={form.themeColor} theme={form.theme} />
                </div>

                {/* Rearrange with AI */}
                <div className="flex justify-center">
                  <button onClick={() => handleRearrange(selectedPageIdx)} disabled={rearranging}
                    className="flex items-center gap-2 text-xs px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${rearranging ? "animate-spin" : ""}`} />
                    {rearranging ? "Rearranging…" : "🔄 Rearrange with AI"}
                  </button>
                </div>

                {/* Edit fields */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                  <p className="text-xs font-semibold text-white flex items-center gap-2"><Wand2 className="w-3.5 h-3.5 text-primary" />Edit Page {selectedPageIdx + 1}</p>

                  {selectedPage.type === "cover" && (
                    <>
                      <EditField label="Title" value={selectedPage.title || ""} onChange={v => updatePageField(selectedPageIdx, "title", v)} onImprove={() => handleImprove(selectedPageIdx, "title", selectedPage.title || "", "lead magnet cover title")} improvingKey={`${selectedPageIdx}-title`} activeImproving={activeImproving} />
                      <EditField label="Subtitle" value={selectedPage.subtitle || ""} onChange={v => updatePageField(selectedPageIdx, "subtitle", v)} onImprove={() => handleImprove(selectedPageIdx, "subtitle", selectedPage.subtitle || "", "cover page subtitle")} improvingKey={`${selectedPageIdx}-subtitle`} activeImproving={activeImproving} />
                      <EditField label="Hook Line" value={selectedPage.hook || ""} onChange={v => updatePageField(selectedPageIdx, "hook", v)} onImprove={() => handleImprove(selectedPageIdx, "hook", selectedPage.hook || "", "compelling one-line hook")} improvingKey={`${selectedPageIdx}-hook`} activeImproving={activeImproving} />
                    </>
                  )}
                  {(selectedPage.type === "problem" || selectedPage.type === "content") && (
                    <>
                      <EditField label="Heading" value={selectedPage.heading || ""} onChange={v => updatePageField(selectedPageIdx, "heading", v)} onImprove={() => handleImprove(selectedPageIdx, "heading", selectedPage.heading || "", "section heading")} improvingKey={`${selectedPageIdx}-heading`} activeImproving={activeImproving} />
                      <EditField label="Body" value={selectedPage.body || ""} multiline onChange={v => updatePageField(selectedPageIdx, "body", v)} onImprove={() => handleImprove(selectedPageIdx, "body", selectedPage.body || "", "section body text")} improvingKey={`${selectedPageIdx}-body`} activeImproving={activeImproving} />
                      {selectedPage.type === "problem" && (
                        <EditField label="Emphasis / Key Insight" value={selectedPage.emphasis || ""} onChange={v => updatePageField(selectedPageIdx, "emphasis", v)} onImprove={() => handleImprove(selectedPageIdx, "emphasis", selectedPage.emphasis || "", "key insight or stat")} improvingKey={`${selectedPageIdx}-emphasis`} activeImproving={activeImproving} />
                      )}
                      {selectedPage.type === "content" && selectedPage.bullets && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Bullet Points</label>
                          {selectedPage.bullets.map((b, bi) => (
                            <div key={bi} className="flex gap-2">
                              <Input value={b} onChange={e => { const newBullets = [...(selectedPage.bullets || [])]; newBullets[bi] = e.target.value; updatePageField(selectedPageIdx, "bullets", newBullets); }} className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs h-8 flex-1" />
                              <button onClick={() => handleImprove(selectedPageIdx, `bullet-${bi}`, b, "bullet point")}
                                disabled={activeImproving === `${selectedPageIdx}-bullet-${bi}`}
                                className="text-[9px] px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 whitespace-nowrap">
                                ✨
                              </button>
                            </div>
                          ))}
                          <button onClick={() => updatePageField(selectedPageIdx, "bullets", [...(selectedPage.bullets || []), "New point"])}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                            <Plus className="w-3 h-3" />Add bullet
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {selectedPage.type === "checklist" && (
                    <>
                      <EditField label="Heading" value={selectedPage.heading || ""} onChange={v => updatePageField(selectedPageIdx, "heading", v)} onImprove={() => handleImprove(selectedPageIdx, "heading", selectedPage.heading || "", "checklist heading")} improvingKey={`${selectedPageIdx}-heading`} activeImproving={activeImproving} />
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Checklist Items</label>
                        {(selectedPage.items || []).map((item, ii) => (
                          <div key={ii} className="flex gap-2">
                            <Input value={item} onChange={e => { const newItems = [...(selectedPage.items || [])]; newItems[ii] = e.target.value; updatePageField(selectedPageIdx, "items", newItems); }} className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs h-8 flex-1" />
                            <button onClick={() => handleImprove(selectedPageIdx, `item-${ii}`, item, "checklist item")} disabled={activeImproving === `${selectedPageIdx}-item-${ii}`}
                              className="text-[9px] px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">✨</button>
                            <button onClick={() => { const newItems = (selectedPage.items || []).filter((_, i) => i !== ii); updatePageField(selectedPageIdx, "items", newItems); }}
                              className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <button onClick={() => updatePageField(selectedPageIdx, "items", [...(selectedPage.items || []), "New item"])}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                          <Plus className="w-3 h-3" />Add item
                        </button>
                      </div>
                    </>
                  )}
                  {selectedPage.type === "tips" && (
                    <>
                      <EditField label="Heading" value={selectedPage.heading || ""} onChange={v => updatePageField(selectedPageIdx, "heading", v)} onImprove={() => handleImprove(selectedPageIdx, "heading", selectedPage.heading || "", "tips page heading")} improvingKey={`${selectedPageIdx}-heading`} activeImproving={activeImproving} />
                      {(selectedPage.tips || []).map((tip, ti) => (
                        <div key={ti} className="rounded-lg border border-zinc-800 p-3 space-y-2">
                          <p className="text-[10px] font-semibold text-zinc-500">Tip {tip.number}</p>
                          <Input value={tip.title} onChange={e => { const nt = [...(selectedPage.tips || [])]; nt[ti] = { ...nt[ti], title: e.target.value }; updatePageField(selectedPageIdx, "tips", nt); }} className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs h-7" placeholder="Tip title" />
                          <Textarea value={tip.body} onChange={e => { const nt = [...(selectedPage.tips || [])]; nt[ti] = { ...nt[ti], body: e.target.value }; updatePageField(selectedPageIdx, "tips", nt); }} className="bg-zinc-950 border-zinc-700 text-zinc-200 text-xs min-h-[60px] resize-none" placeholder="Tip body" />
                        </div>
                      ))}
                    </>
                  )}
                  {selectedPage.type === "cta" && (
                    <>
                      <EditField label="Headline" value={selectedPage.headline || ""} onChange={v => updatePageField(selectedPageIdx, "headline", v)} onImprove={() => handleImprove(selectedPageIdx, "headline", selectedPage.headline || "", "CTA page headline")} improvingKey={`${selectedPageIdx}-headline`} activeImproving={activeImproving} />
                      <EditField label="Body" value={selectedPage.body || ""} multiline onChange={v => updatePageField(selectedPageIdx, "body", v)} onImprove={() => handleImprove(selectedPageIdx, "body", selectedPage.body || "", "CTA body text")} improvingKey={`${selectedPageIdx}-body`} activeImproving={activeImproving} />
                      <EditField label="CTA Text" value={selectedPage.cta || ""} onChange={v => updatePageField(selectedPageIdx, "cta", v)} onImprove={() => handleImprove(selectedPageIdx, "cta", selectedPage.cta || "", "call to action button text")} improvingKey={`${selectedPageIdx}-cta`} activeImproving={activeImproving} />
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right — Design + AI Chat */}
          <div className="w-72 border-l border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0">
            {/* Design controls */}
            <div className="p-3 border-b border-zinc-800 space-y-3">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Design</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(THEMES).map(([key, th]) => (
                  <button key={key} onClick={() => setF("theme", key)}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${form.theme === key ? "border-primary bg-primary/10 text-primary" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                    {th.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button key={c.value} onClick={() => setF("themeColor", c.value)}
                    className="w-6 h-6 rounded transition-all"
                    style={{ background: c.value, outline: form.themeColor === c.value ? `2px solid ${c.value}` : "none", outlineOffset: 2 }} />
                ))}
                <label className="w-6 h-6 rounded border border-zinc-700 flex items-center justify-center cursor-pointer relative overflow-hidden">
                  <span className="text-[9px] text-zinc-500">+</span>
                  <input type="color" value={form.themeColor} onChange={e => setF("themeColor", e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
            </div>

            {/* AI Chat */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">AI Assistant</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMsgs.length === 0 && (
                  <div className="text-center py-6 space-y-2">
                    <Sparkles className="w-6 h-6 text-zinc-700 mx-auto" />
                    <p className="text-[10px] text-zinc-600">Ask me anything about your lead magnet</p>
                    <div className="space-y-1">
                      {["Make slide 2 more persuasive", "Add urgency to the CTA", "Improve overall structure"].map(s => (
                        <button key={s} onClick={() => { setChatInput(s); }}
                          className="block w-full text-left text-[10px] px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors">
                          "{s}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMsgs.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-[10px] leading-relaxed ${msg.role === "user" ? "bg-primary/20 text-primary border border-primary/20" : "bg-zinc-900 text-zinc-300 border border-zinc-800"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                      <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
              <div className="p-3 border-t border-zinc-800 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                  placeholder="Ask AI…"
                  className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 placeholder:text-zinc-600"
                  data-testid="chat-input"
                />
                <Button size="sm" onClick={handleSendChat} disabled={chatMutation.isPending || !chatInput.trim()}
                  className="bg-primary hover:bg-primary/90 text-black h-8 w-8 p-0 flex-shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden full-res pages for PDF */}
      <div style={{ position: "fixed", top: -9999, left: -9999, zIndex: -1 }}>
        {pages.map((page, idx) => (
          <div key={page.id} ref={el => { pageRefs.current[idx] = el; }} style={{ width: 595, height: 842, overflow: "hidden" }}>
            <PageRenderer page={page} color={form.themeColor} theme={form.theme} />
          </div>
        ))}
      </div>
    </ClientLayout>
  );
}
