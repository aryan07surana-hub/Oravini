import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Palette, Sparkles, ChevronRight, Copy, CheckSquare, Download,
  Target, Brush, Layout, FileText, Shield, Star, Zap, ArrowLeft,
  Eye, Type, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ColorSwatch { name: string; hex: string; why?: string }
interface BrandKit {
  brandCore: {
    positioning: { standFor: string; uniqueAngle: string };
    personality: { traits: string[]; contentExpression: string };
    toneOfVoice: { style: string; example: string };
  };
  visualIdentity: {
    colorPalette: { primary: ColorSwatch; secondary: ColorSwatch; accent: ColorSwatch; background: ColorSwatch; emotionalImpact: string };
    typography: { heading: { style: string; usage: string }; body: { style: string; usage: string }; accent: { style: string; usage: string } };
    designStyle: { aesthetic: string; layout: string; visualElements: string };
  };
  socialMedia: {
    postStyle: { look: string; textPlacement: string; colorsSpacing: string };
    carouselStyle: { structure: string; fontHierarchy: string; visualFlow: string };
    storyStyle: { textDensity: string; interaction: string; tone: string };
  };
  contentStrategy: {
    pillars: { title: string; description: string }[];
    hooks: string[];
    ctas: { style: string; examples: string[] };
  };
  leadMagnet: { types: string[]; designStyle: string; tone: string };
  brandRules: { dos: string[]; donts: string[] };
  summary: string[];
}

const PLATFORM_OPTIONS = ["Instagram", "YouTube", "LinkedIn", "TikTok", "Twitter/X", "Pinterest", "Multi-platform"];
const STYLE_OPTIONS = ["Minimal & Clean", "Bold & Loud", "Luxury & Premium", "Warm & Aesthetic", "Corporate & Authoritative", "Playful & Fun", "Dark & Edgy"];
const GOAL_OPTIONS = ["Grow Audience", "Sell Product", "Build Authority", "Generate Leads", "Build Community", "Get Brand Deals"];

