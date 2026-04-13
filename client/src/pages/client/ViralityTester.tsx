import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Flame, Zap, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2,
  Target, Brain, Activity, Play, ChevronDown, ChevronUp, Copy, Check,
  RefreshCw, Star, AlertCircle, ArrowRight, Clock, BarChart2, Heart,
  Eye, Shield, Award, Lightbulb, Wand2, MessageCircle, Crosshair, Trash2,
  Download, FileText,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";
const PIE_COLORS = ["#d4b461", "#e879a0", "#60a5fa", "#34d399", "#a78bfa", "#fb923c", "#f97316"];

const PLATFORMS = [
  { id: "instagram", label: "Instagram Reels", icon: "📸" },
  { id: "youtube", label: "YouTube", icon: "🎬" },
];

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#34d399" : score >= 50 ? GOLD : score >= 30 ? "#fb923c" : "#f87171";
  const label = score >= 75 ? "High Retention" : score >= 50 ? "Moderate Retention" : score >= 30 ? "Low Retention" : "Drop Risk";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1f1f1f" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="44" textAnchor="middle" fill="white" fontSize="18" fontWeight="900">{score}</text>
        <text x="50" y="58" textAnchor="middle" fill="#888" fontSize="8">/100</text>
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "#34d399" : score >= 5 ? GOLD : "#f87171";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[10px]">{weight}</span>
          <span className="font-bold" style={{ color }}>{score}/10</span>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function DropAlert({ second, reason, severity }: { second: number; reason: string; severity: string }) {
  const color = severity === "high" ? "border-red-500/40 bg-red-500/5 text-red-400" : "border-yellow-500/40 bg-yellow-500/5 text-yellow-400";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${color}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-bold">Drop at {second}s</p>
        <p className="text-xs opacity-80 mt-0.5">{reason}</p>
      </div>
    </div>
  );
}

function FixCard({ fix }: { fix: { type: string; text: string; priority: string } }) {
  const icons: Record<string, any> = { cut: AlertTriangle, add: Zap, rewrite: Wand2, move: ArrowRight };
  const Icon = icons[fix.type] || Lightbulb;
  const colors: Record<string, string> = { high: "border-red-500/30 bg-red-500/5", medium: "border-yellow-500/30 bg-yellow-500/5", low: "border-green-500/30 bg-green-500/5" };
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${colors[fix.priority] || colors.low}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 capitalize">{fix.type}</span>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${fix.priority === "high" ? "bg-red-500/20 text-red-400" : fix.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>{fix.priority}</span>
        </div>
        <p className="text-xs text-zinc-200">{fix.text}</p>
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg hover:bg-primary/10 text-zinc-500 hover:text-primary transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const CustomRetentionTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-zinc-400 mb-1">{label}</p>
        <p className="text-white font-bold">{payload[0].value}% retained</p>
      </div>
    );
  }
  return null;
};

