import { useState, useMemo } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles, Instagram, Youtube, Lightbulb, Copy, Heart,
  RefreshCw, ChevronDown, ChevronUp, Zap, Target, Users, MessageSquare, Link, CheckCircle2, TrendingUp, PieChart
} from "lucide-react";

interface ContentIdea {
  title: string;
  concept: string;
  captionStarter: string;
  tip?: string;
  formatType?: string;
  whyItWorks?: string;
  cta?: string;
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

function IdeaCard({ idea, index }: { idea: ContentIdea; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!`, description: "Pasted to clipboard." });
  };

  return (
    <Card className="border border-card-border transition-all duration-200 hover:border-primary/30" data-testid={`idea-card-${index}`}>
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
                  onClick={() => setSaved(s => !s)}
                  data-testid={`save-idea-${index}`}
                  className={`p-1.5 rounded-lg transition-colors ${saved ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"}`}
                  title="Save idea"
                >
                  <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
                </button>
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

                <div className="bg-card border border-card-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Caption / Script Opener</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(idea.captionStarter, "Caption")}
                      data-testid={`copy-caption-${index}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Copy caption"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground italic leading-relaxed">"{idea.captionStarter}"</p>
                </div>

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

                {(idea.tip && !idea.whyItWorks) && (
                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3">
                    <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Pro Tip</span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{idea.tip}</p>
                    </div>
                  </div>
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
  const [platform, setPlatform] = useState<"instagram" | "youtube">("instagram");
  const [profileUrl, setProfileUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [contentType, setContentType] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [contentMix, setContentMix] = useState<ContentMix | null>(null);
  const [loading, setLoading] = useState(false);

  const contentTypes = platform === "instagram" ? IG_CONTENT_TYPES : YT_CONTENT_TYPES;

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
    setIdeas([]);
    setContentMix(null);
    try {
      const data = await apiRequest("POST", "/api/ai/content-ideas", {
        platform, niche, contentType, goal, audience, additionalContext,
        profileHandle: detectedHandle || undefined,
        existingPosts: platformPosts.slice(0, 20),
      });
      setIdeas(Array.isArray(data) ? data : (data?.ideas ?? []));
      if (data?.contentMix) setContentMix(data.contentMix);
    } catch (err: any) {
      const msg: string = err.message || "Failed to generate ideas";
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isProfileLinked = !!detectedHandle;

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Content Ideas</h1>
            <p className="text-xs text-muted-foreground">Personalized ideas powered by Gemini AI — the more context you give, the smarter the ideas</p>
          </div>
        </div>

        <Card className="border border-card-border">
          <CardContent className="p-6 space-y-5">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Platform</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setPlatform("instagram"); setContentType(""); setProfileUrl(""); }}
                  data-testid="platform-instagram"
                  className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                    platform === "instagram"
                      ? "bg-pink-500/10 border-pink-500/40 text-pink-400"
                      : "border-border text-muted-foreground hover:border-pink-500/30 hover:text-pink-400"
                  }`}
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </button>
                <button
                  onClick={() => { setPlatform("youtube"); setContentType(""); setProfileUrl(""); }}
                  data-testid="platform-youtube"
                  className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                    platform === "youtube"
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : "border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400"
                  }`}
                >
                  <Youtube className="w-4 h-4" />
                  YouTube
                </button>
              </div>
            </div>

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
            </div>

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

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border border-card-border">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
                <IdeaCard key={i} idea={idea} index={i} />
              ))}
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
              Click <Heart className="w-3 h-3 inline text-red-400" /> to save your favourites · <Copy className="w-3 h-3 inline" /> to copy the caption
            </p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
