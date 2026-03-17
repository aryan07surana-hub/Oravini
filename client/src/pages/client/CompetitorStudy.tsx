import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Instagram, Eye, Heart, MessageCircle, TrendingUp, TrendingDown,
  Sparkles, Loader2, Trash2, ChevronRight, Target, Zap, AlertTriangle,
  BarChart2, Clock, Star, CheckCircle, XCircle, ArrowRight, Users, RefreshCw,
  Lightbulb, BookOpen, Calendar, Flame, Shield, Trophy, Copy, Check,
  AlertCircle, Award, ArrowUpRight, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

const HOOK_COLORS: Record<string, string> = {
  curiosity: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  storytelling: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  authority: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  controversy: "bg-red-500/15 text-red-300 border-red-500/30",
  "pain-point": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  education: "bg-green-500/15 text-green-300 border-green-500/30",
};

const IMPACT_COLORS: Record<string, string> = {
  High: "bg-red-500/15 text-red-300 border-red-500/30",
  Medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Low: "bg-green-500/15 text-green-300 border-green-500/30",
};

const RETENTION_COLORS: Record<string, string> = {
  "Very High": "text-green-400",
  High: "text-primary",
  Medium: "text-yellow-400",
  Low: "text-red-400",
};

function Pill({ text, map = HOOK_COLORS }: { text: string; map?: Record<string, string> }) {
  const cls = map[text?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls} capitalize`}>{text}</span>;
}

function StatBox({ label, val, sub, accent }: { label: string; val: any; sub?: string; accent?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${accent ?? "text-foreground"}`}>{typeof val === "number" ? val.toLocaleString() : val ?? "—"}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function VsRow({ label, user, competitor, better }: { label: string; user: any; competitor: any; better?: "user" | "competitor" | "tie" }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-semibold flex-1 ${better === "user" ? "text-green-400" : "text-foreground"}`}>{typeof user === "number" ? user.toLocaleString() : user ?? "—"}</span>
      <span className="text-xs text-muted-foreground">vs</span>
      <span className={`text-sm font-semibold flex-1 text-right ${better === "competitor" ? "text-red-400" : "text-foreground"}`}>{typeof competitor === "number" ? competitor.toLocaleString() : competitor ?? "—"}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Tab: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ report, analysis }: { report: any; analysis: any }) {
  const cm = report.clientMetrics;
  const comp = report.competitorMetrics;
  const ov = report.overview;
  const assessment = ov?.assessment ?? "competitive";
  const assessStyle = assessment === "winning" ? "text-green-400 bg-green-500/10 border-green-500/30"
    : assessment === "losing" ? "text-red-400 bg-red-500/10 border-red-500/30"
    : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  const AssessIcon = assessment === "winning" ? TrendingUp : assessment === "losing" ? TrendingDown : BarChart2;

  return (
    <div className="space-y-5">
      {/* Assessment banner */}
      <div className={`flex items-center gap-4 p-5 rounded-2xl border ${assessStyle}`}>
        <div className="w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0">
          <AssessIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-base capitalize">{assessment === "losing" ? "Needs Work" : assessment}</p>
            {(ov?.outperformingIn || []).map((area: string) => (
              <Badge key={area} variant="outline" className="text-[10px] border-current/30">{area}</Badge>
            ))}
          </div>
          <p className="text-sm opacity-80 leading-relaxed">{ov?.summary}</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">You — {analysis.clientHandle}</p>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total Posts" val={cm?.totalPosts} />
            <StatBox label="Avg Views" val={cm?.avgViews} accent="text-blue-400" />
            <StatBox label="Avg Likes" val={cm?.avgLikes} accent="text-pink-400" />
            <StatBox label="Avg Comments" val={cm?.avgComments} />
            <StatBox label="Engagement %" val={`${cm?.avgEngagementRate ?? 0}%`} accent="text-green-400" />
            <StatBox label="Posts/Week" val={cm?.postsPerWeek} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Competitor — {analysis.competitorHandle}</p>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total Posts" val={comp?.totalPosts} />
            <StatBox label="Avg Views" val={comp?.avgViews} accent="text-blue-400" />
            <StatBox label="Avg Likes" val={comp?.avgLikes} accent="text-pink-400" />
            <StatBox label="Avg Comments" val={comp?.avgComments} />
            <StatBox label="Engagement %" val={`${comp?.avgEngagementRate ?? 0}%`} accent="text-green-400" />
            <StatBox label="Posts/Week" val={comp?.postsPerWeek} />
          </div>
        </div>
      </div>

      {/* Content type breakdown */}
      {(cm?.contentTypes || comp?.contentTypes) && (
        <div className="grid grid-cols-2 gap-3">
          {[{ label: `You — ${analysis.clientHandle}`, types: cm?.contentTypes }, { label: `Competitor — ${analysis.competitorHandle}`, types: comp?.contentTypes }].map(({ label, types }) => (
            <div key={label} className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-3">{label}</p>
              {Object.entries(types || {}).map(([type, count]: any) => (
                <div key={type} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-foreground w-16">{type}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (count / (cm?.totalPosts || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-4">{count}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Reel-by-Reel ──────────────────────────────────────────────────────

function ReelByReelTab({ report, analysis }: { report: any; analysis: any }) {
  const comparisons = report.reelComparison || [];
  if (!comparisons.length) return <EmptyState message="No reel comparison data available. Run a new analysis." />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Deep dive into each reel — hooks, structure, emotion, and why it performed the way it did.</p>
      {comparisons.map((pair: any, i: number) => {
        const ur = pair.userReel;
        const cr = pair.competitorReel;
        const userWins = (ur?.views ?? 0) >= (cr?.views ?? 0);
        return (
          <div key={i} className="border border-border rounded-2xl overflow-hidden">
            <div className="bg-muted/20 px-4 py-2 flex items-center justify-between border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground">Comparison #{i + 1}</span>
              {userWins ? (
                <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-[10px] border">You Win</Badge>
              ) : (
                <Badge className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px] border">Competitor Wins</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              {/* User reel */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary">{analysis.clientHandle}</span>
                </div>
                <div className="flex gap-4">
                  <div className="text-center"><p className="text-sm font-bold text-blue-400">{(ur?.views ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-pink-400">{(ur?.likes ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-foreground">{(ur?.comments ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Comments</p></div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                  <p className="text-xs text-foreground italic leading-relaxed">"{ur?.hook}"</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Pill text={ur?.hookType} />
                    <Pill text={ur?.emotion ?? "—"} map={{}} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Structure</p>
                  <p className="text-xs text-foreground leading-relaxed">{ur?.structure}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Retention:</span>
                  <span className={`text-[10px] font-bold ${RETENTION_COLORS[ur?.retentionPotential] ?? "text-muted-foreground"}`}>{ur?.retentionPotential}</span>
                </div>
                {ur?.caption && <p className="text-[10px] text-muted-foreground line-clamp-2 italic">"{ur.caption}"</p>}
              </div>

              {/* Competitor reel */}
              <div className="p-4 space-y-3 bg-red-500/3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-red-400">{analysis.competitorHandle}</span>
                </div>
                <div className="flex gap-4">
                  <div className="text-center"><p className="text-sm font-bold text-blue-400">{(cr?.views ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-pink-400">{(cr?.likes ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-foreground">{(cr?.comments ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Comments</p></div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                  <p className="text-xs text-foreground italic leading-relaxed">"{cr?.hook}"</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Pill text={cr?.hookType} />
                    <Pill text={cr?.emotion ?? "—"} map={{}} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Structure</p>
                  <p className="text-xs text-foreground leading-relaxed">{cr?.structure}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Retention:</span>
                  <span className={`text-[10px] font-bold ${RETENTION_COLORS[cr?.retentionPotential] ?? "text-muted-foreground"}`}>{cr?.retentionPotential}</span>
                </div>
                {cr?.caption && <p className="text-[10px] text-muted-foreground line-clamp-2 italic">"{cr.caption}"</p>}
              </div>
            </div>

            {/* Verdict */}
            <div className="px-4 py-3 bg-primary/5 border-t border-border">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">AI Verdict</p>
              <p className="text-xs text-foreground leading-relaxed">{pair.verdict}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Content Performance ────────────────────────────────────────────────

function ContentPerformanceTab({ report, analysis }: { report: any; analysis: any }) {
  const cp = report.contentPerformance;
  const cm = report.clientMetrics;
  const comp = report.competitorMetrics;

  return (
    <div className="space-y-5">
      {cp?.competitorWinsIn?.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Competitor Wins In</p>
          <div className="flex flex-wrap gap-2">{(cp.competitorWinsIn || []).map((w: string) => <Badge key={w} className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">{w}</Badge>)}</div>
        </div>
      )}
      {cp?.clientWinsIn?.length > 0 && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">You Win In</p>
          <div className="flex flex-wrap gap-2">{(cp.clientWinsIn || []).map((w: string) => <Badge key={w} className="bg-green-500/15 text-green-300 border border-green-500/30 text-xs">{w}</Badge>)}</div>
        </div>
      )}
      {cp?.insights && (
        <div className="p-4 rounded-xl bg-card border border-card-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">AI Insights</p>
          <p className="text-sm text-foreground leading-relaxed">{cp.insights}</p>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Head-to-Head Metrics</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-primary">{analysis.clientHandle}</span>
          <span className="text-xs font-bold text-red-400">{analysis.competitorHandle}</span>
        </div>
        <VsRow label="Avg Views" user={cm?.avgViews} competitor={comp?.avgViews} better={cm?.avgViews >= comp?.avgViews ? "user" : "competitor"} />
        <VsRow label="Avg Likes" user={cm?.avgLikes} competitor={comp?.avgLikes} better={cm?.avgLikes >= comp?.avgLikes ? "user" : "competitor"} />
        <VsRow label="Avg Comments" user={cm?.avgComments} competitor={comp?.avgComments} better={cm?.avgComments >= comp?.avgComments ? "user" : "competitor"} />
        <VsRow label="Engagement %" user={`${cm?.avgEngagementRate}%`} competitor={`${comp?.avgEngagementRate}%`} better={cm?.avgEngagementRate >= comp?.avgEngagementRate ? "user" : "competitor"} />
        <VsRow label="Posts/Week" user={cm?.postsPerWeek} competitor={comp?.postsPerWeek} better={cm?.postsPerWeek >= comp?.postsPerWeek ? "user" : "competitor"} />
      </div>
    </div>
  );
}

// ─── Tab: AI Patterns ────────────────────────────────────────────────────────

function AIPatternsTab({ report }: { report: any }) {
  const patterns = report.contentPatterns || [];
  const viralDNA = report.viralDNA || [];

  return (
    <div className="space-y-6">
      {/* Content Patterns */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400" /> Content Patterns Detected</p>
        <div className="grid grid-cols-1 gap-3">
          {patterns.map((p: any, i: number) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-semibold text-foreground">{p.pattern}</p>
                <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex-shrink-0">{p.frequency}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{p.description}</p>
              <div className="bg-primary/8 border border-primary/20 rounded-lg px-3 py-2">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-0.5">How to Replicate</p>
                <p className="text-xs text-foreground">{p.howToReplicate}</p>
              </div>
            </div>
          ))}
          {!patterns.length && <EmptyState message="No pattern data. Run a new analysis." />}
        </div>
      </div>

      {/* Viral DNA */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Viral Content DNA — Top Posts Breakdown</p>
        <div className="space-y-3">
          {viralDNA.map((v: any, i: number) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-orange-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-orange-400">#{i + 1}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{(v.views ?? 0).toLocaleString()} views</span>
                  <Pill text={v.emotion ?? "—"} map={{}} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hook</p>
                  <p className="text-xs text-foreground italic leading-relaxed">"{v.hook}"</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CTA Used</p>
                  <p className="text-xs text-foreground">{v.cta}</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Structure</p>
                <p className="text-xs text-foreground leading-relaxed">{v.structure}</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-0.5">Winning Formula</p>
                <p className="text-xs text-foreground">{v.winningFormula}</p>
              </div>
            </div>
          ))}
          {!viralDNA.length && <EmptyState message="No viral DNA data. Run a new analysis." />}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Gap Analysis ───────────────────────────────────────────────────────

function GapAnalysisTab({ report }: { report: any }) {
  const ga = report.gapAnalysis;
  const gaps = ga?.gaps || [];

  return (
    <div className="space-y-4">
      {ga?.summary && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">Bottom Line</p>
          <p className="text-sm text-foreground leading-relaxed">{ga.summary}</p>
        </div>
      )}
      <div className="space-y-3">
        {gaps.map((g: any, i: number) => (
          <div key={i} className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm font-semibold text-foreground">{g.metric}</p>
              <Pill text={g.impact} map={IMPACT_COLORS} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-0.5">They Do</p>
                <p className="text-xs text-foreground">{g.competitor}</p>
              </div>
              <div className="bg-muted/40 border border-border rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">You Do</p>
                <p className="text-xs text-foreground">{g.you}</p>
              </div>
            </div>
            <div className="bg-primary/8 border border-primary/20 rounded-lg px-3 py-2">
              <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-0.5">How to Fix</p>
              <p className="text-xs text-foreground">{g.fix}</p>
            </div>
          </div>
        ))}
        {!gaps.length && <EmptyState message="No gap data. Run a new analysis." />}
      </div>
    </div>
  );
}

// ─── Tab: Hook Library ───────────────────────────────────────────────────────

function HookLibraryTab({ report }: { report: any }) {
  const hooks = report.hookLibrary || [];
  const grouped: Record<string, any[]> = {};
  hooks.forEach((h: any) => {
    const key = h.type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Extracted directly from competitor's best-performing content. Copy and adapt these for your posts.</p>
      {Object.entries(grouped).map(([type, hs]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            <Pill text={type} />
            <span className="text-[10px] text-muted-foreground">{hs.length} hooks</span>
          </div>
          <div className="space-y-2">
            {hs.map((h: any, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-3 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">"{h.hook}"</p>
                  {h.whyItWorks && <p className="text-[10px] text-muted-foreground mt-1.5 italic">{h.whyItWorks}</p>}
                </div>
                <CopyButton text={h.hook} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {!hooks.length && <EmptyState message="No hooks extracted. Run a new analysis." />}
    </div>
  );
}

// ─── Tab: Posting Strategy ───────────────────────────────────────────────────

function PostingStrategyTab({ report }: { report: any }) {
  const ps = report.postingStrategy;
  if (!ps) return <EmptyState message="No posting strategy data. Run a new analysis." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" />Best Times</p>
          {(ps.bestTimes || []).map((t: string) => (
            <p key={t} className="text-sm font-semibold text-foreground">{t}</p>
          ))}
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" />Best Days</p>
          <div className="flex flex-wrap gap-1.5">
            {(ps.bestDays || []).map((d: string) => (
              <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
            ))}
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><RefreshCw className="w-3 h-3" />Their Frequency</p>
          <p className="text-sm font-semibold text-red-400">{ps.competitorFrequency}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Yours: <span className="text-primary">{ps.clientFrequency}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><BarChart2 className="w-3 h-3" />Format Mix</p>
          <p className="text-xs text-foreground">{ps.formatMix}</p>
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Copy This Exact Schedule</p>
        <p className="text-sm text-foreground leading-relaxed">{ps.recommendation}</p>
      </div>
    </div>
  );
}

// ─── Tab: Audience Insights ──────────────────────────────────────────────────

function AudienceInsightsTab({ report }: { report: any }) {
  const ai = report.audienceInsights;
  if (!ai) return <EmptyState message="No audience data. Run a new analysis." />;

  return (
    <div className="space-y-4">
      {ai.insight && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/25">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5">Key Insight</p>
          <p className="text-sm text-foreground leading-relaxed">{ai.insight}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Heart className="w-3 h-3" />Audience Loves</p>
          <ul className="space-y-1.5">{(ai.audienceLoves || []).map((l: string, i: number) => <li key={i} className="text-xs text-foreground flex items-start gap-1.5"><span className="text-green-400 mt-0.5">•</span>{l}</li>)}</ul>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><XCircle className="w-3 h-3" />Pain Points</p>
          <ul className="space-y-1.5">{(ai.painPoints || []).map((p: string, i: number) => <li key={i} className="text-xs text-foreground flex items-start gap-1.5"><span className="text-red-400 mt-0.5">•</span>{p}</li>)}</ul>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 col-span-2">
          <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Star className="w-3 h-3" />Audience Desires</p>
          <ul className="grid grid-cols-2 gap-1.5">{(ai.desires || []).map((d: string, i: number) => <li key={i} className="text-xs text-foreground flex items-start gap-1.5"><span className="text-yellow-400 mt-0.5">•</span>{d}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Scorecard ───────────────────────────────────────────────────────────

function ScorecardTab({ report, analysis }: { report: any; analysis: any }) {
  const sc = report.scorecard;
  if (!sc) return <EmptyState message="No scorecard data. Run a new analysis." />;

  const metrics = sc.metrics || [];
  const youWin = sc.youWin ?? 0;
  const compWin = sc.competitorWins ?? 0;
  const total = metrics.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex gap-3">
        <div className={`flex-1 p-4 rounded-xl border text-center ${youWin > compWin ? "bg-green-500/10 border-green-500/25" : "bg-red-500/10 border-red-500/25"}`}>
          <p className={`text-3xl font-black ${youWin > compWin ? "text-green-400" : "text-red-400"}`}>{youWin}<span className="text-lg">/{total}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{analysis.clientHandle}</p>
        </div>
        <div className="flex-shrink-0 flex items-center px-3">
          <span className="text-lg font-bold text-muted-foreground">vs</span>
        </div>
        <div className={`flex-1 p-4 rounded-xl border text-center ${compWin > youWin ? "bg-red-500/10 border-red-500/25" : "bg-green-500/10 border-green-500/25"}`}>
          <p className={`text-3xl font-black ${compWin > youWin ? "text-red-400" : "text-green-400"}`}>{compWin}<span className="text-lg">/{total}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{analysis.competitorHandle}</p>
        </div>
      </div>
      {sc.summary && <p className="text-sm text-muted-foreground text-center">{sc.summary}</p>}

      {/* Metric rows */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-2 bg-muted/30 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span className="flex-1">Metric</span>
          <span className="w-16 text-center text-primary">You</span>
          <span className="w-16 text-center text-red-400">Competitor</span>
          <span className="w-12 text-center">Winner</span>
        </div>
        {metrics.map((m: any, i: number) => (
          <div key={i} className="flex items-center px-4 py-3 border-b border-border last:border-0">
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{m.metric}</p>
              {m.note && <p className="text-[10px] text-muted-foreground mt-0.5">{m.note}</p>}
            </div>
            <div className="w-16 text-center">
              <span className={`text-sm font-bold ${m.winner === "you" ? "text-green-400" : m.winner === "tie" ? "text-yellow-400" : "text-foreground"}`}>{m.yourScore}/10</span>
            </div>
            <div className="w-16 text-center">
              <span className={`text-sm font-bold ${m.winner === "competitor" ? "text-red-400" : m.winner === "tie" ? "text-yellow-400" : "text-foreground"}`}>{m.competitorScore}/10</span>
            </div>
            <div className="w-12 flex justify-center">
              {m.winner === "you" ? <Trophy className="w-4 h-4 text-green-400" /> : m.winner === "tie" ? <span className="text-yellow-400 text-xs font-bold">TIE</span> : <Trophy className="w-4 h-4 text-red-400" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Steal Strategy ─────────────────────────────────────────────────────

function StealStrategyTab({ analysis, onGenerate, generating }: { analysis: any; onGenerate: () => void; generating: boolean }) {
  const report = analysis.report as any;
  const ss = report?.stealStrategy;

  if (!ss) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Steal Their Strategy</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8 leading-relaxed">
          Get a complete AI-generated 30-day content plan based on {analysis.competitorHandle}'s exact strategy — hooks, schedule, reel ideas, and a step-by-step growth playbook.
        </p>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={generating}
          className="gap-2 px-8"
          data-testid="button-steal-strategy"
        >
          {generating ? <><Loader2 className="w-5 h-5 animate-spin" />Generating your 30-day plan…</> : <><Sparkles className="w-5 h-5" />Generate 30-Day Plan</>}
        </Button>
        {generating && <p className="text-xs text-muted-foreground mt-4 animate-pulse">Building your personalised plan — this takes ~30 seconds</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CTA Strategy */}
      {ss.ctaStrategy && (
        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/25">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">CTA & Conversion Strategy</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {(ss.ctaStrategy.topCTAs || []).map((cta: string, i: number) => (
              <div key={i} className="bg-card border border-card-border rounded-lg p-3 flex items-center justify-between gap-2">
                <p className="text-xs text-foreground flex-1">"{cta}"</p>
                <CopyButton text={cta} />
              </div>
            ))}
          </div>
          {ss.ctaStrategy.conversionFlow && (
            <div className="bg-card border border-card-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Conversion Flow</p>
              <p className="text-xs text-foreground">{ss.ctaStrategy.conversionFlow}</p>
            </div>
          )}
        </div>
      )}

      {/* Posting Schedule */}
      {ss.postingSchedule && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Your New Posting Schedule</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-3 bg-primary/8 rounded-xl">
              <p className="text-sm font-bold text-primary">{ss.postingSchedule.frequency}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Frequency</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-xl">
              <p className="text-xs font-bold text-foreground">{(ss.postingSchedule.days || []).join(", ")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Days</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-xl">
              <p className="text-xs font-bold text-foreground">{(ss.postingSchedule.times || []).join(", ")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Times</p>
            </div>
          </div>
          {ss.postingSchedule.rationale && <p className="text-xs text-muted-foreground">{ss.postingSchedule.rationale}</p>}
        </div>
      )}

      {/* Content Style */}
      {ss.contentStyle && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" />Content Style to Adopt</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Tone", ss.contentStyle.tone], ["Structure", ss.contentStyle.structure], ["Storytelling", ss.contentStyle.storytellingFormat], ["Visual Style", ss.contentStyle.visualStyle]].map(([label, val]) => val && (
              <div key={label} className="bg-muted/20 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xs text-foreground">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hook System */}
      {(ss.hookSystem || []).length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Your 20-Hook System</p>
          <div className="space-y-2">
            {(ss.hookSystem || []).map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl">
                <span className="text-[10px] font-bold text-muted-foreground w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">"{h.hook}"</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Pill text={h.type} />
                    {h.useFor && <span className="text-[10px] text-muted-foreground">{h.useFor}</span>}
                  </div>
                </div>
                <CopyButton text={h.hook} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reel + Carousel Ideas */}
      <div className="grid grid-cols-2 gap-4">
        {(ss.reelIdeas || []).length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-pink-400" />Reel Ideas</p>
            <ul className="space-y-2">
              {(ss.reelIdeas || []).map((idea: string, i: number) => (
                <li key={i} className="flex items-start gap-2 group">
                  <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-xs text-foreground flex-1">{idea}</p>
                  <CopyButton text={idea} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {(ss.carouselIdeas || []).length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400" />Carousel Ideas</p>
            <ul className="space-y-2">
              {(ss.carouselIdeas || []).map((idea: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-xs text-foreground flex-1">{idea}</p>
                  <CopyButton text={idea} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4-Week Growth Playbook */}
      {(ss.growthPlaybook || []).length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-green-400" />4-Week Growth Playbook</p>
          <div className="grid grid-cols-2 gap-3">
            {(ss.growthPlaybook || []).map((w: any) => (
              <div key={w.week} className="bg-muted/20 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-primary/15 rounded-lg flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">{w.week}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">Week {w.week}</p>
                </div>
                <p className="text-[10px] text-primary font-medium mb-2">{w.focus}</p>
                <ul className="space-y-1 mb-2">
                  {(w.tasks || []).map((t: string, i: number) => (
                    <li key={i} className="text-[10px] text-foreground flex items-start gap-1.5"><span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground italic">Goal: {w.goal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Content Plan */}
      {(ss.contentPlan || []).length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />30-Day Content Plan</p>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {(ss.contentPlan || []).map((day: any) => (
              <div key={day.day} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl">
                <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">{day.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{day.format}</Badge>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">{day.goal}</Badge>
                  </div>
                  <p className="text-xs font-medium text-foreground">{day.topic}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">Hook: "{day.hook}"</p>
                  {day.structure && <p className="text-[10px] text-muted-foreground mt-0.5">{day.structure}</p>}
                </div>
                <CopyButton text={`Day ${day.day} — ${day.format}\nTopic: ${day.topic}\nHook: ${day.hook}\nStructure: ${day.structure}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final message */}
      {ss.finalMessage && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/25 text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-base font-bold text-foreground">{ss.finalMessage}</p>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Full Analysis Report ─────────────────────────────────────────────────────

function FullReport({ analysis, onDelete }: { analysis: any; onDelete: () => void }) {
  const { toast } = useToast();
  const [stealGenerating, setStealGenerating] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState(analysis);

  const generateSteal = async () => {
    setStealGenerating(true);
    try {
      const res = await fetch("/api/competitor/steal-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate strategy");
      setLocalAnalysis((prev: any) => ({ ...prev, report: { ...prev.report, stealStrategy: data.stealStrategy } }));
      toast({ title: "30-Day Plan Ready!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setStealGenerating(false);
    }
  };

  const report = localAnalysis.report as any;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-400" />
            {localAnalysis.clientHandle} <span className="text-muted-foreground text-sm">vs</span> {localAnalysis.competitorHandle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(localAnalysis.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" data-testid="button-delete-analysis">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max gap-0.5 h-auto p-1 mb-1">
            {[
              { value: "overview", label: "Overview" },
              { value: "reels", label: "Reel-by-Reel" },
              { value: "performance", label: "Performance" },
              { value: "patterns", label: "AI Patterns" },
              { value: "gaps", label: "Gap Analysis" },
              { value: "hooks", label: "Hook Library" },
              { value: "strategy", label: "Posting Strategy" },
              { value: "audience", label: "Audience" },
              { value: "scorecard", label: "Scorecard" },
              { value: "steal", label: "🎯 Steal Strategy" },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 py-1.5 whitespace-nowrap flex-shrink-0">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview"><OverviewTab report={report} analysis={localAnalysis} /></TabsContent>
        <TabsContent value="reels"><ReelByReelTab report={report} analysis={localAnalysis} /></TabsContent>
        <TabsContent value="performance"><ContentPerformanceTab report={report} analysis={localAnalysis} /></TabsContent>
        <TabsContent value="patterns"><AIPatternsTab report={report} /></TabsContent>
        <TabsContent value="gaps"><GapAnalysisTab report={report} /></TabsContent>
        <TabsContent value="hooks"><HookLibraryTab report={report} /></TabsContent>
        <TabsContent value="strategy"><PostingStrategyTab report={report} /></TabsContent>
        <TabsContent value="audience"><AudienceInsightsTab report={report} /></TabsContent>
        <TabsContent value="scorecard"><ScorecardTab report={report} analysis={localAnalysis} /></TabsContent>
        <TabsContent value="steal"><StealStrategyTab analysis={localAnalysis} onGenerate={generateSteal} generating={stealGenerating} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompetitorStudy({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientUrl, setClientUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");

  const Layout = useAdmin ? AdminLayout : ClientLayout;
  const activeClientId = useAdmin ? selectedClient : (user?.id ?? "");

  const { data: analyses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/competitor/analyses", activeClientId],
    queryFn: () => fetch(`/api/competitor/analyses${useAdmin && activeClientId ? `?clientId=${activeClientId}` : ""}`).then(r => r.json()),
    enabled: !useAdmin || !!activeClientId,
  });

  const analyze = useMutation({
    mutationFn: () => apiRequest("POST", "/api/competitor/analyze", {
      clientUrl, competitorUrl,
      clientId: activeClientId || user?.id,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitor/analyses", activeClientId] });
      setSelectedId(data.id);
      setClientUrl("");
      setCompetitorUrl("");
      toast({ title: "Analysis complete!", description: "10-tab deep-dive report is ready." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteAnalysis = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/competitor/analyses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitor/analyses", activeClientId] });
      setSelectedId(null);
      toast({ title: "Analysis deleted" });
    },
  });

  const selected = (analyses as any[]).find((a: any) => a.id === selectedId);
  const canAnalyze = clientUrl.trim() && competitorUrl.trim() && (!useAdmin || activeClientId);

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Competitor Study</h1>
            <p className="text-xs text-muted-foreground">Deep-dive AI analysis · 10 intelligence tabs · Steal their exact strategy</p>
          </div>
        </div>

        {/* Input form */}
        <Card className="border border-card-border">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">New Analysis</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Your Instagram URL</Label>
                <Input
                  value={clientUrl}
                  onChange={e => setClientUrl(e.target.value)}
                  placeholder="instagram.com/yourhandle"
                  className="h-9 text-sm"
                  data-testid="input-client-url"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Competitor Instagram URL</Label>
                <Input
                  value={competitorUrl}
                  onChange={e => setCompetitorUrl(e.target.value)}
                  placeholder="instagram.com/competitorhandle"
                  className="h-9 text-sm"
                  data-testid="input-competitor-url"
                />
              </div>
            </div>
            <Button
              onClick={() => analyze.mutate()}
              disabled={!canAnalyze || analyze.isPending}
              className="gap-2"
              data-testid="button-run-analysis"
            >
              {analyze.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Scraping & Analysing… (~60s)</>
                : <><Sparkles className="w-4 h-4" />Run Deep Analysis</>
              }
            </Button>
            {analyze.isPending && <p className="text-xs text-muted-foreground animate-pulse">Scraping both profiles (30 posts each) + running 10-tab AI analysis — please wait…</p>}
          </CardContent>
        </Card>

        {/* Past analyses list */}
        {isLoading ? (
          <div className="space-y-2">{Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (analyses as any[]).length === 0 ? (
          <div className="text-center py-12">
            <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No analyses yet — enter two Instagram URLs above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {!selected && (
              <p className="text-xs text-muted-foreground">Select an analysis to view the full report</p>
            )}
            {(analyses as any[]).map((a: any) => {
              const isActive = selectedId === a.id;
              return (
                <div key={a.id} className={`border rounded-2xl overflow-hidden transition-all ${isActive ? "border-primary/40" : "border-border"}`}>
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/20 transition-colors"
                    onClick={() => setSelectedId(isActive ? null : a.id)}
                    data-testid={`analysis-${a.id}`}
                  >
                    <div className="w-9 h-9 bg-pink-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Instagram className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{a.clientHandle} <span className="text-muted-foreground">vs</span> {a.competitorHandle}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.report?.overview?.assessment && (
                        <Badge variant="outline" className={`text-[10px] ${a.report.overview.assessment === "winning" ? "text-green-400 border-green-500/30" : a.report.overview.assessment === "losing" ? "text-red-400 border-red-500/30" : "text-yellow-400 border-yellow-500/30"}`}>
                          {a.report.overview.assessment === "losing" ? "Needs Work" : a.report.overview.assessment}
                        </Badge>
                      )}
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isActive ? "rotate-90" : ""}`} />
                    </div>
                  </button>
                  {isActive && (
                    <div className="p-4 pt-0 border-t border-border mt-1">
                      <FullReport analysis={a} onDelete={() => deleteAnalysis.mutate(a.id)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