export default function ViralityTester({ useAdmin, activeClientId, user }: { useAdmin?: boolean; activeClientId?: string | number; user?: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"new" | "reel">("new");
  const [script, setScript] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [audience, setAudience] = useState("");
  const [whyViral, setWhyViral] = useState("");
  const [result, setResult] = useState<any>(null);
  const [newHooks, setNewHooks] = useState<string[]>([]);
  const [rewrittenScript, setRewrittenScript] = useState("");
  const [showHooks, setShowHooks] = useState(false);
  const [showRewrite, setShowRewrite] = useState(false);
  const [contentAngles, setContentAngles] = useState<any[]>([]);
  const [showAngles, setShowAngles] = useState(false);

  const { data: viralityHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/ai/history?tool=virality"],
    enabled: !useAdmin,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/virality/analyze", payload);
    },
    onSuccess: (data, variables: any) => {
      setResult(data);
      setNewHooks([]);
      setRewrittenScript("");
      setShowHooks(false);
      setShowRewrite(false);
      if (!useAdmin) {
        const snippet = (variables.script || variables.reelUrl || "").slice(0, 80);
        apiRequest("POST", "/api/ai/history", {
          tool: "virality",
          title: snippet || "Reel analysis",
          inputs: { script: variables.script, reelUrl: variables.reelUrl, platform: variables.platform, audience: variables.audience },
          output: { overallScore: data.overallScore, viralPrediction: data.viralPrediction, scores: data.scores },
        }).then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=virality"] })).catch(() => {});
      }
    },
    onError: (err: any) => toast({ title: "Analysis failed", description: err.message, variant: "destructive" }),
  });

  const hooksMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/virality/hooks", payload);
    },
    onSuccess: (data) => { setNewHooks(data.hooks || []); setShowHooks(true); },
    onError: (err: any) => toast({ title: "Hook generation failed", description: err.message, variant: "destructive" }),
  });

  const rewriteMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/virality/rewrite", payload);
    },
    onSuccess: (data) => { setRewrittenScript(data.script || ""); setShowRewrite(true); },
    onError: (err: any) => toast({ title: "Rewrite failed", description: err.message, variant: "destructive" }),
  });

  const anglesMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/virality/angles", payload);
    },
    onSuccess: (data) => { setContentAngles(data.angles || []); setShowAngles(true); },
    onError: (err: any) => toast({ title: "Angles generation failed", description: err.message, variant: "destructive" }),
  });

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const margin = 48;
      const contentW = W - margin * 2;
      let y = margin;

      const gold = [212, 180, 97] as [number, number, number];
      const dark = [18, 18, 18] as [number, number, number];
      const white = [255, 255, 255] as [number, number, number];
      const muted = [140, 140, 140] as [number, number, number];
      const green = [52, 211, 153] as [number, number, number];
      const red = [248, 113, 113] as [number, number, number];
      const orange = [251, 146, 60] as [number, number, number];

      const addPage = () => { doc.addPage(); y = margin; };
      const checkPage = (needed = 40) => { if (y + needed > doc.internal.pageSize.getHeight() - margin) addPage(); };

      // ── Cover background
      doc.setFillColor(...dark); doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
      doc.setFillColor(30, 30, 30); doc.rect(0, 0, W, 160, "F");

      // ── Brand header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10); doc.setTextColor(...gold);
      doc.text("ORAVINI · VIRALITY REPORT", margin, y + 10);
      doc.setFontSize(22); doc.setTextColor(...white);
      doc.text("Virality Tester Report", margin, y + 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9); doc.setTextColor(...muted);
      const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      doc.text(`Generated: ${dateStr}  ·  Platform: ${platform === "youtube" ? "YouTube" : "Instagram Reels"}`, margin, y + 54);

      // Score badge
      const score = result.overallScore ?? 0;
      const scoreColor: [number, number, number] = score >= 75 ? green : score >= 50 ? gold : score >= 30 ? orange : red;
      doc.setFillColor(...scoreColor); doc.roundedRect(W - margin - 80, y, 80, 60, 8, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(28); doc.setTextColor(...dark);
      doc.text(`${score}`, W - margin - 40, y + 34, { align: "center" });
      doc.setFontSize(8); doc.text("/100", W - margin - 40, y + 48, { align: "center" });

      y += 80;
      doc.setDrawColor(...gold); doc.setLineWidth(0.5); doc.line(margin, y, W - margin, y);
      y += 20;

      // ── Verdict
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...white);
      doc.text("Verdict", margin, y); y += 14;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...muted);
      const predLines = doc.splitTextToSize(result.viralPrediction || "", contentW);
      doc.text(predLines, margin, y); y += predLines.length * 12 + 16;

      // ── Score breakdown
      checkPage(120);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...white);
      doc.text("Score Breakdown", margin, y); y += 16;

      const scoreItems = [
        { label: "Hook Strength", val: result.scores?.hook ?? 0, weight: "25%" },
        { label: "Pacing & Pattern Interrupts", val: result.scores?.pacing ?? 0, weight: "20%" },
        { label: "Emotional Curve", val: result.scores?.emotion ?? 0, weight: "15%" },
        { label: "Drop Risk (inverse)", val: result.scores?.dropRisk ?? 0, weight: "15%" },
        { label: "Clarity & Cognitive Load", val: result.scores?.clarity ?? 0, weight: "10%" },
        { label: "Payoff Strength", val: result.scores?.payoff ?? 0, weight: "10%" },
        { label: "Rewatch / Loop Potential", val: result.scores?.rewatch ?? 0, weight: "5%" },
      ];

      for (const item of scoreItems) {
        checkPage(24);
        const barColor: [number, number, number] = item.val >= 7 ? green : item.val >= 5 ? gold : red;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...muted);
        doc.text(item.label, margin, y);
        doc.setFont("helvetica", "bold"); doc.setTextColor(...barColor);
        doc.text(`${item.val}/10  (${item.weight})`, W - margin, y, { align: "right" });
        y += 4;
        doc.setFillColor(40, 40, 40); doc.roundedRect(margin, y, contentW, 5, 2, 2, "F");
        doc.setFillColor(...barColor); doc.roundedRect(margin, y, (item.val / 10) * contentW, 5, 2, 2, "F");
        y += 12;
      }
      y += 8;

      // ── Hook Analysis
      if (result.hookAnalysis) {
        checkPage(60);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...white);
        doc.text("Hook Analysis", margin, y); y += 14;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...muted);
        doc.text(`Hook Score: ${result.hookAnalysis.score}/10  ·  Scroll-Stop Rate: ${result.hookAnalysis.scrollStoppingScore}%`, margin, y); y += 14;
        if (result.hookAnalysis.strengths?.length) {
          doc.setTextColor(52, 211, 153);
          doc.text("Strengths: " + result.hookAnalysis.strengths.join("  ·  "), margin, y); y += 12;
        }
        if (result.hookAnalysis.weaknesses?.length) {
          doc.setTextColor(...red);
          doc.text("Weaknesses: " + result.hookAnalysis.weaknesses.join("  ·  "), margin, y); y += 12;
        }
        y += 8;
      }

      // ── Fixes
      if (result.fixes?.length) {
        checkPage(60);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...white);
        doc.text("Retention Fixes", margin, y); y += 14;
        for (const fix of result.fixes) {
          checkPage(28);
          const fc: [number, number, number] = fix.priority === "high" ? red : fix.priority === "medium" ? orange : green;
          doc.setFillColor(fc[0], fc[1], fc[2], 20);
          doc.setDrawColor(...fc); doc.setLineWidth(0.3);
          doc.roundedRect(margin, y - 2, contentW, 20, 3, 3, "S");
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...fc);
          doc.text(`[${(fix.type || "fix").toUpperCase()}] ${fix.priority?.toUpperCase()}`, margin + 6, y + 9);
          doc.setFont("helvetica", "normal"); doc.setTextColor(...muted);
          const fixLines = doc.splitTextToSize(fix.text || "", contentW - 120);
          doc.text(fixLines, margin + 110, y + 9);
          y += Math.max(24, fixLines.length * 10 + 10);
        }
        y += 6;
      }

      // ── Drop-offs
      if (result.dropoffs?.length) {
        checkPage(60);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...white);
        doc.text("Drop-Off Points", margin, y); y += 14;
        for (const d of result.dropoffs) {
          checkPage(22);
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...red);
          doc.text(`Drop at ${d.second}s [${(d.severity || "").toUpperCase()}]`, margin, y);
          doc.setFont("helvetica", "normal"); doc.setTextColor(...muted);
          doc.text(d.reason || "", margin + 100, y);
          y += 14;
        }
        y += 8;
      }

      // ── Content Angles
      if (contentAngles.length > 0) {
        checkPage(40);
        doc.setFillColor(30, 30, 30); doc.rect(0, y - 8, W, 28, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...gold);
        doc.text("10 Content Angles to Go Viral Again", margin, y + 10); y += 30;

        for (const angle of contentAngles) {
          checkPage(80);
          doc.setFillColor(28, 28, 28); doc.roundedRect(margin, y - 4, contentW, 70, 5, 5, "F");
          doc.setDrawColor(60, 60, 60); doc.setLineWidth(0.3); doc.roundedRect(margin, y - 4, contentW, 70, 5, 5, "S");

          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...white);
          doc.text(`${angle.number || ""}. ${angle.title || ""}`, margin + 10, y + 10);

          doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...gold);
          const hookLines = doc.splitTextToSize(`"${angle.hook}"`, contentW - 20);
          doc.text(hookLines, margin + 10, y + 22);

          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...muted);
          const briefLines = doc.splitTextToSize(angle.brief || "", contentW - 20);
          doc.text(briefLines, margin + 10, y + 22 + hookLines.length * 10 + 2);

          doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
          doc.text(`Format: ${angle.format || ""}  ·  ${(angle.platforms || []).join(", ")}`, margin + 10, y + 60);
          y += 80;
        }
      }

      // ── Footer on each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...dark); doc.rect(0, doc.internal.pageSize.getHeight() - 30, W, 30, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...muted);
        doc.text("Oravini · Virality Tester Report · Confidential", margin, doc.internal.pageSize.getHeight() - 12);
        doc.text(`Page ${i} of ${totalPages}`, W - margin, doc.internal.pageSize.getHeight() - 12, { align: "right" });
      }

      doc.save(`virality-report-${Date.now()}.pdf`);
      toast({ title: "PDF exported", description: "Your report has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleAnalyze = () => {
    if (mode === "new" && !script.trim()) return toast({ title: "Please enter your script or content idea", variant: "destructive" });
    if (mode === "reel" && !reelUrl.trim()) return toast({ title: "Please enter a reel URL", variant: "destructive" });
    analyzeMutation.mutate({ mode, script: script.trim(), reelUrl: reelUrl.trim(), platform, audience: audience.trim() });
  };

  const r = result;

  const radarData = r ? [
    { subject: "Hook", value: r.scores?.hook ?? 0, max: 10 },
    { subject: "Pacing", value: r.scores?.pacing ?? 0, max: 10 },
    { subject: "Emotion", value: r.scores?.emotion ?? 0, max: 10 },
    { subject: "Clarity", value: r.scores?.clarity ?? 0, max: 10 },
    { subject: "Payoff", value: r.scores?.payoff ?? 0, max: 10 },
    { subject: "Rewatch", value: r.scores?.rewatch ?? 0, max: 10 },
  ] : [];

  const pieData = r ? [
    { name: "Hook", value: 25 },
    { name: "Pacing", value: 20 },
    { name: "Emotion", value: 15 },
    { name: "Clarity", value: 10 },
    { name: "Drop Risk", value: 15 },
    { name: "Payoff", value: 10 },
    { name: "Rewatch", value: 5 },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white mb-1">Virality Tester</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Paste your script or content idea to test virality before you post — or drop in an Instagram Reel or YouTube video that already went viral. Explain why it performed, and generate 10 content angles to recreate that success.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-6">
      {/* Input card */}
      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setMode("new")}
              data-testid="btn-mode-new"
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === "new" ? "bg-primary text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Paste Script / Idea
            </button>
            <button
              onClick={() => setMode("reel")}
              data-testid="btn-mode-reel"
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === "reel" ? "bg-primary text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Analyse Previous Reel
            </button>
          </div>

          {/* Platform selector */}
          <div>
            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Platform</Label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  data-testid={`btn-platform-${p.id}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${platform === p.id ? "border-primary/50 bg-primary/10 text-primary" : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"}`}
                >
                  <span>{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "new" ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-300">Script / Hook / Content Idea</Label>
              <Textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder="Paste your full script, hook, or reel idea here. The more detail you give, the more accurate the retention analysis..."
                className="min-h-[140px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm resize-none"
                data-testid="textarea-script"
              />
              <AiRefineButton text={script} onAccept={setScript} context="social media script, hook, or reel idea" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-300">
                  {platform === "youtube" ? "YouTube Video URL" : "Instagram Reel URL"}
                </Label>
                <Input
                  value={reelUrl}
                  onChange={e => setReelUrl(e.target.value)}
                  placeholder={platform === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://www.instagram.com/reel/..."}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                  data-testid="input-reel-url"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-300">Why did it go viral? <span className="text-zinc-500 font-normal">(optional — but improves results)</span></Label>
                <Textarea
                  value={whyViral}
                  onChange={e => setWhyViral(e.target.value)}
                  placeholder="e.g. It had a shocking hook, the topic was trending, the story felt relatable, it hit a pain point my audience struggles with..."
                  className="min-h-[90px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm resize-none"
                  data-testid="textarea-why-viral"
                />
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-400">
                <p className="font-semibold text-primary mb-1">What you'll get:</p>
                <ul className="space-y-1 list-disc pl-4 text-xs">
                  <li>Why this {platform === "youtube" ? "video" : "reel"} went viral — or why it didn't</li>
                  <li>Full breakdown of what worked and what killed retention</li>
                  <li>Hook strength, engagement analysis, audience fit</li>
                  <li>10 content angles to post similar viral content</li>
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-zinc-300">Target Audience <span className="text-zinc-500 font-normal">(optional)</span></Label>
            <Input
              value={audience}
              onChange={e => setAudience(e.target.value)}
              placeholder="e.g. entrepreneurs, fitness beginners, 18-25 year olds..."
              className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              data-testid="input-audience"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="w-full bg-primary text-black font-bold text-sm py-5 hover:bg-primary/90"
            data-testid="btn-analyze-virality"
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing Retention...</>
            ) : (
              <><Flame className="w-4 h-4 mr-2" /> {mode === "reel" ? "Analyse My Reel" : "Test Virality"}</>
            )}
          </Button>
        </CardContent>
      </Card>


      {/* Loading state */}
      {analyzeMutation.isPending && (
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold mb-1">Simulating viewer attention...</p>
            <p className="text-zinc-400 text-sm">Breaking down hook, pacing, emotion curve, and drop-off points</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {r && !analyzeMutation.isPending && (
        <div className="space-y-5">
          {/* Export PDF button row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-white">Analysis Report</span>
              {contentAngles.length > 0 && (
                <span className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">+ {contentAngles.length} angles</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary hover:bg-primary/10 font-bold gap-2"
              disabled={exportingPdf}
              data-testid="btn-export-pdf"
              onClick={handleExportPdf}
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </Button>
          </div>

          {/* Hero score + verdict */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={r.overallScore ?? 0} size={140} />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-black text-white">{r.overallScore}/100</h3>
                  <Badge className={`text-xs font-bold ${r.overallScore >= 75 ? "bg-green-500/20 text-green-400 border-green-500/30" : r.overallScore >= 50 ? "bg-primary/20 text-primary border-primary/30" : r.overallScore >= 30 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                    {r.overallScore >= 75 ? "🔥 High Virality" : r.overallScore >= 50 ? "⚡ Moderate Retention" : r.overallScore >= 30 ? "⚠️ Drop Risk" : "🚨 Scroll Killer"}
                  </Badge>
                  <span className="text-xs text-zinc-500">Prediction Confidence: <span className="text-zinc-300 font-semibold">{r.confidence ?? 80}%</span></span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{r.viralPrediction}</p>
                {r.penalties?.filter((p: any) => p.impact < 0 && p.reason?.toLowerCase() !== "none").length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.penalties.filter((p: any) => p.impact < 0 && p.reason?.toLowerCase() !== "none").map((p: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                        <TrendingDown className="w-3 h-3" /> {p.reason} ({p.impact}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Retention Curve */}
          {r.retentionCurve?.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-black text-white">Second-by-Second Retention Curve</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={r.retentionCurve} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="second" tickFormatter={(v) => `${v}s`} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomRetentionTooltip />} />
                    <Line type="monotone" dataKey="retention" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: GOLD }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3">
                  {r.retentionCurve.map((p: any, i: number) => (
                    <div key={i} className="text-[10px] text-center">
                      <div className={`font-bold ${p.retention >= 70 ? "text-green-400" : p.retention >= 40 ? "text-primary" : "text-red-400"}`}>{p.retention}%</div>
                      <div className="text-zinc-500">{p.label || `${p.second}s`}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drop-off alerts */}
          {r.dropoffs?.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-sm font-black text-white">Drop-Off Detection</h3>
                </div>
                <div className="space-y-3">
                  {r.dropoffs.map((d: any, i: number) => (
                    <DropAlert key={i} second={d.second} reason={d.reason} severity={d.severity} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score breakdown + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-black text-white">Score Breakdown</h3>
                </div>
                <div className="space-y-4">
                  <ScoreBar label="Hook Strength" score={r.scores?.hook ?? 0} weight="25%" />
                  <ScoreBar label="Pacing & Pattern Interrupts" score={r.scores?.pacing ?? 0} weight="20%" />
                  <ScoreBar label="Emotional Curve" score={r.scores?.emotion ?? 0} weight="15%" />
                  <ScoreBar label="Drop Risk (inverse)" score={r.scores?.dropRisk ?? 0} weight="15%" />
                  <ScoreBar label="Clarity & Cognitive Load" score={r.scores?.clarity ?? 0} weight="10%" />
                  <ScoreBar label="Payoff Strength" score={r.scores?.payoff ?? 0} weight="10%" />
                  <ScoreBar label="Rewatch / Loop Potential" score={r.scores?.rewatch ?? 0} weight="5%" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-black text-white">Retention Radar</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1f1f1f" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#888", fontSize: 11 }} />
                    <Radar name="Score" dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Score weight pie + emotion curve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-black text-white">Score Weight Distribution</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "#888" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {r.emotionCurve?.length > 0 && (
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-pink-400" />
                    <h3 className="text-sm font-black text-white">Emotion Curve</h3>
                  </div>
                  <div className="space-y-3">
                    {r.emotionCurve.map((e: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-16 text-[10px] text-zinc-500 font-medium">{e.phase}</div>
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(e.intensity / 10) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-300 w-20 font-medium">{e.emotion}</div>
                        <div className="text-[10px] font-bold" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{e.intensity}/10</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {r.narrativeFlow && (
                      <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1 font-semibold uppercase tracking-wider">Narrative Flow</p>
                        <p className="text-xs text-zinc-300">{r.narrativeFlow}</p>
                      </div>
                    )}
                    {r.informationDensity && (
                      <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1 font-semibold uppercase tracking-wider">Info Density</p>
                        <p className="text-xs text-zinc-300">{r.informationDensity}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hook + Platform + Audience row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {r.hookAnalysis && (
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Hook Analysis</h4>
                  </div>
                  <div className="text-2xl font-black text-primary mb-1">{r.hookAnalysis.score}/10</div>
                  <div className="text-[10px] text-zinc-500 mb-3">Scroll-Stop Score: <span className="text-zinc-300 font-bold">{r.hookAnalysis.scrollStoppingScore}%</span></div>
                  {r.hookAnalysis.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] text-green-400 font-bold mb-1">Strengths</p>
                      {r.hookAnalysis.strengths.map((s: string, i: number) => <p key={i} className="text-[10px] text-zinc-400">• {s}</p>)}
                    </div>
                  )}
                  {r.hookAnalysis.weaknesses?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-red-400 font-bold mb-1">Weaknesses</p>
                      {r.hookAnalysis.weaknesses.map((w: string, i: number) => <p key={i} className="text-[10px] text-zinc-400">• {w}</p>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {r.platformFit && (
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Platform Fit</h4>
                  </div>
                  <div className="text-2xl font-black text-primary mb-1">{r.platformFit.score}%</div>
                  <p className="text-[10px] text-zinc-500 mb-2">{r.platformFit.platform}</p>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">{r.platformFit.notes}</p>
                </CardContent>
              </Card>
            )}

            {r.audienceFit && (
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Audience Fit</h4>
                  </div>
                  <div className="text-2xl font-black text-primary mb-1">{r.audienceFit.score}%</div>
                  <div className="flex items-center gap-1 mb-2">
                    <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-400" style={{ width: `${r.audienceFit.score}%` }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">{r.audienceFit.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rewatch + Loop potential */}
          {r.loopPotential !== undefined && (
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-black text-white">Loop & Rewatch Potential</h4>
                  </div>
                  <span className={`text-xl font-black ${r.loopPotential >= 65 ? "text-green-400" : r.loopPotential >= 40 ? "text-primary" : "text-red-400"}`}>{r.loopPotential}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${r.loopPotential}%` }} />
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  {r.loopPotential >= 65 ? "Strong loop potential — viewers are likely to rewatch this content." : r.loopPotential >= 40 ? "Moderate loop potential. Add an open loop or mystery element to increase replays." : "Low rewatch potential. The content doesn't give viewers a reason to replay."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Fixes */}
          {r.fixes?.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-black text-white">Retention Optimization Engine</h3>
                  <span className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">Surgical Fixes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {r.fixes.map((f: any, i: number) => <FixCard key={i} fix={f} />)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 font-bold"
              disabled={hooksMutation.isPending}
              data-testid="btn-generate-hooks"
              onClick={() => hooksMutation.mutate({ script: script || r.viralPrediction, platform })}
            >
              {hooksMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Generate Better Hooks
            </Button>
            <Button
              className="bg-primary text-black font-bold hover:bg-primary/90"
              disabled={rewriteMutation.isPending}
              data-testid="btn-make-viral"
              onClick={() => rewriteMutation.mutate({ script: script || r.viralPrediction, platform, audience, score: r.overallScore, fixes: r.fixes })}
            >
              {rewriteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Make It Viral ✨
            </Button>
          </div>

          {/* Generate 10 Content Angles — shown when a reel/video URL was analysed */}
          {mode === "reel" && reelUrl && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Generate 10 Content Angles</p>
                    <p className="text-xs text-zinc-500">Turn this viral {platform === "youtube" ? "video" : "reel"} into 10 new post ideas you can recreate</p>
                  </div>
                  <Button
                    className="ml-auto bg-primary text-black font-bold text-xs px-4 py-2 h-auto hover:bg-primary/90 flex-shrink-0"
                    disabled={anglesMutation.isPending}
                    data-testid="btn-generate-angles"
                    onClick={() => anglesMutation.mutate({ viralUrl: reelUrl, platform, whyViral, audience })}
                  >
                    {anglesMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate Angles</>}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500">Uses 2 credits · Works best when you explain why it went viral above</p>
              </CardContent>
            </Card>
          )}

          {/* Content Angles results */}
          {showAngles && contentAngles.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-black text-white">10 Content Angles to Go Viral Again</h3>
                  <span className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5 ml-auto">{contentAngles.length} angles</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contentAngles.map((angle: any, i: number) => (
                    <div key={i} className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">{i + 1}</span>
                          <p className="text-sm font-black text-white leading-snug">{angle.title}</p>
                        </div>
                        <CopyBtn text={`${angle.title}\n\nHook: ${angle.hook}\n\n${angle.brief}`} />
                      </div>
                      <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-3 py-2">
                        <p className="text-[10px] text-zinc-500 font-semibold mb-0.5">HOOK</p>
                        <p className="text-xs text-primary font-medium italic">"{angle.hook}"</p>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{angle.brief}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-zinc-600 text-zinc-400">{angle.format}</span>
                        {(angle.platforms || []).map((p: string) => (
                          <span key={p} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p === "Instagram" ? "bg-pink-500/15 border border-pink-500/30 text-pink-400" : "bg-red-500/15 border border-red-500/30 text-red-400"}`}>{p}</span>
                        ))}
                      </div>
                      {angle.whyItWorks && (
                        <div className="flex items-start gap-1.5">
                          <Brain className="w-3 h-3 text-zinc-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-zinc-500 italic">{angle.whyItWorks}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated hooks */}
          {showHooks && newHooks.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-sm font-black text-white">5 Upgraded Hooks</h3>
                </div>
                <div className="space-y-3">
                  {newHooks.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                      <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/20 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="flex-1 text-sm text-zinc-200">{h}</p>
                      <CopyBtn text={h} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rewritten script */}
          {showRewrite && rewrittenScript && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black text-white">Viral-Optimised Script</h3>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">AI Rewritten</span>
                  </div>
                  <CopyBtn text={rewrittenScript} />
                </div>
                <div className="bg-zinc-900/80 rounded-xl p-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap border border-zinc-700/50">
                  {rewrittenScript}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      </div>

      {/* Right column: History panel */}
      {!useAdmin && (
        <div className="lg:sticky lg:top-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">Past Analyses</span>
              {viralityHistory.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">{viralityHistory.length}</span>
              )}
            </div>
            {viralityHistory.length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <Clock className="w-7 h-7 text-zinc-700" />
                <p className="text-xs text-zinc-500 leading-relaxed">No analyses yet.<br />Run your first test above.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto">
                {viralityHistory.map((h: any) => {
                  const out = h.output as any ?? {};
                  const inp = h.inputs as any ?? {};
                  const score = out.overallScore ?? 0;
                  const scoreColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-primary" : score >= 30 ? "text-orange-400" : "text-red-400";
                  return (
                    <div key={h.id} className="flex items-center gap-2.5 px-4 py-3" data-testid={`virality-history-${h.id}`}>
                      <div className={`text-base font-black ${scoreColor} w-9 flex-shrink-0 text-center`}>{score}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-zinc-300 leading-snug truncate">{h.title}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {new Date(h.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <button
                        className="text-[10px] text-primary hover:text-primary/80 font-semibold flex-shrink-0"
                        data-testid={`restore-virality-${h.id}`}
                        onClick={() => {
                          if (inp.script) setScript(inp.script);
                          if (inp.reelUrl) setReelUrl(inp.reelUrl);
                          if (inp.audience) setAudience(inp.audience);
                          setMode(inp.reelUrl ? "reel" : "new");
                        }}
                      >Restore</button>
                      <button
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                        onClick={() => apiRequest("DELETE", `/api/ai/history/${h.id}`).then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=virality"] })).catch(() => {})}
                        data-testid={`delete-virality-${h.id}`}
                      ><Trash2 className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
