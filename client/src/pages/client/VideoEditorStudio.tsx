import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import AIEditStudio from "@/components/video-studio/AIEditStudio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Film, Upload, Scissors, Captions, Palette, Gauge, Play, Download,
  Loader2, CheckCircle2, XCircle, Clock, Trash2,
  Wand2, AlertCircle, Mic, Sparkles, Clapperboard,
  ArrowRight, FileText, Star, Zap, CheckSquare, Square, X, ExternalLink,
} from "lucide-react";

type VideoEdit = {
  id: number; userId: string; title: string; originalFilename: string;
  filePath: string; fileUrl?: string; duration?: number;
  transcript?: { text: string; words: { word: string; start: number; end: number }[]; duration?: number };
  silences?: { start: number; end: number; duration: number }[];
  status: string; shotstackRenderId?: string; outputUrl?: string;
  settings?: any; createdAt: string;
};

type Settings = {
  removeSilences: boolean; silenceThreshold: string;
  addCaptions: boolean; captionStyle: string;
  colorGrade: string; speed: string;
};

const DEFAULT_SETTINGS: Settings = {
  removeSilences: true, silenceThreshold: "0.5",
  addCaptions: true, captionStyle: "bold",
  colorGrade: "none", speed: "1",
};

const MODES = [
  { id: "viral", label: "🔥 Viral", desc: "Fast cuts, max energy" },
  { id: "story", label: "🎬 Story", desc: "Narrative + emotion" },
  { id: "sales", label: "💰 Sales", desc: "Problem → CTA" },
  { id: "educational", label: "📚 Educational", desc: "Numbered points" },
  { id: "cinematic", label: "🎥 Cinematic", desc: "B-roll + drama" },
  { id: "personal_brand", label: "🚀 Personal Brand", desc: "Authentic + trust" },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram Reels" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube Shorts" },
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}