function Swatch({ color }: { color: ColorSwatch }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => { navigator.clipboard.writeText(color.hex); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="w-12 h-12 rounded-xl border-2 border-zinc-700 hover:border-zinc-500 transition-all shadow-lg cursor-pointer group relative flex-shrink-0"
        style={{ background: color.hex }}
        title={`Copy ${color.hex}`}
      >
        {copied && <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center"><CheckSquare className="w-4 h-4 text-white" /></div>}
      </button>
      <div className="text-center">
        <p className="text-[10px] font-bold text-zinc-300">{color.name}</p>
        <p className="text-[9px] font-mono text-zinc-500">{color.hex}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color = "primary", children }: { icon: any; title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Pill({ text, variant = "default" }: { text: string; variant?: "default" | "do" | "dont" | "trait" }) {
  const cls = {
    default: "bg-zinc-800 text-zinc-300 border-zinc-700",
    do: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dont: "bg-red-500/10 text-red-400 border-red-500/20",
    trait: "bg-primary/10 text-primary border-primary/20",
  }[variant];
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cls}`}>{text}</span>;
}

export default function BrandKitBuilder({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    businessDescription: "",
    targetAudience: "",
    platform: "Instagram",
    style: "Minimal & Clean",
    goal: "Grow Audience",
  });
  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const generateMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/ai/brand-kit/generate", body),
    onSuccess: (data: BrandKit) => {
      setKit(data);
      setApiDone(true);
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
      setApiDone(false);
    },
  });

  const handleGenerate = () => {
    if (!form.businessDescription.trim()) {
      toast({ title: "Describe your brand first", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setApiDone(false);
    setKit(null);
    generateMutation.mutate(form);
  };

  const handleReady = () => {
    setGenerating(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const copyAll = () => {
    if (!kit) return;
    const text = [
      `BRAND KIT`,
      `\nSUMMARY`,
      ...kit.summary.map(s => `• ${s}`),
      `\nBRAND CORE`,
      `Stands for: ${kit.brandCore.positioning.standFor}`,
      `Unique angle: ${kit.brandCore.positioning.uniqueAngle}`,
      `Traits: ${kit.brandCore.personality.traits.join(", ")}`,
      `Tone: ${kit.brandCore.toneOfVoice.style}`,
      `Example: "${kit.brandCore.toneOfVoice.example}"`,
      `\nCOLOR PALETTE`,
      `Primary: ${kit.visualIdentity.colorPalette.primary.name} ${kit.visualIdentity.colorPalette.primary.hex}`,
      `Secondary: ${kit.visualIdentity.colorPalette.secondary.name} ${kit.visualIdentity.colorPalette.secondary.hex}`,
      `Accent: ${kit.visualIdentity.colorPalette.accent.name} ${kit.visualIdentity.colorPalette.accent.hex}`,
      `Background: ${kit.visualIdentity.colorPalette.background.name} ${kit.visualIdentity.colorPalette.background.hex}`,
      `\nCONTENT PILLARS`,
      ...kit.contentStrategy.pillars.map(p => `• ${p.title}: ${p.description}`),
      `\nHOOKS`,
      ...kit.contentStrategy.hooks.map(h => `• ${h}`),
      `\nCTAs`,
      ...kit.contentStrategy.ctas.examples.map(c => `• ${c}`),
      `\nBRAND DO'S`,
      ...kit.brandRules.dos.map(d => `✓ ${d}`),
      `\nBRAND DON'TS`,
      ...kit.brandRules.donts.map(d => `✗ ${d}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 1800);
    toast({ title: "Brand kit copied to clipboard!" });
  };

  const Wrapper = embedded ? ({ children }: any) => <div className="min-h-screen bg-background">{children}</div>
    : ({ children }: any) => <ClientLayout><div className="min-h-screen bg-background">{children}</div></ClientLayout>;

  return (
    <Wrapper>
      {generating && (
        <GeneratingScreen
          label="your brand kit"
          minMs={47000}
          isComplete={apiDone}
          onReady={handleReady}
        />
      )}

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Palette className="w-3 h-3" />Brand Kit Builder
          </div>
          <h1 className="text-3xl font-black text-white">Build Your Brand Identity</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Answer a few questions and get a complete brand system — colours, typography, content strategy, hooks and rules — all in one place.
          </p>
        </div>

        {/* Config Form */}
        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Describe your brand / business <span className="text-red-400">*</span></label>
            <Textarea
              value={form.businessDescription}
              onChange={e => setF("businessDescription", e.target.value)}
              placeholder="e.g. I'm a fitness coach for busy moms who want to lose weight without giving up their lifestyle. I post on Instagram and sell a 12-week program."
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 text-sm min-h-[90px] resize-none"
              data-testid="input-brand-desc"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Target audience</label>
            <Input
              value={form.targetAudience}
              onChange={e => setF("targetAudience", e.target.value)}
              placeholder="e.g. Women 28–45, busy schedule, want results fast, follow fitness accounts"
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 text-sm"
              data-testid="input-target-audience"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">Platform focus</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORM_OPTIONS.map(p => (
                  <button key={p} onClick={() => setF("platform", p)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${form.platform === p ? "border-primary bg-primary/10 text-primary font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">Style vibe</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map(s => (
                  <button key={s} onClick={() => setF("style", s)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${form.style === s ? "border-primary bg-primary/10 text-primary font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">Primary goal</label>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_OPTIONS.map(g => (
                  <button key={g} onClick={() => setF("goal", g)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${form.goal === g ? "border-primary bg-primary/10 text-primary font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating}
            className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-black text-sm" data-testid="btn-generate-kit">
            <Sparkles className="w-4 h-4 mr-2" />Generate My Brand Kit
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Result */}
        {kit && !generating && (
          <div ref={resultRef} className="space-y-5">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Your Brand Kit</h2>
              <Button size="sm" onClick={copyAll}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs h-8">
                {copied === "all" ? <><CheckSquare className="w-3 h-3 mr-1 text-emerald-400" />Copied!</> : <><Copy className="w-3 h-3 mr-1" />Copy All</>}
              </Button>
            </div>

            {/* 7. Quick Summary */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-primary">Quick Brand Summary</h3>
              </div>
              <ul className="space-y-2">
                {kit.summary.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="text-primary font-bold flex-shrink-0">•</span>{s}
                  </li>
                ))}
              </ul>
            </div>

            {/* 1. Brand Core */}
            <Section icon={Target} title="Brand Core">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">What It Stands For</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{kit.brandCore.positioning.standFor}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Unique Angle</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{kit.brandCore.positioning.uniqueAngle}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Brand Personality</p>
                  <div className="flex flex-wrap gap-2">
                    {kit.brandCore.personality.traits.map(t => <Pill key={t} text={t} variant="trait" />)}
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{kit.brandCore.personality.contentExpression}</p>
                </div>
                <div className="space-y-2 bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Tone of Voice</p>
                  <p className="text-xs text-zinc-400">{kit.brandCore.toneOfVoice.style}</p>
                  <p className="text-sm text-white italic border-l-2 border-primary pl-3">"{kit.brandCore.toneOfVoice.example}"</p>
                </div>
              </div>
            </Section>

            {/* 2. Visual Identity */}
            <Section icon={Brush} title="Visual Identity System">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Color Palette</p>
                  <div className="flex gap-6">
                    <Swatch color={kit.visualIdentity.colorPalette.primary} />
                    <Swatch color={kit.visualIdentity.colorPalette.secondary} />
                    <Swatch color={kit.visualIdentity.colorPalette.accent} />
                    <Swatch color={kit.visualIdentity.colorPalette.background} />
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 leading-relaxed">{kit.visualIdentity.colorPalette.emotionalImpact}</p>
                </div>
                <div className="border-t border-zinc-800 pt-4 grid grid-cols-3 gap-4">
                  {[
                    { label: "Heading Font", data: kit.visualIdentity.typography.heading },
                    { label: "Body Font", data: kit.visualIdentity.typography.body },
                    { label: "Accent Font", data: kit.visualIdentity.typography.accent },
                  ].map(({ label, data }) => (
                    <div key={label} className="space-y-1">
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-bold text-white">{data.style}</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{data.usage}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Design Style Direction</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Aesthetic", value: kit.visualIdentity.designStyle.aesthetic },
                      { label: "Layout", value: kit.visualIdentity.designStyle.layout },
                      { label: "Visual Elements", value: kit.visualIdentity.designStyle.visualElements },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* 3. Social Media */}
            <Section icon={Layout} title="Social Media Design System">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Post Style", icon: "📸", data: kit.socialMedia.postStyle, fields: [["Look", "look"], ["Text Placement", "textPlacement"], ["Colors & Spacing", "colorsSpacing"]] },
                  { label: "Carousel Style", icon: "🔄", data: kit.socialMedia.carouselStyle, fields: [["Structure", "structure"], ["Font Hierarchy", "fontHierarchy"], ["Visual Flow", "visualFlow"]] },
                  { label: "Story Style", icon: "⭕", data: kit.socialMedia.storyStyle, fields: [["Text Density", "textDensity"], ["Interaction", "interaction"], ["Tone", "tone"]] },
                ].map(({ label, icon, data, fields }) => (
                  <div key={label} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3">
                    <p className="text-xs font-bold text-white">{icon} {label}</p>
                    {fields.map(([name, key]) => (
                      <div key={key}>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wide mb-0.5">{name}</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{(data as any)[key]}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Section>

            {/* 4. Content Strategy */}
            <Section icon={Star} title="Content Strategy">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Content Pillars</p>
                  <div className="grid grid-cols-2 gap-3">
                    {kit.contentStrategy.pillars.map((p, i) => (
                      <div key={i} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-[10px] font-black text-primary">{i + 1}</span>
                          </div>
                          <p className="text-xs font-bold text-white">{p.title}</p>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Hook Formulas</p>
                  <div className="space-y-2">
                    {kit.contentStrategy.hooks.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 bg-zinc-950 rounded-lg px-4 py-2.5 border border-zinc-800">
                        <span className="text-primary font-black text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-xs text-zinc-300 italic leading-relaxed">"{h}"</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">CTA Style</p>
                  <p className="text-xs text-zinc-500 mb-3">{kit.contentStrategy.ctas.style}</p>
                  <div className="flex flex-wrap gap-2">
                    {kit.contentStrategy.ctas.examples.map((c, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* 5. Lead Magnet Style */}
            <Section icon={FileText} title="Lead Magnet Style">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Recommended Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {kit.leadMagnet.types.map(t => <Pill key={t} text={t} />)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Design Style</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{kit.leadMagnet.designStyle}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Writing Tone</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{kit.leadMagnet.tone}</p>
                </div>
              </div>
            </Section>

            {/* 6. Brand Rules */}
            <Section icon={Shield} title="Brand Application Rules">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Do's ✓</p>
                  <ul className="space-y-2">
                    {kit.brandRules.dos.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Don'ts ✗</p>
                  <ul className="space-y-2">
                    {kit.brandRules.donts.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        </div>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>

            <Button onClick={handleGenerate} variant="outline"
              className="w-full border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />Regenerate Brand Kit
            </Button>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
