import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Sparkles, TrendingUp, Target, Zap, Brain, BarChart3,
  CheckCircle2, AlertCircle, Lightbulb, Award, Eye, Heart,
  MessageCircle, Bookmark, Share2, ArrowRight, Copy, Check, Instagram, Youtube, ChevronRight
} from "lucide-react";

const GOLD = "#d4b461";

export default function ContentIntelligence() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("analyze");
  
  // Analyze Content State
  const [contentToAnalyze, setContentToAnalyze] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Performance Feedback State
  const [feedbackContent, setFeedbackContent] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [saves, setSaves] = useState("");
  const [niche, setNiche] = useState("");
  
  // Brand Voice State
  const { data: brandVoice } = useQuery<any>({
    queryKey: ["/api/brand-voice"],
  });
  
  // Winning Patterns
  const { data: winningPatterns = [] } = useQuery<any[]>({
    queryKey: ["/api/winning-patterns"],
  });
  
  // Hook Library
  const { data: hookLibrary = [] } = useQuery<any[]>({
    queryKey: ["/api/hook-library"],
  });

  // Analyze Content Mutation
  const analyzeMut = useMutation({
    mutationFn: async (data: any) => {
      // Calculate viral score
      const viralScore = calculateViralScore(0, 0, 0, 0);
      const hook = extractHook(data.content);
      const hookType = classifyHookType(hook);
      const structure = analyzeContentStructure(data.content);
      
      return {
        hook,
        hookType,
        structure,
        viralScore: 0,
        suggestions: generateSuggestions(hook, hookType, structure),
        improvements: generateImprovements(data.content),
      };
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({ title: "Content analyzed!" });
    },
  });

  // Submit Performance Feedback
  const feedbackMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/performance-feedback", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/winning-patterns"] });
      toast({ title: "Performance feedback submitted! AI is learning..." });
      setFeedbackContent("");
      setViews("");
      setLikes("");
      setComments("");
      setSaves("");
    },
  });

  // Analyze Brand Voice
  const analyzeBrandVoiceMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/brand-voice/analyze"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand-voice"] });
      toast({ title: "Brand voice analyzed!" });
    },
  });

  const handleAnalyze = () => {
    if (!contentToAnalyze.trim()) {
      toast({ title: "Please enter content to analyze", variant: "destructive" });
      return;
    }
    analyzeMut.mutate({ content: contentToAnalyze, platform });
  };

  const handleFeedback = () => {
    if (!feedbackContent || !views || !likes || !niche) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    feedbackMut.mutate({
      content: feedbackContent,
      views: Number(views),
      likes: Number(likes),
      comments: Number(comments) || 0,
      saves: Number(saves) || 0,
      niche,
      platform,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}33` }}
              >
                <Brain className="w-6 h-6" style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Content Intelligence</h1>
                <p className="text-sm text-zinc-500">AI-powered content analysis & learning system</p>
              </div>
            </div>
          </div>
          <Badge
            className="text-xs font-bold px-3 py-1"
            style={{ background: `${GOLD}22`, color: GOLD, border: "none" }}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Trained on 10,000+ viral posts
          </Badge>
        </div>

        {/* Quick Links to Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/tracking/content/instagram">
            <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30 hover:border-pink-500/50 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Instagram className="w-6 h-6 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">Instagram Tracking</p>
                      <p className="text-xs text-zinc-400">Analyze your Instagram posts with AI</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-pink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tracking/content/youtube">
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30 hover:border-red-500/50 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Youtube className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">YouTube Tracking</p>
                      <p className="text-xs text-zinc-400">Analyze your YouTube videos with AI</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Award}
            label="Winning Patterns"
            value={winningPatterns.length}
            color="#34d399"
          />
          <StatCard
            icon={Zap}
            label="Hook Library"
            value={hookLibrary.length}
            color={GOLD}
          />
          <StatCard
            icon={Target}
            label="Avg Viral Score"
            value={
              winningPatterns.length > 0
                ? (winningPatterns.reduce((s: number, p: any) => s + p.viralScore, 0) / winningPatterns.length).toFixed(1)
                : "0.0"
            }
            color="#a78bfa"
          />
          <StatCard
            icon={TrendingUp}
            label="Brand Voice"
            value={brandVoice ? "Analyzed" : "Not Set"}
            color="#60a5fa"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="analyze" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Analyze Content
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Submit Performance
            </TabsTrigger>
            <TabsTrigger value="patterns" className="gap-2">
              <Award className="w-4 h-4" />
              Winning Patterns
            </TabsTrigger>
            <TabsTrigger value="hooks" className="gap-2">
              <Zap className="w-4 h-4" />
              Hook Library
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Brain className="w-4 h-4" />
              Brand Voice
            </TabsTrigger>
          </TabsList>

          {/* ANALYZE CONTENT TAB */}
          <TabsContent value="analyze" className="space-y-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
                  Analyze Your Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Platform</label>
                  <div className="flex gap-2">
                    {["instagram", "youtube", "tiktok", "linkedin"].map((p) => (
                      <Button
                        key={p}
                        variant={platform === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlatform(p)}
                        className={platform === p ? "" : "border-zinc-700 text-zinc-400"}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Content / Caption</label>
                  <Textarea
                    placeholder="Paste your content here to analyze hook, structure, and viral potential..."
                    value={contentToAnalyze}
                    onChange={(e) => setContentToAnalyze(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white min-h-32"
                  />
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMut.isPending}
                  className="w-full font-semibold"
                  style={{ background: GOLD, color: "#000" }}
                >
                  {analyzeMut.isPending ? "Analyzing..." : "Analyze Content"}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysisResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/60 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white text-base">Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Hook Detected</p>
                      <p className="text-sm text-white font-medium">{analysisResult.hook || "No clear hook found"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Hook Type</p>
                      <Badge style={{ background: `${GOLD}22`, color: GOLD }}>
                        {analysisResult.hookType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Content Structure</p>
                      <p className="text-sm text-white">{analysisResult.structure}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/60 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" style={{ color: GOLD }} />
                      Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.suggestions.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* SUBMIT PERFORMANCE TAB */}
          <TabsContent value="feedback" className="space-y-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" style={{ color: GOLD }} />
                  Submit Performance Feedback
                </CardTitle>
                <p className="text-sm text-zinc-500">Train the AI on what works for YOU</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Content / Caption</label>
                  <Textarea
                    placeholder="Paste the content that performed well..."
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white min-h-24"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Views *
                    </label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={views}
                      onChange={(e) => setViews(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-1">
                      <Heart className="w-3 h-3" /> Likes *
                    </label>
                    <Input
                      type="number"
                      placeholder="500"
                      value={likes}
                      onChange={(e) => setLikes(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> Comments
                    </label>
                    <Input
                      type="number"
                      placeholder="50"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-1">
                      <Bookmark className="w-3 h-3" /> Saves
                    </label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={saves}
                      onChange={(e) => setSaves(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Niche *</label>
                  <Input
                    placeholder="e.g. Business Coaching, Fitness, Finance..."
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <Button
                  onClick={handleFeedback}
                  disabled={feedbackMut.isPending}
                  className="w-full font-semibold"
                  style={{ background: GOLD, color: "#000" }}
                >
                  {feedbackMut.isPending ? "Submitting..." : "Submit Performance Data"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WINNING PATTERNS TAB */}
          <TabsContent value="patterns" className="space-y-4">
            {winningPatterns.length === 0 ? (
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <Award className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No winning patterns yet</p>
                  <p className="text-sm text-zinc-600 mt-1">Submit performance feedback to build your pattern library</p>
                </CardContent>
              </Card>
            ) : (
              winningPatterns.map((pattern: any) => (
                <Card key={pattern.id} className="bg-zinc-900/60 border-zinc-800">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge style={{ background: `${GOLD}22`, color: GOLD }}>
                            {pattern.hookType}
                          </Badge>
                          <Badge className="bg-green-500/20 text-green-400 border-none">
                            Viral Score: {pattern.viralScore.toFixed(1)}
                          </Badge>
                        </div>
                        <p className="text-white font-medium mb-1">{pattern.hook}</p>
                        <p className="text-xs text-zinc-500">{pattern.structure}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {pattern.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {pattern.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {pattern.engagementRate.toFixed(2)}% ER
                      </span>
                    </div>
                    {pattern.performanceReason && (
                      <p className="text-xs text-zinc-600 mt-2 italic">{pattern.performanceReason}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* HOOK LIBRARY TAB */}
          <TabsContent value="hooks" className="space-y-4">
            {hookLibrary.length === 0 ? (
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">Hook library is empty</p>
                  <p className="text-sm text-zinc-600 mt-1">Submit high-performing content to build your hook library</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hookLibrary.map((hook: any) => (
                  <Card key={hook.id} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge style={{ background: `${GOLD}22`, color: GOLD, fontSize: "10px" }}>
                          {hook.hookType}
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-400 border-none text-[10px]">
                          {hook.viralScore.toFixed(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-white font-medium mb-2">{hook.hook}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{hook.platform}</span>
                        <span>•</span>
                        <span>{hook.avgViews.toLocaleString()} avg views</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BRAND VOICE TAB */}
          <TabsContent value="voice" className="space-y-6">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5" style={{ color: GOLD }} />
                  Brand Voice Analysis
                </CardTitle>
                <p className="text-sm text-zinc-500">Analyze your existing content to extract your unique voice</p>
              </CardHeader>
              <CardContent>
                {!brandVoice ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-500 mb-4">No brand voice profile yet</p>
                    <Button
                      onClick={() => analyzeBrandVoiceMut.mutate()}
                      disabled={analyzeBrandVoiceMut.isPending}
                      style={{ background: GOLD, color: "#000" }}
                    >
                      {analyzeBrandVoiceMut.isPending ? "Analyzing..." : "Analyze My Brand Voice"}
                    </Button>
                    <p className="text-xs text-zinc-600 mt-3">Requires at least 5 posts in your content library</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Tone</p>
                        <p className="text-sm text-white font-medium">{brandVoice.tone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Sentence Structure</p>
                        <p className="text-sm text-white font-medium">{brandVoice.sentenceStructure}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Punctuation Style</p>
                        <p className="text-sm text-white font-medium">{brandVoice.punctuationStyle}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Perspective</p>
                        <p className="text-sm text-white font-medium">{brandVoice.perspective}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Voice Fingerprint</p>
                      <p className="text-sm text-white font-medium">{brandVoice.voiceFingerprint}</p>
                    </div>
                    {brandVoice.uniquePatterns && brandVoice.uniquePatterns.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Unique Patterns</p>
                        <div className="flex flex-wrap gap-2">
                          {brandVoice.uniquePatterns.map((p: string, i: number) => (
                            <Badge key={i} className="bg-zinc-800 text-zinc-300 border-zinc-700">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={() => analyzeBrandVoiceMut.mutate()}
                      disabled={analyzeBrandVoiceMut.isPending}
                      variant="outline"
                      className="w-full border-zinc-700 text-zinc-300"
                    >
                      Re-analyze Brand Voice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}33` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions (client-side versions)
function calculateViralScore(views: number, likes: number, comments: number, saves: number): number {
  if (views === 0) return 0;
  const engagementRate = ((likes + comments * 2 + saves * 3) / views) * 100;
  let score = 0;
  if (views >= 1000000) score += 3;
  else if (views >= 500000) score += 2.5;
  else if (views >= 100000) score += 2;
  else if (views >= 50000) score += 1.5;
  else if (views >= 10000) score += 1;
  if (engagementRate >= 10) score += 4;
  else if (engagementRate >= 7) score += 3;
  else if (engagementRate >= 5) score += 2;
  else if (engagementRate >= 3) score += 1;
  return Math.min(10, Math.max(0, score));
}

function extractHook(caption: string): string {
  if (!caption) return "";
  const lines = caption.split("\n").filter(l => l.trim());
  if (lines.length === 0) return "";
  const firstLine = lines[0].trim();
  if (firstLine.length < 100) return firstLine;
  const sentences = firstLine.split(/[.!?]/);
  return sentences[0].trim();
}

function classifyHookType(hook: string): string {
  const lower = hook.toLowerCase();
  if (/\b(secret|nobody|hidden|revealed|truth|exposed)\b/.test(lower)) return "curiosity";
  if (/\b(after analyzing|studied|research|data shows)\b/.test(lower)) return "authority";
  if (/\b(i was|i used to|my journey|my story)\b/.test(lower)) return "storytelling";
  if (/\b(unpopular opinion|hot take|controversial)\b/.test(lower)) return "controversy";
  if (/\b(struggling|frustrated|tired of)\b/.test(lower)) return "pain_point";
  if (hook.includes("?")) return "question";
  if (/\b(results?|proof|case study)\b/.test(lower)) return "proof";
  return "education";
}

function analyzeContentStructure(caption: string): string {
  if (!caption) return "Unknown";
  const lower = caption.toLowerCase();
  const structure: string[] = [];
  if (/\b(problem|issue|struggle)\b/.test(lower)) structure.push("Problem");
  if (/\b(solution|answer|fix|how to)\b/.test(lower)) structure.push("Solution");
  if (/\b(step \d|first|second|third)\b/.test(lower)) structure.push("Steps");
  if (/\b(follow|save|share|comment)\b/.test(lower)) structure.push("CTA");
  return structure.length > 0 ? structure.join(" → ") : "Hook → Value → CTA";
}

function generateSuggestions(hook: string, hookType: string, structure: string): string[] {
  const suggestions = [];
  if (!hook || hook.length < 10) {
    suggestions.push("Add a stronger hook in the first line to grab attention");
  }
  if (hookType === "education") {
    suggestions.push("Consider using curiosity or controversy hooks for higher engagement");
  }
  if (!structure.includes("CTA")) {
    suggestions.push("Add a clear call-to-action at the end (follow, save, comment)");
  }
  if (!structure.includes("Problem")) {
    suggestions.push("Start with a relatable problem to connect with your audience");
  }
  suggestions.push("Test different hook types to see what resonates with your audience");
  return suggestions;
}

function generateImprovements(content: string): string[] {
  return [
    "Make the first line more curiosity-driven",
    "Add specific numbers or data points for credibility",
    "Include a clear call-to-action",
    "Break up long paragraphs for better readability",
  ];
}
