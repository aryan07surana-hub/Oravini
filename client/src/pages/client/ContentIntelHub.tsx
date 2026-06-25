import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import {
  Sparkles, ChevronRight, Copy, Check, Wand2, ArrowRight,
  Bot, Loader2, FileText, Flame, Users, CheckCircle2,
  RefreshCw, X, Info, TrendingUp, Zap, Radar, ExternalLink
} from "lucide-react";

const GOLD = "#d4b461";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentIdea {
  id: string; topic: string; hook: string; format: string;
  structure: string; cta: string; rationale: string;
  competitor_handle: string; status: string; created_at: string;
}

interface Signal {
  id: string; handle: string; avg_views: number;
  avg_likes: number; avg_engagement: number;
  recent_posts: any[]; scanned_at: string;
}

interface HubData {
  ideas: ContentIdea[]; signals: Signal[];
  profile: any; watchlistCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

function timeAgo(d: string) {
  if (!d) return "";
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const FORMAT_ICON: Record<string, string> = {
  reel: "🎬", carousel: "🖼️", post: "📸", story: "⏱️",
};

// ─── 4-Step Progress Tracker ─────────────────────────────────────────────────

function FlowTracker({
  step1, step2, step3, step4,
}: { step1: boolean; step2: boolean; step3: boolean; step4: boolean }) {
  const steps = [
    { label: "Track", done: step1 },
    { label: "Discover", done: step2 },
    { label: "Script", done: step3 },
    { label: "Refine", done: step4 },
  ];
  const currentStep = steps.findIndex(s => !s.done);
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => {
        const active = i === currentStep;
        const done = s.done;
        return (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                done ? "bg-green-500 text-white" :
                active ? "bg-[#d4b461] text-black" :
                "bg-white/10 text-white/30"
              }`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[9px] font-bold mt-1 tracking-wider ${
                done ? "text-green-400" : active ? "text-[#d4b461]" : "text-white/25"
              }`}>{s.label.toUpperCase()}</span>
            </div>
            {i < 3 && (
              <div className={`flex-1 h-px mx-1 mb-4 ${
                done ? "bg-green-500/40" : "bg-white/8"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Dynamic "Your Next Action" Banner ────────────────────────────────────────

type NextActionConfig = {
  emoji: string;
  title: string;
  desc: string;
  buttonLabel?: string;
  buttonAction?: () => void;
  loading?: boolean;
  variant?: "gold" | "green" | "blue";
};

function NextActionBanner({ config }: { config: NextActionConfig }) {
  const colors = {
    gold: { border: "border-[#d4b461]/30", bg: "bg-[#d4b461]/8", btn: "bg-[#d4b461] hover:bg-[#c4a451] text-black" },
    green: { border: "border-green-500/25", bg: "bg-green-500/8", btn: "bg-green-500 hover:bg-green-400 text-black" },
    blue: { border: "border-blue-400/25", bg: "bg-blue-400/8", btn: "bg-blue-400 hover:bg-blue-300 text-black" },
  };
  const c = colors[config.variant || "gold"];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} px-5 py-4 flex items-center gap-4 mb-6`}>
      <span className="text-2xl shrink-0">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{config.title}</p>
        <p className="text-xs text-white/50 leading-relaxed mt-0.5">{config.desc}</p>
      </div>
      {config.buttonLabel && config.buttonAction && (
        <Button
          size="sm"
          onClick={config.buttonAction}
          disabled={config.loading}
          className={`shrink-0 h-9 text-sm font-bold ${c.btn}`}
        >
          {config.loading
            ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Working...</>
            : <>{config.buttonLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
          }
        </Button>
      )}
    </div>
  );
}

// ─── Idea Card ────────────────────────────────────────────────────────────────

function IdeaCard({
  idea, index, onDevelop, developing, isActive,
}: {
  idea: ContentIdea; index: number;
  onDevelop: (idea: ContentIdea) => void;
  developing: boolean; isActive: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(idea.hook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      isActive
        ? "border-[#d4b461]/50 shadow-lg shadow-[#d4b461]/10 bg-[#d4b461]/6"
        : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
    }`}>
      {/* Idea number strip */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          isActive ? "bg-[#d4b461]/20 text-[#d4b461]" : "bg-white/8 text-white/35"
        }`}>
          IDEA {index + 1}
        </div>
        <span className="text-sm">{FORMAT_ICON[idea.format] || "📱"}</span>
        <span className="text-[10px] text-white/30 capitalize">{idea.format}</span>
        {idea.status === "drafted" && (
          <span className="ml-auto text-[10px] font-bold text-green-400">✓ Scripted</span>
        )}
        <span className="text-[10px] text-white/20 ml-auto">{timeAgo(idea.created_at)}</span>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-3">
        {/* Topic */}
        <h3 className="text-base font-bold text-white leading-snug">{idea.topic}</h3>

        {/* Hook — the HERO element */}
        <div className="rounded-xl border border-[#d4b461]/20 bg-[#d4b461]/5 p-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-[9px] font-black text-[#d4b461] tracking-widest mt-0.5">OPENING HOOK</span>
            <span className="text-[9px] text-white/25 ml-auto">Copy-paste ready →</span>
          </div>
          <p className="text-base font-semibold text-white leading-snug mb-2">"{idea.hook}"</p>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[10px] text-[#d4b461]/70 hover:text-[#d4b461] transition-colors"
          >
            {copied
              ? <><Check className="w-3 h-3 text-green-400" />Copied!</>
              : <><Copy className="w-3 h-3" />Copy hook</>
            }
          </button>
        </div>

        {/* Why it works */}
        {idea.rationale && (
          <p className="text-xs text-white/40 leading-relaxed pl-3 border-l-2 border-white/8">
            {idea.rationale}
          </p>
        )}

        {/* Structure preview */}
        {idea.structure && (
          <p className="text-[11px] text-white/30">
            <span className="text-white/20">Structure: </span>{idea.structure}
          </p>
        )}

        {/* Source + CTA */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-white/20">
            inspired by @{idea.competitor_handle}
          </span>
          <Button
            size="sm"
            onClick={() => onDevelop(idea)}
            disabled={developing}
            className="h-9 text-sm font-bold bg-[#d4b461] hover:bg-[#c4a451] text-black"
          >
            {developing
              ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Building script...</>
              : <><Wand2 className="w-3.5 h-3.5 mr-2" />Make Script</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Competitor Signal Row ────────────────────────────────────────────────────

function SignalRow({ signal }: { signal: Signal }) {
  const posts: any[] = Array.isArray(signal.recent_posts) ? signal.recent_posts : [];
  const topPost = [...posts].sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))[0];
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4b461]/20 to-[#d4b461]/5 flex items-center justify-center shrink-0">
        <span className="text-xs font-black text-[#d4b461]">
          {signal.handle?.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">@{signal.handle}</p>
        {topPost?.caption
          ? <p className="text-[10px] text-white/30 truncate mt-0.5">"{topPost.caption}"</p>
          : <p className="text-[10px] text-white/20 mt-0.5">scanned {timeAgo(signal.scanned_at)}</p>
        }
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-white">{fmt(signal.avg_views)}</p>
        <p className="text-[9px] text-white/25">avg views</p>
      </div>
    </div>
  );
}

// ─── Script Overlay (animated slide-up) ──────────────────────────────────────

function ScriptOverlay({
  script, idea, onClose,
}: { script: string; idea: ContentIdea; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger enter animation on mount
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openCoach = () => {
    sessionStorage.setItem("coach_prefill", script);
    sessionStorage.setItem("coach_prefill_topic", idea.topic);
    navigate("/ai-coach");
  };

  return (
    <>
      {/* Backdrop — fades in */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={close}
      />

      {/* Panel — slides up */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t shadow-2xl"
        style={{
          background: "#111",
          borderColor: `${GOLD}40`,
          maxHeight: "72vh",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#d4b461]/15 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-[#d4b461]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Script Ready</p>
              <Badge className="text-[9px] bg-green-500/15 text-green-400 border-green-500/25 h-4">✓ DONE</Badge>
            </div>
            <p className="text-xs text-white/40 truncate">{idea.topic}</p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Script content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <pre className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{script}</pre>
        </div>

        {/* Action row */}
        <div className="px-5 py-4 border-t border-white/8 shrink-0">
          {/* Step prompt */}
          <p className="text-[10px] text-white/30 text-center mb-3 font-semibold tracking-wide">
            WHAT'S NEXT? → Send this to your AI Coach for scores, hook improvements, and a viral rewrite
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={copyScript}
              className="flex-1 h-10 text-sm border-white/15 text-white/60 hover:border-white/30"
            >
              {copied
                ? <><Check className="w-4 h-4 mr-2 text-green-400" />Copied!</>
                : <><Copy className="w-4 h-4 mr-2" />Copy</>
              }
            </Button>
            <Button
              onClick={openCoach}
              className="flex-[2] h-10 text-sm font-bold"
              style={{ background: GOLD, color: "#000" }}
            >
              <Bot className="w-4 h-4 mr-2" />Score + Improve in Coach
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Scan Result Sheet ────────────────────────────────────────────────────────

interface ScanCompetitorResult {
  handle: string;
  success: boolean;
  newPosts: Array<{ url: string; views: number; caption: string; type: string; thumbnail: string | null }>;
  viralPosts: Array<{ url: string; views: number; caption: string }>;
}

interface ScanResult {
  competitors: ScanCompetitorResult[];
  totalNew: number;
  totalViral: number;
  ideasGenerated: number;
  remaining: number;
  scannedAt: string;
}

function ScanResultSheet({ result, onClose }: { result: ScanResult; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const close = () => { setVisible(false); setTimeout(onClose, 320); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={close}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "80vh",
        }}
        className="relative bg-[#0e0e0e] border-t border-white/10 rounded-t-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Radar className="w-4 h-4" style={{ color: GOLD }} />
              <p className="text-sm font-bold text-white">Scan Complete</p>
            </div>
            <p className="text-[11px] text-white/40">
              {result.competitors.filter(c => c.success).length} of {result.competitors.length} competitors scanned
              {result.remaining > 0 ? ` · ${result.remaining} scan${result.remaining === 1 ? "" : "s"} left today` : " · No scans left today"}
            </p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 px-5 py-3 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-sm font-black text-white">{result.totalNew}</span>
            <span className="text-[10px] text-white/40">new posts</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
            <span className="text-sm font-black text-red-400">{result.totalViral}</span>
            <span className="text-[10px] text-red-400/60">viral signals</span>
          </div>
          {result.ideasGenerated > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ background: `${GOLD}12`, borderColor: `${GOLD}30` }}>
              <span className="text-sm font-black" style={{ color: GOLD }}>{result.ideasGenerated}</span>
              <span className="text-[10px]" style={{ color: `${GOLD}80` }}>ideas generated</span>
            </div>
          )}
        </div>

        {/* Per-competitor results */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {result.competitors.map(c => (
            <div key={c.handle} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.success ? "bg-green-400" : "bg-zinc-600"}`} />
                  <span className="text-sm font-semibold text-white">@{c.handle}</span>
                  {!c.success && <span className="text-[9px] text-zinc-600 font-medium">UNAVAILABLE</span>}
                </div>
                <div className="flex gap-1.5">
                  {c.newPosts.length > 0 && (
                    <Badge className="text-[9px] bg-white/6 text-white/50 border-white/10 border">{c.newPosts.length} new</Badge>
                  )}
                  {c.viralPosts.length > 0 && (
                    <Badge className="text-[9px] bg-red-500/15 text-red-400 border-red-500/20 border">🔥 {c.viralPosts.length} viral</Badge>
                  )}
                </div>
              </div>

              {c.newPosts.length > 0 && (
                <div className="space-y-2">
                  {c.newPosts.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/8 shrink-0 flex items-center justify-center text-lg overflow-hidden">
                        {p.thumbnail
                          ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
                          : <span>{p.type === "reel" ? "🎬" : "🖼️"}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/70 leading-snug line-clamp-2">{p.caption || "No caption"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {p.views > 0 && <span className="text-[10px] text-white/30">{fmt(p.views)} views</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{p.type}</span>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-white/25 hover:text-white/50 flex items-center gap-0.5 transition-colors">
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {c.success && c.newPosts.length === 0 && (
                <p className="text-[10px] text-white/20 text-center py-1">No new posts since last scan</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        {result.ideasGenerated > 0 && (
          <div className="px-5 pb-5 pt-3 border-t border-white/8 shrink-0">
            <p className="text-[11px] text-center" style={{ color: `${GOLD}90` }}>
              ✨ {result.ideasGenerated} fresh ideas generated from this scan — scroll up to see them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentIntelHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [developingId, setDevelopingId] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [scriptIdea, setScriptIdea] = useState<ContentIdea | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<HubData>({
    queryKey: ["/api/content-intel/today"],
    refetchOnWindowFocus: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/content-intel/generate"),
    onSuccess: (res: any) => {
      toast({ title: `✨ ${res.ideas?.length || 0} ideas generated from competitor data` });
      queryClient.invalidateQueries({ queryKey: ["/api/content-intel/today"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Generation failed", variant: "destructive" });
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/content-intel/scan-now"),
    onSuccess: (res: any) => {
      setScanResult(res);
      toast({ title: `Scan done · ${res.totalNew} new posts · ${res.totalViral} viral`, description: res.ideasGenerated > 0 ? `${res.ideasGenerated} fresh ideas generated` : undefined });
      queryClient.invalidateQueries({ queryKey: ["/api/content-intel/today"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Scan failed", variant: "destructive" });
    },
  });

  const developIdea = async (idea: ContentIdea) => {
    setDevelopingId(idea.id);
    try {
      const result: any = await apiRequest("POST", `/api/content-intel/ideas/${idea.id}/develop`);
      setScript(result.script);
      setScriptIdea(idea);
      queryClient.invalidateQueries({ queryKey: ["/api/content-intel/today"] });
    } catch (err: any) {
      toast({ title: err.message || "Script build failed. Try again.", variant: "destructive" });
    } finally {
      setDevelopingId(null);
    }
  };

  const ideas = data?.ideas || [];
  const signals = data?.signals || [];
  const profile = data?.profile;
  const watchlistCount = data?.watchlistCount ?? 0;

  // Flow state
  const step1 = watchlistCount > 0;
  const step2 = !!profile?.niche;
  const step3 = ideas.length > 0;
  const step4 = ideas.some(i => i.status === "drafted");

  // "Your next action" config
  const getNextAction = (): NextActionConfig => {
    if (!step1) return {
      emoji: "👥",
      title: "Start by adding competitors to track",
      desc: "Add 2–3 Instagram handles you want to learn from. We scan their posts daily and use them to generate content ideas specifically for you.",
      buttonLabel: "Add Competitors",
      buttonAction: () => navigate("/tracking/competitor"),
      variant: "gold",
    };
    if (!step2) return {
      emoji: "🎯",
      title: "Tell us your niche so ideas feel personal",
      desc: "Without a profile, the AI generates generic ideas. Take 30 seconds to set your niche, goal, and style — then every idea is built for your audience.",
      buttonLabel: "Set My Profile",
      buttonAction: () => navigate("/ai-coach"),
      variant: "gold",
    };
    if (!step3) return {
      emoji: "✨",
      title: "Your competitors were scanned — generate your ideas now",
      desc: "We have fresh data from your competitor accounts. Click to generate 3 content ideas tailored to your niche. Ideas also auto-generate at 9AM every day.",
      buttonLabel: "Generate Ideas (5 credits)",
      buttonAction: () => generateMutation.mutate(),
      loading: generateMutation.isPending,
      variant: "gold",
    };
    if (!step4) return {
      emoji: "👆",
      title: "Pick an idea and turn it into a full script",
      desc: "Choose whichever idea matches your energy today, then click 'Make Script'. The AI writes the full thing in under 10 seconds.",
      variant: "blue",
    };
    return {
      emoji: "🚀",
      title: "Script done — now get it scored and refined",
      desc: "Send your script to the AI Coach to get a hook score, clarity rating, and a viral rewrite suggestion based on what's working in your niche.",
      buttonLabel: "Open AI Coach",
      buttonAction: () => navigate("/ai-coach"),
      variant: "green",
    };
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#d4b461]/15 flex items-center justify-center">
                <Flame className="w-4.5 h-4.5 text-[#d4b461]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Daily Intel Hub</h1>
                <p className="text-[10px] text-white/30">Competitor signals → ideas → script → coach</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHowItWorks(v => !v)}
                className="h-8 px-2.5 rounded-lg border border-white/10 hover:border-white/20 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                How it works
              </button>
              <button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending || !step1}
                title="Scan all competitors now"
                className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  borderColor: scanMutation.isPending ? `${GOLD}40` : `${GOLD}30`,
                  background: scanMutation.isPending ? `${GOLD}15` : `${GOLD}08`,
                  color: scanMutation.isPending ? GOLD : `${GOLD}90`,
                }}
              >
                <Radar className={`w-3.5 h-3.5 ${scanMutation.isPending ? "animate-pulse" : ""}`} />
                {scanMutation.isPending ? "Scanning…" : "Scan Now"}
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 w-8 rounded-lg border border-white/10 hover:border-white/20 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* ── How it works (collapsible) ─────────────────────────────────── */}
          {showHowItWorks && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-5 mb-5">
              <p className="text-xs font-black text-white/40 tracking-widest mb-4">HOW THE DAILY PIPELINE WORKS</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { time: "8:00 AM", icon: "👥", label: "Competitor scan", desc: "We scrape posts from every account you track" },
                  { time: "9:00 AM", icon: "🧠", label: "AI analyzes", desc: "Extracts patterns, hooks, and engagement signals" },
                  { time: "9:05 AM", icon: "✨", label: "3 ideas generated", desc: "Personalized to your niche, goal, and style" },
                  { time: "You", icon: "🎬", label: "Script + refine", desc: "Turn any idea into a script and score it in Coach" },
                ].map(({ time, icon, label, desc }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-[#d4b461]/60 tracking-widest">{time}</span>
                    <div className="text-xl">{icon}</div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-[10px] text-white/35 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 4-step progress tracker ────────────────────────────────────── */}
          <FlowTracker step1={step1} step2={step2} step3={step3} step4={step4} />

          {/* ── Your Next Action banner ────────────────────────────────────── */}
          {!isLoading && <NextActionBanner config={getNextAction()} />}

          {/* ── Loading skeletons ─────────────────────────────────────────── */}
          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-white/4 animate-pulse" />
                ))}
              </div>
              <div className="lg:col-span-2 flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-52 rounded-2xl bg-white/4 animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* ── Active layout ─────────────────────────────────────────────── */}
          {!isLoading && (step1 || signals.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Left: Competitor signals */}
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-white/35 tracking-widest">
                    COMPETITOR SIGNALS
                  </p>
                  <button
                    onClick={() => navigate("/tracking/competitor")}
                    className="text-[10px] text-[#d4b461]/50 hover:text-[#d4b461] flex items-center gap-1 transition-colors"
                  >
                    Manage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-1 mb-4">
                  {signals.length > 0
                    ? signals.slice(0, 5).map(s => <SignalRow key={s.id} signal={s} />)
                    : (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-xs text-white/20">No signals yet</p>
                        <p className="text-[10px] text-white/15">Hit "Scan Now" to pull data right now, or wait for the 8AM auto-scan</p>
                      </div>
                    )
                  }
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
                    <p className="text-xl font-black text-white">{watchlistCount}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">TRACKED</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
                    <p className="text-xl font-black" style={{ color: GOLD }}>{ideas.length}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">IDEAS TODAY</p>
                  </div>
                </div>
              </div>

              {/* Right: Ideas */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-white/35 tracking-widest">TODAY'S IDEAS</p>
                  <button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending || !step1}
                    className="flex items-center gap-1.5 text-[10px] text-[#d4b461]/60 hover:text-[#d4b461] disabled:opacity-40 transition-colors"
                  >
                    {generateMutation.isPending
                      ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</>
                      : <><Zap className="w-3 h-3" />Generate new (5 cr)</>
                    }
                  </button>
                </div>

                {ideas.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {ideas.map((idea, i) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        index={i}
                        onDevelop={developIdea}
                        developing={developingId === idea.id}
                        isActive={scriptIdea?.id === idea.id}
                      />
                    ))}
                  </div>
                ) : step1 && step2 ? (
                  /* Has setup but no ideas yet */
                  <div className="rounded-2xl border border-white/8 bg-white/3 py-16 flex flex-col items-center gap-5 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#d4b461]/10 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#d4b461]" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white mb-1">No ideas yet for today</p>
                      <p className="text-xs text-white/35 max-w-xs mx-auto leading-relaxed">
                        Ideas auto-generate at 9AM from your competitor data.<br />
                        Or generate them right now — costs 5 credits.
                      </p>
                    </div>
                    <Button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                      className="h-10 text-sm font-bold"
                      style={{ background: GOLD, color: "#000" }}
                    >
                      {generateMutation.isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                        : <><Sparkles className="w-4 h-4 mr-2" />Generate Now</>
                      }
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Script Slide-Over ─────────────────────────────────────────────── */}
      {script && scriptIdea && (
        <ScriptOverlay
          script={script}
          idea={scriptIdea}
          onClose={() => { setScript(null); setScriptIdea(null); }}
        />
      )}

      {/* ── Scan Result Sheet ─────────────────────────────────────────────── */}
      {scanResult && (
        <ScanResultSheet
          result={scanResult}
          onClose={() => setScanResult(null)}
        />
      )}
    </ClientLayout>
  );
}
