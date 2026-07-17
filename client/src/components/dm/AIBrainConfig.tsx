import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, Key, Plus, Trash2, Zap, TestTube, Save,
  Sparkles, Tag, MessageSquare, CheckCircle2, AlertCircle, Eye, EyeOff,
} from "lucide-react";

interface ExampleConv {
  userMsg: string;
  aiReply: string;
}

interface AutoTagRule {
  keyword: string;
  tag: string;
}

interface AiBrainConfigProps {
  clientId?: string;
}

export function AIBrainConfig({ clientId }: AiBrainConfigProps) {
  const { toast } = useToast();
  const qKey = ["/api/dm/ai-config", clientId];
  const qParams = clientId ? `?clientId=${clientId}` : "";

  const { data: cfg, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => apiRequest("GET", `/api/dm/ai-config${qParams}`),
  });

  const [provider, setProvider] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [examples, setExamples] = useState<ExampleConv[]>([{ userMsg: "", aiReply: "" }]);
  const [tagRules, setTagRules] = useState<AutoTagRule[]>([{ keyword: "", tag: "" }]);
  const [isActive, setIsActive] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [testReply, setTestReply] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (cfg && !initialized) {
    setProvider(cfg.provider || "claude");
    setSystemPrompt(cfg.systemPrompt || "");
    setVoiceDescription(cfg.voiceDescription || "");
    setExamples(cfg.exampleConversations?.length ? cfg.exampleConversations : [{ userMsg: "", aiReply: "" }]);
    setTagRules(cfg.autoTagRules?.length ? cfg.autoTagRules : [{ keyword: "", tag: "" }]);
    setIsActive(!!cfg.isActive);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/dm/ai-config${qParams}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast({ title: "AI Brain saved", description: "Config updated successfully." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: (msg: string) => apiRequest("POST", `/api/dm/ai-test${qParams}`, { message: msg }),
    onSuccess: (data: any) => {
      setTestReply(data.reply || "");
      toast({ title: "Test successful", description: `Reply from ${data.provider}` });
    },
    onError: (e: any) => {
      setTestReply("");
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    },
  });

  function handleSave() {
    if (!apiKey && !cfg?.apiKeyMasked) {
      toast({ title: "API key required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      provider: provider || "claude",
      apiKey: apiKey || "__keep__",
      systemPrompt,
      voiceDescription,
      exampleConversations: examples.filter(e => e.userMsg.trim()),
      autoTagRules: tagRules.filter(r => r.keyword.trim() && r.tag.trim()),
      isActive,
    });
  }

  function addExample() { setExamples(prev => [...prev, { userMsg: "", aiReply: "" }]); }
  function removeExample(i: number) { setExamples(prev => prev.filter((_, idx) => idx !== i)); }
  function updateExample(i: number, field: keyof ExampleConv, val: string) {
    setExamples(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }

  function addTagRule() { setTagRules(prev => [...prev, { keyword: "", tag: "" }]); }
  function removeTagRule(i: number) { setTagRules(prev => prev.filter((_, idx) => idx !== i)); }
  function updateTagRule(i: number, field: keyof AutoTagRule, val: string) {
    setTagRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Brain</h3>
            <p className="text-xs text-muted-foreground">Handle DMs in your voice using your own API key</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cfg ? (
            <Badge variant="outline" className="gap-1 text-xs border-green-500/30 text-green-400">
              <CheckCircle2 className="w-3 h-3" /> Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs border-muted text-muted-foreground">
              <AlertCircle className="w-3 h-3" /> Not set up
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" /> API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select value={provider || "claude"} onValueChange={setProvider}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                  <SelectItem value="gemini">Gemini (Google)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                API Key {cfg?.apiKeyMasked && <span className="text-muted-foreground">({cfg.apiKeyMasked})</span>}
              </Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={cfg?.apiKeyMasked ? "Enter new key to update" : "sk-ant-... or AIza..."}
                  className="h-9 text-xs pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Your key is encrypted at rest and never logged. We use it only to generate DM replies on your behalf.
          </p>
        </CardContent>
      </Card>

      {/* Voice Training */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> Voice & Tone Training
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Voice Description</Label>
            <Input
              value={voiceDescription}
              onChange={e => setVoiceDescription(e.target.value)}
              placeholder="e.g. Casual, warm, direct. Like a friend who's also an expert."
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder={`You are [name], a [role]. Your tone is [adjectives]. When someone DMs you:\n- Ask about their goals\n- Keep replies under 3 sentences\n- Never pitch immediately`}
              className="text-xs min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">This is the main instruction the AI follows in every DM.</p>
          </div>
        </CardContent>
      </Card>

      {/* Example Conversations */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Example Conversations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={addExample} className="h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {examples.map((ex, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Example {i + 1}</span>
                {examples.length > 1 && (
                  <button onClick={() => removeExample(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Incoming DM (user says)</Label>
                <Textarea
                  value={ex.userMsg}
                  onChange={e => updateExample(i, "userMsg", e.target.value)}
                  placeholder="Hey! I saw your post about X..."
                  className="text-xs min-h-[60px] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Your ideal reply (AI should match this)</Label>
                <Textarea
                  value={ex.aiReply}
                  onChange={e => updateExample(i, "aiReply", e.target.value)}
                  placeholder="Hey! Thanks for reaching out. Yeah, X is something I'm super passionate about..."
                  className="text-xs min-h-[60px] resize-none"
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">These examples teach the AI your exact tone. Add 3-5 for best results.</p>
        </CardContent>
      </Card>

      {/* Auto-Tag Rules */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" /> Auto-Tag Rules
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={addTagRule} className="h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" /> Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tagRules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={rule.keyword}
                onChange={e => updateTagRule(i, "keyword", e.target.value)}
                placeholder="Keyword (e.g. pricing)"
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground shrink-0">→ tag</span>
              <Input
                value={rule.tag}
                onChange={e => updateTagRule(i, "tag", e.target.value)}
                placeholder="Tag (e.g. pricing-interest)"
                className="h-8 text-xs"
              />
              {tagRules.length > 1 && (
                <button onClick={() => removeTagRule(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">If a keyword appears in the conversation, the AI auto-applies the tag to the lead.</p>
        </CardContent>
      </Card>

      {/* Test */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TestTube className="w-4 h-4 text-orange-400" /> Test Your AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={testMsg}
              onChange={e => setTestMsg(e.target.value)}
              placeholder="Type a sample DM..."
              className="h-9 text-xs"
            />
            <Button
              onClick={() => testMutation.mutate(testMsg)}
              disabled={testMutation.isPending || !cfg}
              size="sm"
              className="gap-1.5 h-9 text-xs shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              {testMutation.isPending ? "Testing..." : "Test"}
            </Button>
          </div>
          {!cfg && (
            <p className="text-xs text-amber-400">Save your config first before testing.</p>
          )}
          {testReply && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">AI Reply:</p>
              <p className="text-sm">{testReply}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save AI Brain"}
        </Button>
      </div>
    </div>
  );
}