export default function VideoEditorStudio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"plan" | "edit">("edit");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // ── Upload state ──────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Video player state ────────────────────────────────────────────────────────

  // ── Plan state ────────────────────────────────────────────────────────────────
  const [planMode, setPlanMode] = useState("viral");
  const [planPlatform, setPlanPlatform] = useState("instagram");
  const [planDuration, setPlanDuration] = useState("30");
  const [planTopic, setPlanTopic] = useState("");
  const [planResult, setPlanResult] = useState<any>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [scriptExpanded, setScriptExpanded] = useState(false);

  // ── Editor plan (from AI Video Editor via localStorage) ───────────────────────
  const [editorPlan, setEditorPlan] = useState<any>(null);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<number>>(new Set());
  const [editorBannerDismissed, setEditorBannerDismissed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("oravini_studio_plan");
    if (!raw) return;
    try {
      const plan = JSON.parse(raw);
      if (!plan?.fromEditor) return;
      setEditorPlan(plan);
      // Auto-populate plan tab fields from editor context
      if (plan.mode)           setPlanMode(plan.mode);
      if (plan.platform)       setPlanPlatform(plan.platform);
      if (plan.targetDuration) setPlanDuration(String(plan.targetDuration));
      if (plan.title)          setPlanTopic(plan.title);
      // Auto-apply recommended settings
      if (plan.recommendedSettings && Object.keys(plan.recommendedSettings).length > 0) {
        setSettings(prev => ({ ...prev, ...plan.recommendedSettings }));
      }
      // If has script/hooks, load as plan result so it shows in edit panel
      if (plan.fullScript || plan.hooks?.length) {
        setPlanResult({
          hooks: plan.hooks || [],
          fullScript: plan.fullScript || "",
          timeline: plan.timeline || [],
          title: plan.title || "",
        });
      }
      // Switch to edit tab so they can upload their video immediately
      setTab("edit");
    } catch (_) {}
  }, []);

  // ── Plan generator ────────────────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    if (!planTopic.trim()) { toast({ title: "Enter a topic first", variant: "destructive" }); return; }
    setIsPlanLoading(true);
    try {
      const data = await apiRequest("POST", "/api/video/analyze", {
        inputType: "idea",
        description: planTopic,
        mode: planMode,
        goal: "viral",
        platform: planPlatform,
        targetDuration: planDuration,
      });
      setPlanResult(data);
      toast({ title: "Script generated!", description: "Your plan is ready. Switch to Edit to start recording." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsPlanLoading(false);
    }
  };

  return (
    <ClientLayout>
      <div className="h-full flex flex-col">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-card/30 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Film className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black text-foreground tracking-tight leading-none">Video Studio</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Upload → auto-transcribe → AI edit chat → render</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: "plan", icon: Sparkles, label: "Plan Script" },
              { id: "edit", icon: Clapperboard, label: "Edit Studio" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${tab === t.id ? "bg-primary/15 text-primary border-primary/30" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700"}`}
                data-testid={`tab-${t.id}`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── PLAN SCRIPT TAB ─────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {tab === "plan" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl">
                <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-foreground">AI Script Planner</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Generate your script, hooks & shot list — then record & edit in the Studio</p>
                </div>
                {planResult && (
                  <Button size="sm" onClick={() => setTab("edit")} className="ml-auto bg-primary text-black hover:bg-primary/90 gap-1.5 font-bold flex-shrink-0">
                    Edit Studio <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Mode */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Video Style</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => setPlanMode(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${planMode === m.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-zinc-700/50 text-muted-foreground hover:border-zinc-600"}`}>
                      <p className="text-xs font-bold text-foreground">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Platform</p>
                  <div className="flex flex-col gap-1.5">
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => setPlanPlatform(p.id)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border text-left transition-all ${planPlatform === p.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-zinc-700/50 text-muted-foreground hover:border-zinc-600"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Duration</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["15", "30", "45", "60", "90"].map(d => (
                      <button key={d} onClick={() => setPlanDuration(d)}
                        className={`text-xs font-semibold px-2 py-2 rounded-xl border transition-all ${planDuration === d ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-zinc-700/50 text-muted-foreground hover:border-zinc-600"}`}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Topic or Idea</p>
                <Textarea value={planTopic} onChange={e => setPlanTopic(e.target.value)} placeholder="e.g. 5 mistakes beginners make when building their personal brand on Instagram…" className="bg-card border-zinc-700/60 text-sm resize-none h-24" data-testid="input-plan-topic" />
              </div>

              <Button onClick={handleGeneratePlan} disabled={isPlanLoading || !planTopic.trim()}
                className="w-full bg-primary text-black hover:bg-primary/90 font-bold gap-2 h-11" data-testid="btn-generate-plan">
                {isPlanLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your script…</> : <><Wand2 className="w-4 h-4" /> Generate My Script</>}
              </Button>

              {/* Result */}
              {planResult && (
                <div className="space-y-4">
                  <div className="h-px bg-zinc-800/60" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-primary" /> Your Script Plan
                  </p>

                  {/* Hooks */}
                  {planResult.hooks?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🎣 Hook Options</p>
                      {planResult.hooks.slice(0, 3).map((h: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-card border border-zinc-700/50 rounded-xl">
                          <span className="text-[10px] font-black text-primary mt-0.5 flex-shrink-0">#{i + 1}</span>
                          <p className="text-xs text-foreground">{h}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Script */}
                  {planResult.fullScript && (
                    <div className="space-y-2">
                      <button className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider" onClick={() => setScriptExpanded(v => !v)}>
                        <FileText className="w-3.5 h-3.5" /> Full Script
                        <span className="text-primary">{scriptExpanded ? "▲ hide" : "▼ show"}</span>
                      </button>
                      {scriptExpanded && (
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 max-h-64 overflow-y-auto">
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{planResult.fullScript}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  {planResult.timeline?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🎬 Shot Timeline</p>
                      <div className="space-y-1.5">
                        {planResult.timeline.slice(0, 8).map((seg: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-card border border-zinc-700/40 rounded-xl">
                            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5">{seg.time || `${i * 5}–${(i + 1) * 5}s`}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground">{seg.action || seg.label || seg.title}</p>
                              {seg.note && <p className="text-[10px] text-muted-foreground mt-0.5">{seg.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={() => setTab("edit")} className="w-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 gap-2 font-bold">
                    <Clapperboard className="w-4 h-4" /> Upload & Edit Your Video
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EDIT STUDIO TAB: upload → Whisper → AI chat edits → EDL preview → render ── */}
        {tab === "edit" && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {planResult?.hooks?.length > 0 && !activeProjectId && (
              <div className="max-w-3xl mx-auto w-full px-6 pt-6">
                <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-foreground">Script ready — record it, then upload the footage below. Hook #1: <span className="text-muted-foreground">{planResult.hooks[0]}</span></p>
                </div>
              </div>
            )}
            <AIEditStudio projectId={activeProjectId} onProjectChange={setActiveProjectId} />
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
