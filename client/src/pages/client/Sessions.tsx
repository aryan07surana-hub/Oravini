import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Play, Lock, Video, Mic, BookOpen, Zap, Star, Crown,
  Sparkles, ChevronRight, Clock, Calendar, Search, RefreshCw,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";
const PLAN_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2 };

const PLAN_INFO = {
  free: { label: "Free", color: "bg-gray-500", icon: Zap, desc: "Access free sessions and 3 AI ideas/day" },
  starter: { label: "Starter", color: "bg-blue-500", icon: Star, desc: "Free + Starter sessions, more AI tools" },
  pro: { label: "Pro", color: "bg-yellow-500", icon: Crown, desc: "Full access to all sessions and features" },
};

const SESSION_TYPE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  recording: { label: "Recording", icon: Video, color: "text-blue-400" },
  live_qa: { label: "Live Q&A", icon: Mic, color: "text-green-400" },
  workshop: { label: "Workshop", icon: BookOpen, color: "text-purple-400" },
  masterclass: { label: "Masterclass", icon: Crown, color: "text-yellow-400" },
};

const TIER_BADGE: Record<string, { label: string; style: string }> = {
  free: { label: "Free", style: "bg-gray-600 text-white" },
  starter: { label: "Starter", style: "bg-blue-600 text-white" },
  pro: { label: "Pro", style: `text-black font-bold` },
};

function getYoutubeId(url: string) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m?.[1];
}
function getLoomId(url: string) {
  const m = url?.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  return m?.[1];
}
function getVimeoId(url: string) {
  const m = url?.match(/vimeo\.com\/(\d+)/);
  return m?.[1];
}

