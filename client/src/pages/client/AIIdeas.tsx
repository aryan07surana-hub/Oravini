import { useState, useMemo, useEffect, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import CreditErrorBanner from "@/components/CreditErrorBanner";
import GeneratingScreen from "@/components/ui/GeneratingScreen";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import PublishModal from "@/components/PublishModal";
import {
  Sparkles, Instagram, Youtube, Lightbulb, Copy, Heart,
  RefreshCw, ChevronDown, ChevronUp, Zap, Target, Users, MessageSquare, Link, CheckCircle2, TrendingUp, PieChart, Trash2,
  FileText, Wand2, Hash, Plus, X, Clock, Linkedin, Twitter, Send, History, RotateCcw
} from "lucide-react";

// ─── AI hashtag suggestions hook ───────────────────────────────────────────────
function useHashtagSuggestions(niche: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNicheRef = useRef("");

  useEffect(() => {
    const trimmed = niche.trim();
    if (trimmed.length < 3) { setSuggestions([]); return; }
    if (trimmed === lastNicheRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastNicheRef.current = trimmed;
      setLoading(true);
      try {
        const data = await apiRequest("POST", "/api/ai/hashtag-suggestions", { niche: trimmed });
        setSuggestions(Array.isArray(data?.hashtags) ? data.hashtags : []);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [niche]);

  return { suggestions, loading };
}

function likedKey(platform: string) { return `liked_ideas_${platform}`; }
function loadLiked(platform: string): ContentIdea[] {
  try { return JSON.parse(localStorage.getItem(likedKey(platform)) || "[]"); } catch { return []; }
}
function saveLikedStorage(platform: string, ideas: ContentIdea[]) {
  localStorage.setItem(likedKey(platform), JSON.stringify(ideas));
}

interface ContentIdea {
  title: string;
  concept: string;
  captionStarter: string;
  tip?: string;
  formatType?: string;
  whyItWorks?: string;
  cta?: string;
  keyPoints?: string[];
  threadOutline?: string[];
  linkedinStructure?: string[];
}

interface ContentMix {
  growth: number;
  value: number;
  conversion: number;
  suggestion: string;
}

const IG_CONTENT_TYPES = [
  { value: "reels", label: "Reels" },
  { value: "carousels", label: "Carousels" },
  { value: "stories", label: "Stories" },
  { value: "posts", label: "Static Posts" },
  { value: "mix", label: "Mix of all types" },
];

const YT_CONTENT_TYPES = [
  { value: "Short Form (Shorts, quick tips, viral hooks, micro lessons)", label: "Short Form — Shorts & Quick Tips" },
  { value: "Long Form (deep educational videos, tutorials, case studies, step-by-step guides)", label: "Long Form — Tutorials & Deep Dives" },
  { value: "Value Based (educational breakdowns, framework explanations, strategy videos)", label: "Value Based — Education & Frameworks" },
  { value: "VSL Style (problem-solution videos, authority videos, story-based persuasion)", label: "VSL Style — Sales & Authority" },
  { value: "mix of all YouTube formats", label: "Mix of all formats" },
];

const LI_CONTENT_TYPES = [
  { value: "Thought Leadership post", label: "Thought Leadership" },
  { value: "List post (numbered insights)", label: "List Post — Numbered Insights" },
  { value: "Personal story post", label: "Personal Story" },
  { value: "How-to carousel post", label: "How-To Carousel" },
  { value: "Controversial opinion post", label: "Controversial Opinion / Hot Take" },
  { value: "mix of all LinkedIn formats", label: "Mix of all formats" },
];

const TW_CONTENT_TYPES = [
  { value: "Twitter thread (multi-tweet educational breakdown)", label: "Twitter Thread" },
  { value: "Single tweet hot take or opinion", label: "Single Tweet — Hot Take" },
  { value: "Quote thread (series of powerful one-liners)", label: "Quote Thread" },
  { value: "Poll tweet with engagement question", label: "Poll Tweet" },
  { value: "mix of threads and single tweets", label: "Mix of all formats" },
];

const GOALS = [
  { value: "grow followers/subscribers fast", label: "Grow Followers / Subscribers" },
  { value: "drive sales and conversions", label: "Drive Sales & Conversions" },
  { value: "boost engagement and comments", label: "Boost Engagement & Comments" },
  { value: "build brand authority and trust", label: "Build Authority & Trust" },
  { value: "go viral and reach new audiences", label: "Go Viral" },
  { value: "educate my audience", label: "Educate My Audience" },
];

function extractHandle(url: string, platform: "instagram" | "youtube"): string | null {
  if (!url.trim()) return null;
  try {
    const raw = url.trim().replace(/\/+$/, "");
    if (platform === "instagram") {
      const urlMatch = raw.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
      if (urlMatch) return "@" + urlMatch[1];
      const handleMatch = raw.match(/^@?([A-Za-z0-9_.]+)$/);
      if (handleMatch) return "@" + handleMatch[1];
    } else {
      const urlMatch = raw.match(/youtube\.com\/(?:@|c\/|channel\/|user\/)([A-Za-z0-9_.-]+)/);
      if (urlMatch) return "@" + urlMatch[1];
      const atMatch = raw.match(/^@?([A-Za-z0-9_.-]+)$/);
      if (atMatch) return "@" + atMatch[1];
    }
  } catch {}
  return null;
}

// ─── AI Loading Animation ──────────────────────────────────────────────────────
const IG_LOADING_STEPS = [
  { icon: "🔍", text: "Scanning your niche for viral content patterns…" },
  { icon: "📊", text: "Analysing top-performing reels and posts in your space…" },
  { icon: "🎯", text: "Identifying content gaps and untapped opportunities…" },
  { icon: "✍️", text: "Crafting personalised content angles just for you…" },
  { icon: "🚀", text: "Writing your scroll-stopping ideas…" },
  { icon: "✨", text: "Finalising your personalised content strategy…" },
];

const YT_LOADING_STEPS = [
  { icon: "🔍", text: "Scanning your niche for high-performing YouTube videos…" },
  { icon: "📈", text: "Analysing what top creators in your space are doing…" },
  { icon: "🎯", text: "Identifying untapped video topics and content gaps…" },
  { icon: "💡", text: "Crafting your video ideas and titles…" },
  { icon: "✍️", text: "Writing hooks, concepts and key points…" },
  { icon: "🚀", text: "Finalising your YouTube content calendar…" },
];

const LI_LOADING_STEPS = [
  { icon: "🔍", text: "Scanning LinkedIn algorithm patterns and trending topics…" },
  { icon: "📊", text: "Analysing top-performing posts in your niche…" },
  { icon: "🎯", text: "Identifying thought leadership opportunities…" },
  { icon: "✍️", text: "Crafting professional posts with high engagement potential…" },
  { icon: "🚀", text: "Writing your post openers and structures…" },
  { icon: "✨", text: "Finalising your LinkedIn content strategy…" },
];

const TW_LOADING_STEPS = [
  { icon: "🔍", text: "Scanning viral X/Twitter trends in your niche…" },
  { icon: "📊", text: "Analysing top threads and hot takes that exploded…" },
  { icon: "🎯", text: "Identifying untapped angles for viral content…" },
  { icon: "✍️", text: "Crafting punchy hooks and thread structures…" },
  { icon: "🚀", text: "Writing your tweet hooks and thread outlines…" },
  { icon: "✨", text: "Finalising your X/Twitter content strategy…" },
];

function AILoadingState({ platform }: { platform: string }) {
  const steps = platform === "youtube" ? YT_LOADING_STEPS : platform === "linkedin" ? LI_LOADING_STEPS : platform === "twitter" ? TW_LOADING_STEPS : IG_LOADING_STEPS;
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIdx(i => (i < steps.length - 1 ? i + 1 : i));
    }, 3500);
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 1.2, 96));
    }, 260);
    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, [steps.length]);

  const step = steps[stepIdx];

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center space-y-6">
      {/* Pulsing icon */}
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-50" />
        <div className="absolute inset-2 rounded-full bg-primary/15 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Step text */}
      <div className="space-y-1.5 min-h-[48px]">
        <p className="text-2xl">{step.icon}</p>
        <p className="text-sm font-semibold text-foreground transition-all duration-500">{step.text}</p>
        <p className="text-[11px] text-muted-foreground">
          Step {stepIdx + 1} of {steps.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{Math.round(progress)}% complete — AI is working hard for you</p>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${i === stepIdx ? "w-5 h-2 bg-primary" : i < stepIdx ? "w-2 h-2 bg-primary/50" : "w-2 h-2 bg-muted/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

function buildPublishText(idea: ContentIdea, plat: string): string {
  if (plat === "linkedin") {
    const parts: string[] = [];
    if (idea.captionStarter) parts.push(idea.captionStarter);
    if (idea.linkedinStructure?.length) parts.push(idea.linkedinStructure.join("\n"));
    if (idea.cta) parts.push(idea.cta);
    return parts.filter(Boolean).join("\n\n");
  } else {
    const parts: string[] = [];
    if (idea.captionStarter) parts.push(idea.captionStarter);
    if (idea.threadOutline?.length) parts.push("🧵 Thread:\n\n" + idea.threadOutline.join("\n\n"));
    else if (idea.cta) parts.push(idea.cta);
    return parts.filter(Boolean).join("\n\n");
  }
}

function IdeaCard({ idea, index, isLiked, onToggleLike, onGetScript, onPublish, platform }: {
  idea: ContentIdea;
  index: number;
  isLiked?: boolean;
  onToggleLike?: (idea: ContentIdea) => void;
  onGetScript?: (idea: ContentIdea) => void;
  onPublish?: (idea: ContentIdea) => void;
  platform?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();
  const isYoutube = platform === "youtube";
  const isLinkedIn = platform === "linkedin";
  const isTwitter = platform === "twitter";
  const captionLabel = isLinkedIn ? "Post Opener" : isTwitter ? "Tweet Hook" : "Caption / Script Opener";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!`, description: "Pasted to clipboard." });
  };

  return (
    <Card className="border border-card-border transition-all duration-200 hover:border-primary/30 hover:shadow-md" data-testid={`idea-card-${index}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-sm font-bold text-primary">{index + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{idea.title}</p>
                {idea.formatType && (
                  <Badge variant="outline" className="mt-1.5 text-[10px] border-primary/30 text-primary h-5">
                    {idea.formatType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onToggleLike?.(idea)}
                  data-testid={`save-idea-${index}`}
                  className={`p-1.5 rounded-lg transition-colors ${isLiked ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"}`}
                  title={isLiked ? "Unlike idea" : "Like idea"}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                </button>
                {(isLinkedIn || isTwitter) && onPublish && (
                  <button
                    onClick={() => onPublish(idea)}
                    data-testid={`publish-idea-${index}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Publish this idea"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Concept</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{idea.concept}</p>
                </div>

                {idea.whyItWorks && (
                  <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Why It Will Perform</span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{idea.whyItWorks}</p>
                    </div>
                  </div>
                )}

                {idea.captionStarter && (
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{captionLabel}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(idea.captionStarter, captionLabel)}
                        data-testid={`copy-caption-${index}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title={`Copy ${captionLabel}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-foreground italic leading-relaxed">"{idea.captionStarter}"</p>
                  </div>
                )}

                {idea.cta && (
                  <div className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/15 rounded-xl p-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Target className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">Suggested CTA</span>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{idea.cta}</p>
                      </div>
                    </div>
                    <button onClick={() => copyToClipboard(idea.cta!, "CTA")} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {idea.keyPoints && idea.keyPoints.length > 0 && (
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Full Breakdown — {idea.keyPoints.length} Points</span>
                    </div>
                    <ol className="space-y-1.5">
                      {idea.keyPoints.map((point, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-primary font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                          <span>{point.replace(/^\d+\.\s*/, "")}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {idea.threadOutline && idea.threadOutline.length > 0 && (
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Twitter className="w-3 h-3 text-zinc-400" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Thread Outline — First 3 Tweets</span>
                    </div>
                    <ol className="space-y-2">
                      {idea.threadOutline.map((tweet, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed bg-zinc-900/40 rounded-lg p-2.5 flex gap-2">
                          <span className="text-zinc-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                          <span>{tweet}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {idea.linkedinStructure && idea.linkedinStructure.length > 0 && (
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Linkedin className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Post Structure</span>
                    </div>
                    <ol className="space-y-1.5">
                      {idea.linkedinStructure.map((point, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">·</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {(idea.tip && !idea.whyItWorks) && (
                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3">
                    <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Pro Tip</span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{idea.tip}</p>
                    </div>
                  </div>
                )}

                {onGetScript && !isLinkedIn && !isTwitter && (
                  <button
                    onClick={() => onGetScript(idea)}
                    data-testid={`get-script-${index}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/25 hover:from-primary/20 hover:to-primary/10 hover:border-primary/40 transition-all duration-200 group"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-primary">Get Full Script</span>
                    <FileText className="w-3 h-3 text-primary/60" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AIIdeas() {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<"instagram" | "youtube" | "linkedin" | "twitter">("instagram");
  const [profileUrl, setProfileUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [contentType, setContentType] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [contentMix, setContentMix] = useState<ContentMix | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenVisible, setScreenVisible] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [likedIdeas, setLikedIdeas] = useState<ContentIdea[]>(() => loadLiked(platform));
  const [scriptIdea, setScriptIdea] = useState<ContentIdea | null>(null);
  const [scriptContent, setScriptContent] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptDuration, setScriptDuration] = useState<string>("");
  const [ytVideoDuration, setYtVideoDuration] = useState<string>("");
  const [creditError, setCreditError] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [publishIdea, setPublishIdea] = useState<ContentIdea | null>(null);
  const qc = useQueryClient();

  const { data: ideaHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/ai/history?tool=ideas"],
  });

  useEffect(() => {
    setLikedIdeas(loadLiked(platform));
  }, [platform]);

  const toggleLike = (idea: ContentIdea) => {
    setLikedIdeas(prev => {
      const exists = prev.some(i => i.title === idea.title);
      const next = exists ? prev.filter(i => i.title !== idea.title) : [idea, ...prev];
      saveLikedStorage(platform, next);
      return next;
    });
  };

  const removeLiked = (title: string) => {
    setLikedIdeas(prev => {
      const next = prev.filter(i => i.title !== title);
      saveLikedStorage(platform, next);
      return next;
    });
  };

  const handleGetScript = async (idea: ContentIdea) => {
    setScriptIdea(idea);
    setScriptContent("");
    setScriptLoading(true);
    const dur = platform === "youtube" ? (ytVideoDuration.trim() || "10") : undefined;
    if (dur) setScriptDuration(dur);
    try {
      const data = await apiRequest("POST", "/api/ai/full-script", {
        title: idea.title,
        concept: idea.concept,
        captionStarter: idea.captionStarter,
        keyPoints: idea.keyPoints,
        cta: idea.cta,
        formatType: idea.formatType,
        platform,
        niche,
        goal,
        duration: dur,
      });
      setScriptContent(data.script || "");
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 402) {
        setCreditError(err.message);
        setScriptIdea(null);
      } else {
        toast({ title: "Script generation failed", description: err.message, variant: "destructive" });
        setScriptIdea(null);
      }
    } finally {
      setScriptLoading(false);
    }
  };

  const addHashtag = (tag: string) => {
    const cleaned = tag.trim().startsWith("#") ? tag.trim() : `#${tag.trim()}`;
    if (cleaned.length > 1 && !hashtags.includes(cleaned)) {
      setHashtags(prev => [...prev, cleaned]);
    }
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag));

  const { suggestions: suggestedHashtags, loading: hashtagsLoading } = useHashtagSuggestions(niche);

  const contentTypes = platform === "instagram" ? IG_CONTENT_TYPES : platform === "youtube" ? YT_CONTENT_TYPES : platform === "linkedin" ? LI_CONTENT_TYPES : TW_CONTENT_TYPES;
  const showProfileUrl = platform === "instagram" || platform === "youtube";

  const detectedHandle = useMemo(() => extractHandle(profileUrl, platform), [profileUrl, platform]);

  const { data: me } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const { data: allPosts } = useQuery<any[]>({
    queryKey: [`/api/content/${me?.id}`],
    enabled: !!me?.id,
  });

  const platformPosts = useMemo(() => {
    if (!allPosts) return [];
    return allPosts.filter((p: any) => p.platform === platform);
  }, [allPosts, platform]);

  const handleGenerate = async () => {
    if (!niche.trim()) {
      toast({ title: "Niche required", description: "Please enter your content niche.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setScreenVisible(true);
    setApiDone(false);
    setIdeas([]);
    setContentMix(null);
    try {
      // If an Instagram profile URL is set, scrape real posts first for richer AI context
      let scrapedPosts: any[] = [];
      if (platform === "instagram" && profileUrl.trim()) {
        try {
          toast({ title: "Scanning your Instagram…", description: "Analysing your real posts for personalised ideas." });
          const scraped = await apiRequest("POST", "/api/instagram/scrape-profile", { profileUrl: profileUrl.trim() });
          scrapedPosts = scraped?.posts ?? [];
        } catch (_) { /* non-critical — continue without scraped data */ }
      }

      const data = await apiRequest("POST", "/api/ai/content-ideas", {
        platform, niche, contentType, goal, audience, additionalContext,
        profileHandle: detectedHandle || undefined,
        existingPosts: platformPosts.slice(0, 20),
        scrapedPosts: scrapedPosts.length > 0 ? scrapedPosts : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });
      const resolvedIdeas = Array.isArray(data) ? data : (data?.ideas ?? []);
      setIdeas(resolvedIdeas);
      if (data?.contentMix) setContentMix(data.contentMix);
      if (scrapedPosts.length > 0) {
        toast({ title: `Ideas based on ${scrapedPosts.length} real posts`, description: "Your actual Instagram content was analysed to make these ideas personal." });
      }
      if (resolvedIdeas.length > 0) {
        apiRequest("POST", "/api/ai/history", {
          tool: "ideas",
          title: `${niche.trim()} — ${platform}`,
          inputs: { platform, niche, contentType, goal, audience, additionalContext },
          output: { ideas: resolvedIdeas, contentMix: data?.contentMix },
        }).then(() => qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=ideas"] })).catch(() => {});
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 402) {
        setCreditError(err.message);
      } else {
        toast({ title: "Generation failed", description: err.message || "Failed to generate ideas", variant: "destructive" });
      }
    } finally {
      setApiDone(true);
    }
  };

  const isProfileLinked = !!detectedHandle;

  return (
    <ClientLayout>
      {screenVisible && (
        <GeneratingScreen
          label="your content ideas"
          minMs={18000}
          isComplete={apiDone}
          onReady={() => { setScreenVisible(false); setLoading(false); }}
          steps={[
            "Scanning your niche & audience",
            "Researching trending formats",
            "Generating personalised ideas",
            "Adding hooks & CTAs",
            "Final quality check",
          ]}
        />
      )}
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Content Ideas</h1>
            <p className="text-xs text-muted-foreground">Personalized ideas powered by AI — the more context you give, the smarter the ideas</p>
          </div>
        </div>

        {creditError && <CreditErrorBanner message={creditError} />}

        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Platform</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => { setPlatform("instagram"); setContentType(""); setProfileUrl(""); setIdeas([]); setContentMix(null); }}
              data-testid="platform-instagram"
              className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border text-sm font-medium transition-all ${
                platform === "instagram"
                  ? "bg-pink-500/10 border-pink-500/40 text-pink-400"
                  : "border-border text-muted-foreground hover:border-pink-500/30 hover:text-pink-400"
              }`}
            >
              <Instagram className="w-5 h-5" />
              <span>Instagram</span>
              {loadLiked("instagram").length > 0 && (
                <Badge className="h-4 px-1.5 text-[10px] bg-red-500/20 text-red-400 border-0">{loadLiked("instagram").length} saved</Badge>
              )}
            </button>
            <button
              onClick={() => { setPlatform("youtube"); setContentType(""); setProfileUrl(""); setIdeas([]); setContentMix(null); }}
              data-testid="platform-youtube"
              className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border text-sm font-medium transition-all ${
                platform === "youtube"
                  ? "bg-red-500/10 border-red-500/40 text-red-400"
                  : "border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400"
              }`}
            >
              <Youtube className="w-5 h-5" />
              <span>YouTube</span>
              {loadLiked("youtube").length > 0 && (
                <Badge className="h-4 px-1.5 text-[10px] bg-red-500/20 text-red-400 border-0">{loadLiked("youtube").length} saved</Badge>
              )}
            </button>
            <button
              onClick={() => { setPlatform("linkedin"); setContentType(""); setProfileUrl(""); setIdeas([]); setContentMix(null); }}
              data-testid="platform-linkedin"
              className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border text-sm font-medium transition-all ${
                platform === "linkedin"
                  ? "bg-blue-600/10 border-blue-600/40 text-blue-400"
                  : "border-border text-muted-foreground hover:border-blue-600/30 hover:text-blue-400"
              }`}
            >
              <Linkedin className="w-5 h-5" />
              <span>LinkedIn</span>
              {loadLiked("linkedin").length > 0 && (
                <Badge className="h-4 px-1.5 text-[10px] bg-blue-500/20 text-blue-400 border-0">{loadLiked("linkedin").length} saved</Badge>
              )}
            </button>
            <button
              onClick={() => { setPlatform("twitter"); setContentType(""); setProfileUrl(""); setIdeas([]); setContentMix(null); }}
              data-testid="platform-twitter"
              className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border text-sm font-medium transition-all ${
                platform === "twitter"
                  ? "bg-zinc-100/10 border-zinc-400/40 text-zinc-300"
                  : "border-border text-muted-foreground hover:border-zinc-400/30 hover:text-zinc-300"
              }`}
            >
              <Twitter className="w-5 h-5" />
              <span>X / Twitter</span>
              {loadLiked("twitter").length > 0 && (
                <Badge className="h-4 px-1.5 text-[10px] bg-zinc-500/20 text-zinc-400 border-0">{loadLiked("twitter").length} saved</Badge>
              )}
            </button>
          </div>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="bg-card border border-card-border">
            <TabsTrigger value="generate" className="gap-1.5" data-testid="tab-generate-ideas">
              <Sparkles className="w-3.5 h-3.5" /> Generate Ideas
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-1.5" data-testid="tab-liked-ideas">
              <Heart className="w-3.5 h-3.5" /> Liked Ideas
              {likedIdeas.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-red-500/20 text-red-400 border-0">{likedIdeas.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5" data-testid="tab-ideas-history">
              <History className="w-3.5 h-3.5" /> History
              {ideaHistory.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-zinc-500/20 text-zinc-400 border-0">{ideaHistory.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-3 mt-0">
            {historyLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : ideaHistory.length === 0 ? (
              <Card className="border border-card-border">
                <CardContent className="p-10 text-center">
                  <History className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium text-foreground mb-1">No history yet</p>
                  <p className="text-xs text-muted-foreground">Generate ideas and they'll be saved here automatically.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ideaHistory.map((session: any) => {
                  const inp = session.inputs as any ?? {};
                  const out = session.output as any ?? {};
                  const count = out.ideas?.length ?? 0;
                  const platLabel: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", twitter: "X / Twitter" };
                  const platColor: Record<string, string> = { instagram: "text-pink-400 border-pink-500/30 bg-pink-500/10", youtube: "text-red-400 border-red-500/30 bg-red-500/10", linkedin: "text-blue-400 border-blue-500/30 bg-blue-500/10", twitter: "text-zinc-300 border-zinc-400/30 bg-zinc-700/20" };
                  const colorCls = platColor[inp.platform] ?? "text-primary border-primary/30 bg-primary/10";
                  return (
                    <Card key={session.id} className="border border-card-border hover:border-primary/30 transition-all" data-testid={`history-session-${session.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] h-5 border ${colorCls}`}>
                                {platLabel[inp.platform] ?? inp.platform}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">
                                {count} ideas
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(session.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground leading-snug truncate">{session.title}</p>
                            {inp.niche && <p className="text-xs text-muted-foreground mt-0.5 truncate">Niche: {inp.niche}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1.5"
                              data-testid={`restore-session-${session.id}`}
                              onClick={() => {
                                if (count > 0) {
                                  setIdeas(out.ideas);
                                  setContentMix(out.contentMix ?? null);
                                  if (inp.platform) setPlatform(inp.platform);
                                  if (inp.niche) setNiche(inp.niche);
                                  if (inp.contentType) setContentType(inp.contentType);
                                  if (inp.goal) setGoal(inp.goal);
                                  if (inp.audience) setAudience(inp.audience);
                                  toast({ title: "Session restored!", description: `${count} ideas loaded from history.` });
                                }
                              }}
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </Button>
                            <button
                              onClick={() => {
                                apiRequest("DELETE", `/api/ai/history/${session.id}`).then(() =>
                                  qc.invalidateQueries({ queryKey: ["/api/ai/history?tool=ideas"] })
                                ).catch(() => {});
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              data-testid={`delete-history-${session.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked" className="space-y-3 mt-0">
            {likedIdeas.length === 0 ? (
              <Card className="border border-card-border">
                <CardContent className="p-10 text-center">
                  <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium text-foreground mb-1">No liked ideas yet</p>
                  <p className="text-xs text-muted-foreground">Click the <Heart className="w-3 h-3 inline text-red-400" /> on any idea to save it here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {likedIdeas.map((idea, i) => (
                  <Card key={idea.title + i} className="border border-card-border hover:border-primary/30 transition-all" data-testid={`liked-idea-${i}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-sm font-semibold text-foreground leading-snug">{idea.title}</p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => navigator.clipboard.writeText(`${idea.title}\n\n${idea.concept}\n\nCaption: ${idea.captionStarter}`)}
                                data-testid={`copy-liked-${i}`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Copy idea"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeLiked(idea.title)}
                                data-testid={`remove-liked-${i}`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Remove from liked"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {idea.formatType && (
                            <Badge variant="outline" className="mb-2 text-[10px] border-primary/30 text-primary h-5">{idea.formatType}</Badge>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed">{idea.concept}</p>
                          {idea.captionStarter && (
                            <div className="mt-2 bg-card border border-card-border rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Caption Starter</span>
                              </div>
                              <p className="text-xs text-foreground italic">"{idea.captionStarter}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-6 mt-0">
        <Card className="border border-card-border">
          <CardContent className="p-6 space-y-5">
            {showProfileUrl && (
              <div className="space-y-1.5">
                <Label htmlFor="profileUrl" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Link className="w-3 h-3" />
                  {platform === "instagram" ? "Instagram Profile Link" : "YouTube Channel Link"}
                  <span className="text-muted-foreground font-normal normal-case">(optional — helps personalise ideas)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="profileUrl"
                    value={profileUrl}
                    onChange={e => setProfileUrl(e.target.value)}
                    placeholder={platform === "instagram"
                      ? "https://instagram.com/yourhandle  or  @yourhandle"
                      : "https://youtube.com/@yourchannel  or  @yourchannel"}
                    data-testid="input-profile-url"
                    className={`bg-card border-card-border pr-10 transition-colors ${isProfileLinked ? "border-green-500/40 focus-visible:ring-green-500/30" : ""}`}
                  />
                  {isProfileLinked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                </div>
                {isProfileLinked && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30 border">
                      {platform === "instagram" ? <Instagram className="w-2.5 h-2.5 mr-1" /> : <Youtube className="w-2.5 h-2.5 mr-1" />}
                      {detectedHandle} detected
                    </Badge>
                    {platformPosts.length > 0 && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        <Sparkles className="w-2.5 h-2.5 mr-1" />
                        {platformPosts.length} logged posts will be used as context
                      </Badge>
                    )}
                  </div>
                )}
                {!isProfileLinked && platformPosts.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Tip: Paste your profile link and AI will use your {platformPosts.length} logged {platform} posts to generate smarter, personalised ideas.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="niche" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3 h-3" /> Your Niche *
                </Label>
                <Input
                  id="niche"
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  placeholder="e.g. fitness, personal finance, cooking..."
                  data-testid="input-niche"
                  className="bg-card border-card-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Content Type
                </Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="bg-card border-card-border" data-testid="select-content-type">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Goal
                </Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="bg-card border-card-border" data-testid="select-goal">
                    <SelectValue placeholder="Select your goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="audience" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Target Audience
                </Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. women 25-35, new moms..."
                  data-testid="input-audience"
                  className="bg-card border-card-border"
                />
              </div>

              {platform === "youtube" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="yt-duration" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Video Length (minutes)
                    <span className="text-muted-foreground font-normal normal-case">— used when generating scripts</span>
                  </Label>
                  <Input
                    id="yt-duration"
                    value={ytVideoDuration}
                    onChange={e => setYtVideoDuration(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 10, 20, 35"
                    data-testid="input-yt-duration"
                    className="bg-card border-card-border"
                    type="number"
                    min="1"
                    max="120"
                  />
                </div>
              )}
            </div>

            {/* Hashtags — Instagram only */}
            {platform === "instagram" && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3 h-3" /> Popular Hashtags
                  <span className="text-muted-foreground font-normal normal-case">(optional — helps AI generate more targeted ideas)</span>
                </Label>

                {/* AI-powered hashtag suggestions */}
                {niche.trim().length >= 3 && (
                  <div>
                    {hashtagsLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] text-muted-foreground">Finding best hashtags for <span className="text-primary font-medium">{niche}</span>…</span>
                      </div>
                    ) : suggestedHashtags.length > 0 ? (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          AI-recommended for <span className="text-primary font-medium">{niche}</span> — click to add:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedHashtags.map(tag => {
                            const isSelected = hashtags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => isSelected ? removeHashtag(tag) : addHashtag(tag)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${isSelected ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                                data-testid={`suggested-hashtag-${tag}`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Manual hashtag input */}
                <div className="flex gap-2">
                  <Input
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && hashtagInput.trim()) { e.preventDefault(); addHashtag(hashtagInput); } }}
                    placeholder="Type a hashtag and press Enter..."
                    className="bg-card border-card-border h-8 text-xs flex-1"
                    data-testid="input-hashtag"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => hashtagInput.trim() && addHashtag(hashtagInput)}
                    className="h-8 px-3 text-xs"
                    data-testid="button-add-hashtag"
                  >
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>

                {/* Selected hashtags */}
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary rounded-full px-2.5 py-1 text-[11px] font-medium">
                        {tag}
                        <button onClick={() => removeHashtag(tag)} className="hover:text-destructive transition-colors ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="context" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Additional Context <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </Label>
              <Textarea
                id="context"
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="Any extra details — upcoming launch, seasonal topic, specific product you're promoting..."
                data-testid="textarea-context"
                className="bg-card border-card-border resize-none h-20"
              />
              <AiRefineButton text={additionalContext} onAccept={setAdditionalContext} context="additional context for content idea generation" />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
              data-testid="button-generate"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating ideas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isProfileLinked ? `Generate Ideas for ${detectedHandle}` : "Generate Content Ideas"}
                </>
              )}
            </Button>

            {isProfileLinked && platformPosts.length > 0 && (
              <p className="text-center text-[11px] text-muted-foreground -mt-2">
                AI will analyse your {platformPosts.length} logged posts to avoid repetition and fill content gaps
              </p>
            )}
          </CardContent>
        </Card>

        {ideas.length > 0 && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                  {ideas.length} ideas generated
                </Badge>
                <Badge variant="outline" className={`text-xs ${platform === "instagram" ? "border-pink-500/30 text-pink-400" : "border-red-500/30 text-red-400"}`}>
                  {platform === "instagram" ? <><Instagram className="w-3 h-3 mr-1" />Instagram</> : <><Youtube className="w-3 h-3 mr-1" />YouTube</>}
                </Badge>
                {isProfileLinked && (
                  <Badge className="text-xs bg-green-500/10 text-green-400 border border-green-500/30">
                    Personalised for {detectedHandle}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerate} data-testid="button-regenerate" className="text-xs h-8">
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Generate more
              </Button>
            </div>

            <div className="space-y-3">
              {ideas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} index={i} isLiked={likedIdeas.some(l => l.title === idea.title)} onToggleLike={toggleLike} onGetScript={handleGetScript} onPublish={setPublishIdea} platform={platform} />
              ))}
              {platform === "youtube" && (
                <p className="text-center text-[11px] text-muted-foreground pt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Script length: <span className="text-primary font-semibold">{ytVideoDuration ? `${ytVideoDuration} min` : "10 min (default)"}</span> — change it in the form above
                </p>
              )}
            </div>

            {contentMix && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PieChart className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Recommended Content Mix</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { label: "Growth", value: contentMix.growth, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                      { label: "Value", value: contentMix.value, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                      { label: "Conversion", value: contentMix.conversion, color: "bg-primary/20 text-primary border-primary/30" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-xl border p-2.5 text-center ${color}`}>
                        <p className="text-lg font-bold">{value}%</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 opacity-80">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{contentMix.suggestion}</p>
                </CardContent>
              </Card>
            )}

            <p className="text-center text-xs text-muted-foreground pt-2">
              Click <Heart className="w-3 h-3 inline text-red-400" /> to like an idea and save it · <Copy className="w-3 h-3 inline" /> to copy the caption
            </p>
          </div>
        )}

          </TabsContent>
        </Tabs>
      </div>

      {/* Full Script Dialog */}
      <Dialog open={!!scriptIdea} onOpenChange={(o) => { if (!o) { setScriptIdea(null); setScriptContent(""); } }}>
        <DialogContent className="max-w-3xl w-full flex flex-col" style={{ maxHeight: "88vh", overflow: "hidden" }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                {platform === "instagram" ? <Instagram className="w-3.5 h-3.5 text-pink-400" /> : <Youtube className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <span className="line-clamp-1">{scriptIdea?.title}</span>
            </DialogTitle>
          </DialogHeader>

          {scriptLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 flex-shrink-0">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Generating your full script…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is writing every word, hook, and CTA for you</p>
              </div>
            </div>
          ) : scriptContent ? (
            <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
              {/* Sticky header row */}
              <div className="flex items-center justify-between flex-shrink-0">
                <Badge variant="outline" className={`text-xs ${platform === "instagram" ? "border-pink-500/30 text-pink-400" : "border-red-500/30 text-red-400"}`}>
                  {platform === "instagram"
                    ? scriptIdea?.formatType === "carousel" ? "Instagram Carousel Script"
                      : scriptIdea?.formatType === "stories" ? "Instagram Stories Script"
                      : "Instagram Reel Script"
                    : `YouTube Script${scriptDuration ? ` — ${scriptDuration} min` : " — 10 min"}`}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(scriptContent);
                    toast({ title: "Script copied!", description: "Full script copied to clipboard." });
                  }}
                  data-testid="button-copy-script"
                >
                  <Copy className="w-3 h-3" /> Copy Script
                </Button>
              </div>

              {/* Scrollable script body */}
              <div className="overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}>
                <div className="space-y-3 pb-2">
                  {scriptContent.split(/\n(?=##)/).map((section, i) => {
                    const lines = section.trim().split("\n");
                    const heading = lines[0].replace(/^#+\s*/, "");
                    const body = lines.slice(1).join("\n").trim();
                    return (
                      <div key={i} className="bg-card border border-card-border rounded-xl p-4">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{heading}</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{body || heading}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {publishIdea && (
        <PublishModal
          open={!!publishIdea}
          onClose={() => setPublishIdea(null)}
          initialText={buildPublishText(publishIdea, platform)}
          defaultPlatform={platform === "linkedin" ? "linkedin" : "twitter"}
          ideaTitle={publishIdea.title}
        />
      )}
    </ClientLayout>
  );
}
