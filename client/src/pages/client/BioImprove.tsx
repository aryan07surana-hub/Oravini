import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, TrendingUp, Copy, Check, RefreshCw, AlertCircle,
  Instagram, Linkedin, Twitter, Target, Users, Zap, Link as LinkIcon
} from "lucide-react";

interface ImproveResult {
  score: number;
  breakdown: {
    clarity: { score: number; feedback: string };
    hook: { score: number; feedback: string };
    cta: { score: number; feedback: string };
    characterEfficiency: { score: number; feedback: string };
    nicheSpecificity: { score: number; feedback: string };
  };
  improvedVersions: string[];
  whatChanged: string[];
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, limit: 150, color: "#E1306C" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, limit: 160, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, limit: 220, color: "#0A66C2" },
] as const;

export default function BioImprove() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"input" | "results">("input");
  const [analyzing, setAnalyzing] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [currentBio, setCurrentBio] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "twitter" | "linkedin">("instagram");
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(0);

  const selectedPlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];

  const handleAnalyze = async () => {
    if (!currentBio.trim()) {
      toast({ title: "Paste your bio", description: "Enter your current bio to analyze", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setApiDone(false);

    try {
      const data: ImproveResult = await apiRequest("POST", "/api/tools/bio-generator/improve", {
        currentBio,
        platform,
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  if (analyzing) {
    return (
      <GeneratingScreen
        label="your bio analysis"
        minMs={10000}
        isComplete={apiDone}
        onReady={handleDone}
        steps={[
          "Analyzing bio structure",
          "Scoring clarity and hook strength",
          "Evaluating CTA effectiveness",
          "Generating improved versions",
          "Optimizing for platform",
        ]}
      />
    );
  }

  if (step === "input") {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto px-5 py-8">
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={() => navigate("/tools/bio-generator")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />Back
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Improve Existing Bio</h1>
              <p className="text-xs text-muted-foreground">Get AI-powered improvements with detailed scoring</p>
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
                        ? "border-green-500/60 bg-green-500/10"
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

          {/* Bio input */}
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-sm text-white mb-3 block font-medium">Your Current Bio</label>
            <Textarea
              value={currentBio}
              onChange={e => setCurrentBio(e.target.value)}
              placeholder="Paste your current Instagram/Twitter/LinkedIn bio here..."
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 min-h-[180px] resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-zinc-500">{currentBio.length} characters</p>
              {currentBio.length > selectedPlatform.limit && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                  Over limit by {currentBio.length - selectedPlatform.limit}
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!currentBio.trim()}
            className="w-full h-12 font-bold text-base gap-3 text-black mt-6"
            style={{ background: "#22c55e" }}
          >
            <TrendingUp className="w-5 h-5" />
            Analyze & Improve
          </Button>
          <p className="text-center text-xs text-zinc-500 mt-2">
            Get a detailed score breakdown and 3 improved versions
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
            <ChevronLeft className="w-4 h-4" />Edit Bio
          </button>
          <Button
            size="sm"
            onClick={handleAnalyze}
            className="h-8 text-xs gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            <RefreshCw className="w-3 h-3" />Re-analyze
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Score breakdown */}
          <div className="space-y-5">
            {/* Overall score */}
            <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Overall Score</p>
              <div className="relative w-32 h-32 mx-auto mb-3">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={getScoreColor(result.score)}
                    strokeWidth="8"
                    strokeDasharray={`${(result.score / 100) * 351.86} 351.86`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black" style={{ color: getScoreColor(result.score) }}>
                    {result.score}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                {result.score >= 80 ? "Excellent bio!" : result.score >= 60 ? "Good, but can improve" : "Needs work"}
              </p>
            </div>

            {/* Score breakdown */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Score Breakdown</p>
              <div className="space-y-4">
                {Object.entries(result.breakdown).map(([key, data]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-zinc-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <span className="text-xs font-bold" style={{ color: getScoreColor(data.score) }}>
                        {data.score}/20
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(data.score / 20) * 100}%`, background: getScoreColor(data.score) }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{data.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Improved versions */}
          <div className="lg:col-span-2 space-y-5">
            {/* What changed */}
            {result.whatChanged.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Key Improvements</p>
                <ul className="space-y-1.5">
                  {result.whatChanged.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-green-400 flex-shrink-0">✓</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improved versions */}
            <div>
              <p className="text-sm font-bold text-white mb-3">Improved Versions</p>
              <div className="space-y-3">
                {result.improvedVersions.map((version, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-5 border transition-all cursor-pointer ${
                      selectedVersion === i
                        ? "border-green-500/60 bg-green-500/10"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                    onClick={() => setSelectedVersion(i)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px]">
                        Version {i + 1}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(version, `version-${i}`);
                        }}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-green-400 transition-colors"
                      >
                        {copied === `version-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === `version-${i}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-white leading-relaxed whitespace-pre-line">{version}</p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800">
                      <span className="text-xs text-zinc-500">{version.length} characters</span>
                      {version.length <= selectedPlatform.limit ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                          Within limit
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                          Over by {version.length - selectedPlatform.limit}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Original bio for comparison */}
            <div className="rounded-xl p-5 border border-zinc-800 bg-zinc-900/20">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Your Original Bio</p>
              <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-line">{currentBio}</p>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