function VideoPlayer({ url }: { url: string }) {
  const ytId = getYoutubeId(url);
  const loomId = getLoomId(url);
  const vimeoId = getVimeoId(url);
  if (ytId) {
    return <iframe className="w-full rounded-xl" style={{ aspectRatio: "16/9" }} src={`https://www.youtube.com/embed/${ytId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }
  if (loomId) {
    return <iframe className="w-full rounded-xl" style={{ aspectRatio: "16/9" }} src={`https://www.loom.com/embed/${loomId}`} allowFullScreen />;
  }
  if (vimeoId) {
    return <iframe className="w-full rounded-xl" style={{ aspectRatio: "16/9" }} src={`https://player.vimeo.com/video/${vimeoId}`} allowFullScreen />;
  }
  return (
    <video className="w-full rounded-xl" controls src={url} style={{ aspectRatio: "16/9", background: "#000" }} />
  );
}

function SessionCard({ session, userPlan, onWatch }: { session: any; userPlan: string; onWatch: (s: any) => void }) {
  const canAccess = PLAN_ORDER[userPlan] >= PLAN_ORDER[session.tierRequired];
  const TypeInfo = SESSION_TYPE_INFO[session.type] || SESSION_TYPE_INFO.recording;
  const tierBadge = TIER_BADGE[session.tierRequired];

  return (
    <div
      data-testid={`session-card-${session.id}`}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden group ${canAccess ? "border-border bg-card hover:border-primary/40 hover:shadow-lg cursor-pointer" : "border-border bg-card/50 opacity-75"}`}
      onClick={() => canAccess && onWatch(session)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        {session.thumbnailUrl ? (
          <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
            <TypeInfo.icon className={`w-12 h-12 ${TypeInfo.color} opacity-60`} />
          </div>
        )}
        {canAccess ? (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 text-white/70 mx-auto mb-2" />
              <p className="text-xs text-white/60 font-medium">Upgrade to unlock</p>
            </div>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierBadge.style}`} style={session.tierRequired === "pro" ? { background: GOLD } : {}}>
            {tierBadge.label}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white/80`}>
            {TypeInfo.label}
          </span>
        </div>
        {session.durationMinutes && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />{session.durationMinutes}m
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">{session.title}</h3>
        {session.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{session.description}</p>}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          {session.hostName && <span>by <strong className="text-foreground">{session.hostName}</strong></span>}
          {session.scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(session.scheduledAt), "MMM d, yyyy")}
            </span>
          )}
        </div>
        {session.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {session.tags.slice(0, 3).map((t: string) => (
              <span key={t} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FreeAIPanel({ userPlan }: { userPlan: string }) {
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [ideas, setIdeas] = useState<any[]>([]);
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sessions/free-ai", { niche, platform });
      return res;
    },
    onSuccess: (data: any) => {
      setIdeas(data.ideas || []);
      setUsage({ used: data.used, limit: data.limit, remaining: data.remaining });
    },
    onError: (err: any) => {
      if (err.message?.includes("429") || err.status === 429) {
        toast({ title: "Daily limit reached", description: "You've used your 3 free AI ideas for today. Upgrade to get unlimited.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
          <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Free AI Content Ideas</h3>
          <p className="text-xs text-muted-foreground">3 ideas/day — taste what's inside</p>
        </div>
        {usage && (
          <div className="ml-auto text-right">
            <p className="text-xs font-semibold text-foreground">{usage.remaining} left today</p>
            <div className="flex gap-0.5 mt-1">
              {[...Array(usage.limit)].map((_, i) => (
                <div key={i} className={`w-4 h-1.5 rounded-full ${i < usage.used ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          data-testid="input-free-ai-niche"
          placeholder="Your niche (e.g. fitness, finance, travel...)"
          value={niche}
          onChange={e => setNiche(e.target.value)}
          className="flex-1 text-sm h-9"
        />
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          data-testid="select-free-ai-platform"
          className="text-sm h-9 px-3 rounded-md border border-input bg-background text-foreground"
        >
          <option>Instagram</option>
          <option>YouTube</option>
          <option>TikTok</option>
        </select>
        <Button
          data-testid="button-generate-free-ai"
          size="sm"
          className="h-9"
          style={{ background: GOLD, color: "#000" }}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !niche.trim()}
        >
          {mutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Generate"}
        </Button>
      </div>

      {ideas.length > 0 && (
        <div className="space-y-2 mt-3">
          {ideas.map((idea, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-primary mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{idea.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 italic">"{idea.hook}"</p>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">{idea.format}</span>
                </div>
              </div>
            </div>
          ))}
          {userPlan === "free" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center mt-2">
              <p className="text-xs text-muted-foreground mb-2">Want unlimited ideas + all AI tools?</p>
              <a href="/select-plan">
                <Button size="sm" style={{ background: GOLD, color: "#000" }} className="text-xs h-7">
                  Upgrade Your Plan →
                </Button>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanBanner({ plan }: { plan: string }) {
  const info = PLAN_INFO[plan as keyof typeof PLAN_INFO] || PLAN_INFO.free;
  const Icon = info.icon;
  if (plan === "pro" || plan === "elite") return null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}20` }}>
        <Icon className="w-5 h-5" style={{ color: GOLD }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">You're on the <span style={{ color: GOLD }}>{info.label}</span> plan</p>
        <p className="text-xs text-muted-foreground mt-0.5">{info.desc}. Some sessions require an upgrade.</p>
      </div>
      <a href="/select-plan" className="flex-shrink-0">
        <Button size="sm" variant="outline" className="text-xs h-8 border-primary/30 hover:border-primary">
          Upgrade <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </a>
    </div>
  );
}

export default function Sessions() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [watchSession, setWatchSession] = useState<any>(null);
  const userPlan = (user as any)?.plan ?? "free";

  const { data: sessionList, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });

  const filtered = (sessionList || []).filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || s.type === filterType;
    return matchSearch && matchType;
  });

  const freeSessions = filtered.filter(s => s.tierRequired === "free");
  const starterSessions = filtered.filter(s => s.tierRequired === "starter");
  const proSessions = filtered.filter(s => s.tierRequired === "pro");

  return (
    <ClientLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sessions Hub</h1>
            <p className="text-sm text-muted-foreground mt-1">Live Q&As, recordings, workshops, and masterclasses — all in one place</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs px-3 py-1 ${PLAN_INFO[userPlan as keyof typeof PLAN_INFO]?.color || "bg-gray-500"}`} style={userPlan === "pro" ? { background: GOLD, color: "#000" } : {}}>
              {PLAN_INFO[userPlan as keyof typeof PLAN_INFO]?.label || "Free"} Plan
            </Badge>
          </div>
        </div>

        {/* Plan banner (if not pro) */}
        <PlanBanner plan={userPlan} />

        {/* Search & Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              data-testid="input-session-search"
              placeholder="Search sessions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          {["all", "recording", "live_qa", "workshop", "masterclass"].map(t => (
            <Button
              key={t}
              data-testid={`filter-${t}`}
              size="sm"
              variant={filterType === t ? "default" : "outline"}
              className="h-9 text-xs capitalize"
              style={filterType === t ? { background: GOLD, color: "#000", border: "none" } : {}}
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "All" : t === "live_qa" ? "Live Q&A" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>

        {/* Free AI Panel */}
        <FreeAIPanel userPlan={userPlan} />

        {/* Session Lists */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : (sessionList || []).length === 0 ? (
          <div className="text-center py-20">
            <Video className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No sessions published yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Check back soon — recordings and live Q&As are coming!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {freeSessions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">Free Sessions</h2>
                  <span className="text-xs text-muted-foreground">({freeSessions.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freeSessions.map(s => <SessionCard key={s.id} session={s} userPlan={userPlan} onWatch={setWatchSession} />)}
                </div>
              </div>
            )}
            {starterSessions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-blue-400" />
                  <h2 className="text-base font-semibold text-foreground">Starter Sessions</h2>
                  <span className="text-xs text-muted-foreground">({starterSessions.length})</span>
                  {PLAN_ORDER[userPlan] < 1 && <Badge className="text-[10px] bg-blue-600 text-white ml-1">Upgrade to unlock</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {starterSessions.map(s => <SessionCard key={s.id} session={s} userPlan={userPlan} onWatch={setWatchSession} />)}
                </div>
              </div>
            )}
            {proSessions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-4 h-4" style={{ color: GOLD }} />
                  <h2 className="text-base font-semibold text-foreground">Pro Sessions</h2>
                  <span className="text-xs text-muted-foreground">({proSessions.length})</span>
                  {PLAN_ORDER[userPlan] < 2 && <Badge className="text-[10px] text-black font-bold ml-1" style={{ background: GOLD }}>Pro only</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proSessions.map(s => <SessionCard key={s.id} session={s} userPlan={userPlan} onWatch={setWatchSession} />)}
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No sessions match your search</p>
              </div>
            )}
          </div>
        )}

        {/* Upsell card if free */}
        {userPlan === "free" && (
          <div className="rounded-2xl border p-6 text-center" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08` }}>
            <Crown className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
            <h3 className="font-bold text-lg text-foreground mb-2">Unlock the Full Experience</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Get access to Starter and Pro sessions, unlimited AI features, live Q&As, masterclasses, and everything Oravini has to offer.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="/select-plan">
                <Button style={{ background: GOLD, color: "#000" }} className="font-bold">
                  Upgrade Your Plan →
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Watch dialog */}
      <Dialog open={!!watchSession} onOpenChange={open => !open && setWatchSession(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold pr-8">{watchSession?.title}</DialogTitle>
          </DialogHeader>
          {watchSession?.videoUrl ? (
            <VideoPlayer url={watchSession.videoUrl} />
          ) : (
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Video className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No video URL set for this session</p>
              </div>
            </div>
          )}
          {watchSession?.description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{watchSession.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {watchSession?.hostName && <span>Host: <strong className="text-foreground">{watchSession.hostName}</strong></span>}
            {watchSession?.durationMinutes && <span>· {watchSession.durationMinutes} min</span>}
            {watchSession?.scheduledAt && <span>· {format(new Date(watchSession.scheduledAt), "MMM d, yyyy")}</span>}
          </div>
          {watchSession?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {watchSession.tags.map((t: string) => (
                <span key={t} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
