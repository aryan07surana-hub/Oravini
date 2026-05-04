import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Users, Copy, Check, Plus, X, TrendingUp,
  Instagram, Linkedin, Twitter, Target, Zap, AlertCircle
} from "lucide-react";

interface AnalysisResult {
  patterns: {
    commonStructure: string;
    toneAnalysis: string;
    keywordFrequency: string[];
    ctaPatterns: string[];
    lengthAverage: number;
  };
  insights: string[];
  generatedBios: string[];
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, limit: 150, color: "#E1306C" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, limit: 160, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, limit: 220, color: "#0A66C2" },
] as const;

export default function BioCompetitor() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"input" | "results">("input");
  const [analyzing, setAnalyzing] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [competitorBios, setCompetitorBios] = useState<string[]>(["", "", ""]);
  const [platform, setPlatform] = useState<"instagram" | "twitter" | "linkedin">("instagram");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(0);

  const { data: meData } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const userNiche: string = (meData as any)?.fields?.[0] || "";

  const selectedPlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];

  const addBioField = () => {
    if (competitorBios.length < 5) {
      setCompetitorBios([...competitorBios, ""]);
    }
  };

  const removeBioField = (index: number) => {
    if (competitorBios.length > 2) {
      setCompetitorBios(competitorBios.filter((_, i) => i !== index));
    }
  };

  const updateBio = (index: number, value: string) => {
    const updated = [...competitorBios];
    updated[index] = value;
    setCompetitorBios(updated);
  };

  const handleAnalyze = async () => {
    const filledBios = competitorBios.filter(bio => bio.trim());
    if (filledBios.length < 2) {
      toast({ title: "Add more bios", description: "Paste at least 2 competitor bios to analyze", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setApiDone(false);

    try {
      const data: AnalysisResult = await apiRequest("POST", "/api/tools/bio-generator/analyze-competitors", {
        competitorBios: filledBios,
        platform,
        userNiche,
      });
      setResult(data);
      setApiDone(true);
      setSelectedVersion(0);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setAnalyzing(false);
      setApiDone(false);
    }
  };

  const handleDone = () => {
    setAnalyzing(false);
    setStep("results");
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  if (analyzing) {
    return (
      <GeneratingScreen
        label="competitor analysis"
        minMs={12000}
        isComplete={apiDone}
        onReady={handleDone}
        steps={[
          "Analyzing competitor bios",
          "Extracting patterns & structure",
          "Identifying tone & keywords",
          "Finding CTA strategies",
          "Generating unique bios for you",
        ]}
      />
    );
  }

  if (step === "input") {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-5 py-8">
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={() => navigate("/tools/bio-generator")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />Back
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <Users className="w-4 h-4" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Competitor Analysis</h1>
              <p className="text-xs text-muted-foreground">Analyze successful bios and generate similar ones for your brand</p>
            </div>
          </div>

          {/* Platform selector */}
          <div className="mb-6">
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                      platform === p.id
                        ? "border-purple-500/60 bg-purple-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" style={{ color: platform === p.id ? p.color : "#71717a" }} />
                    <span className={`text-sm font-semibold ${platform === p.id ? "text-white" : "text-zinc-500"}`}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div className="flex items-start gap-3">
              <Target className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-purple-300 mb-1">How it works</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Paste 2-5 bios from successful accounts in your niche. AI will analyze their patterns, tone, structure, and keywords — then generate unique bios for you inspired by what works.
                </p>
              </div>
            </div>
          </div>

          {/* Competitor bio inputs */}
          <div className="space-y-4 mb-6">
            {competitorBios.map((bio, index) => (
              <div key={index} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-white font-medium">Competitor Bio #{index + 1}</label>
                  {competitorBios.length > 2 && (
                    <button
                      onClick={() => removeBioField(index)}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />Remove
                    </button>
                  )}
                </div>
                <Textarea
                  value={bio}
                  onChange={e => updateBio(index, e.target.value)}
                  placeholder="Paste a competitor's bio here..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 min-h-[100px] resize-none"
                />
                {bio.trim() && (
                  <p className="text-xs text-zinc-500 mt-2">{bio.length} characters</p>
                )}
              </div>
            ))}
          </div>

          {competitorBios.length < 5 && (
            <button
              onClick={addBioField}
              className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:border-purple-500/40 hover:text-purple-400 transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-4 h-4" />
              Add Another Bio (Optional)
            </button>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={competitorBios.filter(b => b.trim()).length < 2}
            className="w-full h-12 font-bold text-base gap-3 text-black"
            style={{ background: "#a855f7" }}
          >
            <Users className="w-5 h-5" />
            Analyze & Generate
          </Button>
          <p className="text-center text-xs text-zinc-500 mt-2">
            AI will extract patterns and create unique bios for your brand
          </p>
        </div>
      </ClientLayout>
    );
  }

  if (!result) return null;

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setStep("input")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />Edit Bios
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Analysis insights */}
          <div className="space-y-5">
            {/* Patterns */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Patterns Found</p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Structure</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{result.patterns.commonStructure}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Tone</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{result.patterns.toneAnalysis}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Avg Length</p>
                  <p className="text-xs text-zinc-300">{result.patterns.lengthAverage} characters</p>
                </div>
              </div>
            </div>

            {/* Keywords */}
            {result.patterns.keywordFrequency.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Common Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.patterns.keywordFrequency.map((keyword, i) => (
                    <Badge key={i} className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[10px]">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* CTA patterns */}
            {result.patterns.ctaPatterns.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">CTA Strategies</p>
                <ul className="space-y-2">
                  {result.patterns.ctaPatterns.map((cta, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-purple-400 flex-shrink-0">•</span>
                      {cta}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Generated bios */}
          <div className="lg:col-span-2 space-y-5">
            {/* Insights */}
            {result.insights.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Key Insights</p>
                <ul className="space-y-1.5">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Zap className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Generated bios */}
            <div>
              <p className="text-sm font-bold text-white mb-3">Your Generated Bios</p>
              <p className="text-xs text-zinc-500 mb-4">Inspired by competitor patterns but unique to your brand</p>
              <div className="space-y-3">
                {result.generatedBios.map((bio, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 border border-zinc-800 bg-zinc-900/40"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px]">
                        Version {i + 1}
                      </Badge>
                      <button
                        onClick={() => copyText(bio, `bio-${i}`)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-purple-400 transition-colors"
                      >
                        {copied === `bio-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === `bio-${i}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-white leading-relaxed whitespace-pre-line">{bio}</p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800">
                      <span className="text-xs text-zinc-500">{bio.length} characters</span>
                      {bio.length <= selectedPlatform.limit ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                          Within limit
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                          Over by {bio.length - selectedPlatform.limit}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
