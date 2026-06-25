import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, X, Eye, Heart, MessageCircle, ExternalLink,
  Lightbulb, Brain, Play, Image, Layers, ChevronRight,
  CheckCheck, TrendingUp, AlertCircle, Flame, PenSquare,
  Copy, Check,
} from "lucide-react";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
  });
  return r.ok ? r.json() : null;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PostTypeChip({ type }: { type: string }) {
  const t = (type || "post").toLowerCase();
  if (t === "reel") return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
      <Play className="w-2.5 h-2.5" /> REEL
    </span>
  );
  if (t === "carousel") return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
      <Layers className="w-2.5 h-2.5" /> CAROUSEL
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-muted text-muted-foreground border border-border">
      <Image className="w-2.5 h-2.5" /> POST
    </span>
  );
}

function ViralityBar({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function HandleAvatar({ handle }: { handle: string }) {
  const initials = handle.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "??";
  const hue = handle.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black text-white select-none"
      style={{ background: `hsl(${hue}, 55%, 38%)` }}
    >
      {initials}
    </div>
  );
}

export default function CompetitorActivityBell() {
  const [open, setOpen] = useState(false);
  const [expandedScript, setExpandedScript] = useState<Record<string, string>>({});
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/competitor/feed/unseen-count"],
    queryFn: () => apiFetch("/api/competitor/feed/unseen-count"),
    refetchInterval: 90000,
  });

  const { data: feed = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/competitor/feed"],
    queryFn: () => apiFetch("/api/competitor/feed"),
    enabled: open,
  });

  const markSeenMut = useMutation({
    mutationFn: () => apiFetch("/api/competitor/feed/mark-seen", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/competitor/feed/unseen-count"] });
      qc.invalidateQueries({ queryKey: ["/api/competitor/feed"] });
    },
  });

  const analyzeMut = useMutation({
    mutationFn: (postId: string) => apiFetch(`/api/competitor/feed/${postId}/analyze`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/competitor/feed"] }),
  });

  const ideasMut = useMutation({
    mutationFn: (postId: string) => apiFetch(`/api/competitor/feed/${postId}/generate-ideas`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/competitor/feed"] });
      qc.invalidateQueries({ queryKey: ["/api/competitor/ideas"] });
    },
  });

  const writeMut = useMutation({
    mutationFn: (postId: string) => apiFetch(`/api/competitor/feed/${postId}/write-my-version`, { method: "POST" }),
    onSuccess: (data: any, postId: string) => {
      if (data?.script) setExpandedScript(prev => ({ ...prev, [postId]: data.script }));
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unseenCount = countData?.count ?? 0;

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unseenCount > 0) {
      setTimeout(() => markSeenMut.mutate(), 2000);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors group"
        title="Competitor Activity"
      >
        <Zap className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <AnimatePresence>
          {unseenCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-black text-white"
            >
              {unseenCount > 9 ? "9+" : unseenCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: -12, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute top-0 left-10 z-[200] w-96 max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,180,97,0.08)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-black text-foreground tracking-tight">Competitor Activity</p>
                  <p className="text-[9px] text-muted-foreground">Auto-scanned every 2 hours</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {feed.length > 0 && (
                  <button
                    onClick={() => markSeenMut.mutate()}
                    className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all seen
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-muted/40 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 bg-muted/40 rounded w-3/4" />
                        <div className="h-2 bg-muted/30 rounded w-full" />
                        <div className="h-2 bg-muted/30 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/20 border border-border flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5 text-muted-foreground opacity-40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">No activity yet</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Add competitors to your Watchlist. New posts appear here within 2 hours of posting.</p>
                  <a href="/tracking/competitor" className="mt-3 flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Go to Watchlist <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {feed.map((post: any) => {
                    const analysis = post.aiAnalysis as any;
                    const isNew = !post.isSeen;
                    const isAnalyzing = analyzeMut.isPending && analyzeMut.variables === post.id;
                    const isGenerating = ideasMut.isPending && ideasMut.variables === post.id;
                    const isWriting = writeMut.isPending && writeMut.variables === post.id;
                    const viralSpike = analysis?.viralSpike === true;
                    const script = expandedScript[post.id];

                    return (
                      <motion.div
                        key={post.id}
                        initial={isNew ? { backgroundColor: "rgba(212,180,97,0.04)" } : {}}
                        animate={{ backgroundColor: "transparent" }}
                        transition={{ duration: 3 }}
                        className={`p-4 hover:bg-muted/5 transition-colors ${viralSpike ? "border-l-2 border-orange-500/60" : ""}`}
                      >
                        {/* Viral spike banner */}
                        {viralSpike && (
                          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />
                            <span className="text-[9px] font-bold text-orange-300 uppercase tracking-wider">
                              VIRAL SPIKE — {analysis.viewsAtDetection ? `${Math.round((analysis.viewsAtSpike || 0) / (analysis.viewsAtDetection || 1))}x growth` : "exploding"}
                            </span>
                          </div>
                        )}

                        {/* Row 1: avatar + handle + type + time */}
                        <div className="flex items-start gap-3 mb-3">
                          <HandleAvatar handle={post.handle} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {isNew && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                              <span className="text-xs font-bold text-foreground">@{post.handle}</span>
                              <PostTypeChip type={post.postType} />
                              <span className="text-[9px] text-muted-foreground ml-auto">{timeAgo(post.detectedAt)}</span>
                            </div>
                            {/* Caption preview */}
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {post.caption || <span className="italic">No caption</span>}
                            </p>
                          </div>
                        </div>

                        {/* Metrics row */}
                        <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post.views ?? 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{(post.likes ?? 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{(post.comments ?? 0).toLocaleString()}</span>
                          {post.postUrl && (
                            <a href={post.postUrl} target="_blank" rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-0.5 text-primary hover:underline">
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        {/* AI Analysis card */}
                        {analysis ? (
                          <div className="bg-muted/10 border border-border rounded-xl p-3 mb-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {analysis.hookType && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-bold uppercase tracking-wider">
                                  {analysis.hookType}
                                </span>
                              )}
                              {analysis.emotion && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-medium">
                                  {analysis.emotion}
                                </span>
                              )}
                            </div>
                            {analysis.hook && (
                              <p className="text-[10px] text-foreground leading-relaxed">
                                <span className="text-primary font-bold">Hook:</span> {analysis.hook}
                              </p>
                            )}
                            {typeof analysis.viralityScore === "number" && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Virality</span>
                                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                                </div>
                                <ViralityBar score={analysis.viralityScore} />
                              </div>
                            )}
                            {analysis.whatToSteal && (
                              <div className="bg-primary/5 border border-primary/15 rounded-lg p-2">
                                <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">Steal this</p>
                                <p className="text-[10px] text-foreground leading-relaxed">{analysis.whatToSteal}</p>
                              </div>
                            )}
                            {analysis.suggestedAngle && (
                              <p className="text-[10px] text-emerald-400 leading-relaxed">
                                💡 <span className="font-medium">Your angle:</span> {analysis.suggestedAngle}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-muted/5 border border-dashed border-border">
                            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-[10px] text-muted-foreground">AI analysis pending — click Analyze to get intel</p>
                          </div>
                        )}

                        {/* Write My Version script */}
                        {script && (
                          <div className="mb-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-500/15">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Your Script</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(script);
                                  setCopiedScript(post.id);
                                  setTimeout(() => setCopiedScript(null), 2000);
                                }}
                                className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-300"
                              >
                                {copiedScript === post.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedScript === post.id ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <pre className="text-[10px] text-foreground/80 leading-relaxed p-3 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                              {script}
                            </pre>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => analyzeMut.mutate(post.id)}
                            disabled={isAnalyzing}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                <Brain className="w-3 h-3" />
                              </motion.div>
                            ) : <Brain className="w-3 h-3" />}
                            {analysis ? "Re-analyze" : "Analyze"}
                          </button>
                          <button
                            onClick={() => ideasMut.mutate(post.id)}
                            disabled={isGenerating}
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors disabled:opacity-50 ${post.ideasGenerated ? "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border border-violet-500/30 text-violet-400 hover:bg-violet-500/10"}`}
                          >
                            {isGenerating ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                <Lightbulb className="w-3 h-3" />
                              </motion.div>
                            ) : <Lightbulb className="w-3 h-3" />}
                            {post.ideasGenerated ? "Ideas ✓" : "Ideas"}
                          </button>
                          <button
                            onClick={() => script
                              ? setExpandedScript(prev => { const n = { ...prev }; delete n[post.id]; return n; })
                              : writeMut.mutate(post.id)
                            }
                            disabled={isWriting}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-50"
                          >
                            {isWriting ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                <PenSquare className="w-3 h-3" />
                              </motion.div>
                            ) : <PenSquare className="w-3 h-3" />}
                            {script ? "Hide" : "Write"}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {feed.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-muted/5 flex-shrink-0">
                <a href="/tracking/competitor" className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium">
                  Open Intelligence Feed <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
