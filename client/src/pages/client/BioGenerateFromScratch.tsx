import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  User, Sparkles, Copy, Check, RefreshCw, Zap, Camera,
  Instagram, Linkedin, Twitter, ChevronLeft, Target, Users,
  TrendingUp, Link as LinkIcon, Wand2, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BioForm {
  niche: string;
  platform: "instagram" | "twitter" | "linkedin";
  whatYouDo: string;
  whoYouHelp: string;
  socialProof: string;
  cta: string;
  linkUrl: string;
}

interface BioResult {
  line1Options: string[]; // Attract/Repel line
  line2Options: string[]; // Social proof line
  line3Options: string[]; // CTA line
  line4: string; // Link (user provided)
  fullBioVariations: string[];
  profilePictureTips: {
    dos: string[];
    donts: string[];
    specificTips: string[];
  };
  characterCount: number;
  platformOptimized: boolean;
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, limit: 150, color: "#E1306C" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, limit: 160, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, limit: 220, color: "#0A66C2" },
] as const;

const NICHE_SUGGESTIONS = [
  "Fitness & Health", "Business Coaching", "Finance & Investing", "Marketing & Growth",
  "Personal Development", "Real Estate", "E-Commerce", "Content Creation",
  "AI & Technology", "Nutrition", "Mindset & Performance", "Social Media",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BioGenerateFromScratch() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"config" | "results">("config");
  const [generating, setGenerating] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<BioResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState(0);

  // Selected options for each line
  const [selectedLine1, setSelectedLine1] = useState(0);
  const [selectedLine2, setSelectedLine2] = useState(0);
  const [selectedLine3, setSelectedLine3] = useState(0);

  // Pull niche from onboarding survey
  const { data: meData } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const surveyNiche: string = (meData as any)?.fields?.[0] || "";

  const [form, setForm] = useState<BioForm>({
    niche: surveyNiche || "",
    platform: "instagram",
    whatYouDo: "",
    whoYouHelp: "",
    socialProof: "",
    cta: "",
    linkUrl: "",
  });

  const setF = (k: keyof BioForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedPlatform = PLATFORMS.find(p => p.id === form.platform) || PLATFORMS[0];

  // ── Generate Bio ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!form.niche.trim() || !form.whatYouDo.trim()) {
      toast({ title: "Fill required fields", description: "At minimum: niche and what you do.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setApiDone(false);

    try {
      const data: BioResult = await apiRequest("POST", "/api/tools/bio-generator/generate", form);
      setResult(data);
      setApiDone(true);
      setSelectedLine1(0);
      setSelectedLine2(0);
      setSelectedLine3(0);
      setSelectedVariation(0);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
      setApiDone(false);
    }
  };

  const handleDone = () => {
    setGenerating(false);
    setStep("results");
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  // ── Build custom bio from selected lines ─────────────────────────────────
  const buildCustomBio = () => {
    if (!result) return "";
    const line1 = result.line1Options[selectedLine1] || "";
    const line2 = result.line2Options[selectedLine2] || "";
    const line3 = result.line3Options[selectedLine3] || "";
    const line4 = result.line4 || form.linkUrl;
    return `${line1}\n${line2}\n${line3}\n${line4}`.trim();
  };

  // ── Generating Screen ─────────────────────────────────────────────────────
  if (generating) {
    return (
      <GeneratingScreen
        label="your optimized bio"
        minMs={12000}
        isComplete={apiDone}
        onReady={handleDone}
        steps={[
          "Analyzing your niche positioning",
          "Crafting attract/repel hook",
          "Building social proof line",
          "Optimizing CTA",
          "Generating profile picture tips",
        ]}
      />
    );
  }

  // ── Config Step ───────────────────────────────────────────────────────────
  if (step === "config") {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={() => navigate("/tools/bio-generator")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />Back
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
              <Wand2 className="w-4 h-4" style={{ color: "#d4b461" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Generate from Scratch</h1>
              <p className="text-xs text-muted-foreground">AI writes your bio using the 4-line framework</p>
            </div>
          </div>

          {/* Platform selector */}
          <div className="mb-6">
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map(platform => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => setF("platform", platform.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                      form.platform === platform.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" style={{ color: form.platform === platform.id ? platform.color : "#71717a" }} />
                    <span className={`text-sm font-semibold ${form.platform === platform.id ? "text-white" : "text-zinc-500"}`}>
                      {platform.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">Character limit: {selectedPlatform.limit}</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Niche */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium flex items-center gap-2">
                <Target className="w-3 h-3" />
                Your Niche <span style={{ color: "#d4b461" }}>*</span>
                {surveyNiche && <Badge className="bg-primary/10 text-primary border-0 text-[9px]">From onboarding</Badge>}
              </label>
              <Input
                value={form.niche}
                onChange={e => setF("niche", e.target.value)}
                placeholder="e.g. Fitness for busy professionals, AI automation for agencies..."
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
              />
              {!form.niche && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {NICHE_SUGGESTIONS.slice(0, 6).map(n => (
                    <button
                      key={n}
                      onClick={() => setF("niche", n)}
                      className="text-[10px] px-2.5 py-1 rounded-full border border-zinc-800 text-zinc-500 hover:border-primary/40 hover:text-primary transition-all"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Line 1: What you do + who you help */}
            <div className="rounded-xl p-4" style={{ background: "rgba(212,180,97,0.04)", border: "1px solid rgba(212,180,97,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,180,97,0.2)", color: "#d4b461" }}>1</span>
                <p className="text-xs font-bold text-primary">Attract/Repel Line</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">What you actually do <span className="text-red-400">*</span></label>
                  <Textarea
                    value={form.whatYouDo}
                    onChange={e => setF("whatYouDo", e.target.value)}
                    placeholder="e.g. I help busy professionals lose 20lbs in 90 days without giving up their favorite foods"
                    className="bg-zinc-950 border-zinc-700 text-white text-xs min-h-[60px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Who you help (optional)</label>
                  <Input
                    value={form.whoYouHelp}
                    onChange={e => setF("whoYouHelp", e.target.value)}
                    placeholder="e.g. Entrepreneurs, Coaches, Creators..."
                    className="bg-zinc-950 border-zinc-700 text-white text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Line 2: Social proof */}
            <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>2</span>
                <p className="text-xs font-bold text-green-400">Social Proof</p>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">How many people you've helped / results</label>
                <Textarea
                  value={form.socialProof}
                  onChange={e => setF("socialProof", e.target.value)}
                  placeholder="e.g. Helped 6,000+ men build muscle and confidence | 500+ transformations in 2024"
                  className="bg-zinc-950 border-zinc-700 text-white text-xs min-h-[50px] resize-none"
                />
              </div>
            </div>

            {/* Line 3: CTA */}
            <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(99,102,241,0.2)", color: "#6366f1" }}>3</span>
                <p className="text-xs font-bold text-indigo-400">Call to Action</p>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">What action do you want them to take?</label>
                <Input
                  value={form.cta}
                  onChange={e => setF("cta", e.target.value)}
                  placeholder="e.g. Get my free training below, DM me 'START', Book a free call..."
                  className="bg-zinc-950 border-zinc-700 text-white text-xs h-8"
                />
              </div>
            </div>

            {/* Line 4: Link */}
            <div className="rounded-xl p-4" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}>4</span>
                <p className="text-xs font-bold text-purple-400">Link</p>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">YouTube video, lead magnet, or link-in-bio</label>
                <Input
                  value={form.linkUrl}
                  onChange={e => setF("linkUrl", e.target.value)}
                  placeholder="e.g. youtube.com/watch?v=... or linktr.ee/yourname"
                  className="bg-zinc-950 border-zinc-700 text-white text-xs h-8"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!form.niche.trim() || !form.whatYouDo.trim()}
            className="w-full h-12 font-bold text-base gap-3 text-black mt-6"
            style={{ background: "#d4b461" }}
          >
            <Wand2 className="w-5 h-5" />
            Generate My Bio
          </Button>
          <p className="text-center text-xs text-zinc-500 mt-2">
            AI generates 3 variations for each line — mix and match to create your perfect bio
          </p>
        </div>
      </ClientLayout>
    );
  }

  // ── Results Step ──────────────────────────────────────────────────────────
  if (!result) return null;

  const customBio = buildCustomBio();
  const charCount = customBio.length;
  const isOverLimit = charCount > selectedPlatform.limit;

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setStep("config")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />Edit Inputs
          </button>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${isOverLimit ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
              {charCount} / {selectedPlatform.limit}
            </Badge>
            <Button
              size="sm"
              onClick={handleGenerate}
              className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className="w-3 h-3" />Regenerate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Line options */}
          <div className="lg:col-span-2 space-y-5">
            {/* Line 1 options */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,180,97,0.2)", color: "#d4b461" }}>1</span>
                <p className="text-sm font-bold text-white">Attract/Repel Line</p>
              </div>
              <div className="space-y-2">
                {result.line1Options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedLine1(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                      selectedLine1 === i
                        ? "border-primary/60 bg-primary/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <p className="text-sm text-white leading-relaxed">{option}</p>
                    {selectedLine1 === i && <Check className="w-4 h-4 text-primary absolute top-3 right-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Line 2 options */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>2</span>
                <p className="text-sm font-bold text-white">Social Proof</p>
              </div>
              <div className="space-y-2">
                {result.line2Options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedLine2(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                      selectedLine2 === i
                        ? "border-green-500/60 bg-green-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <p className="text-sm text-white leading-relaxed">{option}</p>
                    {selectedLine2 === i && <Check className="w-4 h-4 text-green-400 absolute top-3 right-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Line 3 options */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(99,102,241,0.2)", color: "#6366f1" }}>3</span>
                <p className="text-sm font-bold text-white">Call to Action</p>
              </div>
              <div className="space-y-2">
                {result.line3Options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedLine3(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                      selectedLine3 === i
                        ? "border-indigo-500/60 bg-indigo-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <p className="text-sm text-white leading-relaxed">{option}</p>
                    {selectedLine3 === i && <Check className="w-4 h-4 text-indigo-400 absolute top-3 right-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Line 4 (link) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}>4</span>
                <p className="text-sm font-bold text-white">Link</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <p className="text-sm text-zinc-400">{result.line4 || form.linkUrl || "No link provided"}</p>
              </div>
            </div>
          </div>

          {/* Right: Preview + Profile tips */}
          <div className="space-y-5">
            {/* Bio preview */}
            <div className="rounded-2xl p-5 sticky top-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Your Bio</p>
                <button
                  onClick={() => copyText(customBio, "custom-bio")}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-primary transition-colors"
                >
                  {copied === "custom-bio" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === "custom-bio" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="bg-zinc-950 rounded-xl p-4 mb-3">
                <p className="text-sm text-white leading-relaxed whitespace-pre-line">{customBio}</p>
              </div>
              {isOverLimit && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">Over {selectedPlatform.label} limit by {charCount - selectedPlatform.limit} characters</p>
                </div>
              )}
            </div>

            {/* Profile picture tips */}
            {result.profilePictureTips && (
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Profile Picture Tips</p>
                </div>
                <div className="space-y-4">
                  {result.profilePictureTips.dos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-wide mb-2">✓ Do This</p>
                      <ul className="space-y-1.5">
                        {result.profilePictureTips.dos.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                            <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.profilePictureTips.donts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">✕ Avoid This</p>
                      <ul className="space-y-1.5">
                        {result.profilePictureTips.donts.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.profilePictureTips.specificTips.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">For {form.niche}</p>
                      <ul className="space-y-1.5">
                        {result.profilePictureTips.specificTips.map((tip, i) => (
                          <li key={i} className="text-xs text-zinc-300 leading-relaxed">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
