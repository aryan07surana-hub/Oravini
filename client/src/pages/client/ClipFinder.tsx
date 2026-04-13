import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Scissors, Play, Copy, Check, Loader2, ExternalLink,
  Sparkles, Youtube, TrendingUp, Clock, Zap, ChevronRight,
  Film, AlertCircle,
} from "lucide-react";

type Clip = {
  id: number;
  title: string;
  startSeconds: number;
  endSeconds: number;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  hook: string;
  whyViral: string;
  viralityScore: number;
  category: string;
};

type Result = {
  videoId: string;
  title: string;
  duration: number;
  clips: Clip[];
};

const LOADING_MSGS = [
  "Fetching transcript from YouTube…",
  "Reading through the entire video…",
  "Identifying high-engagement moments…",
  "Scoring each clip for virality…",
  "Ranking the best moments…",
  "Packaging your clips…",
];

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  emotional:    { label: "Emotional",    color: "text-pink-400 bg-pink-500/10 border-pink-500/25" },
  funny:        { label: "Funny 😂",     color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" },
  quotable:     { label: "Quotable 💬",  color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
  educational:  { label: "Educational",  color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" },
  shocking:     { label: "Shocking 😱",  color: "text-red-400 bg-red-500/10 border-red-500/25" },
  inspiring:    { label: "Inspiring ✨", color: "text-green-400 bg-green-500/10 border-green-500/25" },
  storytelling: { label: "Story Arc",    color: "text-purple-400 bg-purple-500/10 border-purple-500/25" },
  engaging:     { label: "Engaging",     color: "text-primary bg-primary/10 border-primary/25" },
  controversial:{ label: "Bold 🔥",      color: "text-orange-400 bg-orange-500/10 border-orange-500/25" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#d4b461" : "#f97316";
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy hook" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/10">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function ClipFinder() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/clip-finder", { url }),
    onMutate: () => {
      setMsgIdx(0);
      timerRef.current = setInterval(() => {
        setMsgIdx(p => (p < LOADING_MSGS.length - 1 ? p + 1 : p));
      }, 3000);
    },
    onSuccess: (data: Result) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResult(data);
    },
    onError: (err: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const isPending = mutation.isPending;

  const ytUrl = (videoId: string, startSeconds: number) =>
    `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`;

  return (
    <ClientLayout>
      <div className="flex flex-col min-h-screen">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 flex-1">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Clip Finder</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Paste any YouTube video — AI finds the best moments to clip for Reels &amp; TikTok
                </p>
              </div>
            </div>
          </div>

          {/* Input section */}
          <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm font-bold text-foreground">Paste a YouTube URL</p>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isPending && url.trim() && mutation.mutate()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 h-11 bg-muted/10 border-zinc-700/60 text-sm"
                data-testid="input-youtube-url"
              />
              <Button
                onClick={() => mutation.mutate()}
                disabled={isPending || !url.trim()}
                className="bg-primary text-black hover:bg-primary/90 font-black gap-2 h-11 px-6 flex-shrink-0"
                data-testid="btn-find-clips"
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
                  : <><Scissors className="w-4 h-4" /> Find Best Clips</>
                }
              </Button>
            </div>

            {/* Tips */}
            <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/15 rounded-xl">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Works best with videos that have <span className="text-foreground font-semibold">auto-generated or manual subtitles</span>. 
                Podcasts, interviews, tutorials, vlogs, and talks work great. Takes ~20–40 seconds.
              </p>
            </div>
          </div>

          {/* Loading state */}
          {isPending && (
            <div className="bg-card border border-primary/20 rounded-2xl p-12 flex flex-col items-center text-center space-y-5">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Scissors className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-base font-black text-foreground">Finding your best clips…</p>
                <p className="text-sm text-muted-foreground min-h-[20px] transition-all duration-500">
                  {LOADING_MSGS[msgIdx]}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {LOADING_MSGS.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-500 ${i === msgIdx ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-zinc-700"}`} />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !isPending && (
            <div className="space-y-5">
              {/* Video info bar */}
              <div className="flex items-center gap-4 p-4 bg-card border border-card-border rounded-2xl flex-wrap">
                <img
                  src={`https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`}
                  alt={result.title}
                  className="w-28 h-16 rounded-xl object-cover flex-shrink-0 border border-zinc-700/40"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground line-clamp-2">{result.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {Math.floor(result.duration / 60)}m {result.duration % 60}s
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-primary font-bold">
                      <Scissors className="w-3 h-3" />
                      {result.clips.length} clips found
                    </span>
                  </div>
                </div>
                <a
                  href={`https://youtube.com/watch?v=${result.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open video
                </a>
              </div>

              {/* Stat row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Scissors, label: "Clips Found",    value: result.clips.length,           color: "text-primary" },
                  { icon: TrendingUp, label: "Avg Virality", value: `${Math.round(result.clips.reduce((a, c) => a + c.viralityScore, 0) / result.clips.length)}%`, color: "text-green-400" },
                  { icon: Clock, label: "Total Content",     value: `${result.clips.reduce((a, c) => a + parseInt(c.durationLabel), 0)}s`, color: "text-blue-400" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-card border border-card-border rounded-xl p-3.5 text-center">
                    <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
                    <p className="text-base font-black text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Clip cards */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Best Moments to Clip
                </p>
                {result.clips.map((clip) => {
                  const cat = CATEGORY_STYLES[clip.category] || CATEGORY_STYLES.engaging;
                  return (
                    <div
                      key={clip.id}
                      data-testid={`clip-card-${clip.id}`}
                      className="bg-card border border-card-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-200 group"
                    >
                      {/* Thumbnail strip + score */}
                      <div className="relative h-36 overflow-hidden bg-zinc-900">
                        <img
                          src={`https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`}
                          alt={clip.title}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity scale-105"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Clip number */}
                        <div className="absolute top-3 left-3">
                          <span className="w-7 h-7 rounded-full bg-primary text-black text-[11px] font-black flex items-center justify-center shadow-lg">
                            {clip.id}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="absolute top-2 right-3">
                          <ScoreRing score={clip.viralityScore} />
                        </div>

                        {/* Timestamp + duration at bottom */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/15">
                            <Play className="w-3 h-3 fill-white" />
                            {clip.startLabel} – {clip.endLabel}
                          </span>
                          <span className="text-[10px] font-bold text-primary bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-full">
                            {clip.durationLabel}
                          </span>
                        </div>

                        {/* Category */}
                        <div className="absolute bottom-3 right-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                            {cat.label}
                          </span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="text-sm font-black text-foreground mb-1">{clip.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{clip.whyViral}</p>
                        </div>

                        {/* Hook box */}
                        {clip.hook && (
                          <div className="relative p-3 bg-primary/5 border border-primary/15 rounded-xl">
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-1">Caption Hook</p>
                            <p className="text-xs text-foreground leading-relaxed pr-12">"{clip.hook}"</p>
                            <div className="absolute top-2.5 right-2.5">
                              <CopyButton text={clip.hook} label="Copy" />
                            </div>
                          </div>
                        )}

                        {/* Action row */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <a
                            href={ytUrl(result.videoId, clip.startSeconds)}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`btn-watch-clip-${clip.id}`}
                          >
                            <Button size="sm" className="bg-primary text-black hover:bg-primary/90 gap-1.5 font-bold text-xs h-8">
                              <Play className="w-3 h-3 fill-black" /> Watch Clip
                            </Button>
                          </a>
                          <CopyButton text={`${clip.startLabel} – ${clip.endLabel}`} label="Copy timestamp" />
                          <div className="ml-auto">
                            <a
                              href={`/video-editor?url=https://youtube.com/watch?v=${result.videoId}&t=${clip.startSeconds}s`}
                              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Film className="w-3 h-3" /> Analyse in Editor
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Re-analyse CTA */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setResult(null); setUrl(""); }}
                  className="border-zinc-700/60 text-muted-foreground hover:text-foreground gap-2"
                  data-testid="btn-analyse-another"
                >
                  <Scissors className="w-4 h-4" /> Analyse another video
                </Button>
              </div>
            </div>
          )}

          {/* Empty state (no result, not loading) */}
          {!result && !isPending && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Zap, title: "Paste & Go",     desc: "Drop any YouTube URL — no account linking needed" },
                { icon: TrendingUp, title: "AI-Ranked",  desc: "Each clip is scored for virality, emotion, and shareability" },
                { icon: Film, title: "Jump to It",    desc: "Click 'Watch Clip' to open YouTube at the exact second" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-card border border-card-border rounded-2xl p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </ClientLayout>
  );
}
