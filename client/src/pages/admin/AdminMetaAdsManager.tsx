import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Crown, BarChart2, Target, DollarSign, TrendingUp, TrendingDown, Zap, RefreshCw,
  Plus, Trash2, CheckCircle2, AlertTriangle, Brain, FileText, ChevronRight,
  MousePointerClick, Eye, Users, Activity, Lightbulb, Calendar, ArrowUpRight,
  Copy, Check, Layers, Settings2, Rocket, Play, Pause, Send, MessageSquare,
  Globe, History, ExternalLink, MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ── Formatters ────────────────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number) { return (v || 0).toFixed(2) + "%"; }
function fmtRoas(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "–";
  return v.toFixed(2) + "x";
}

const STAGE_COLORS: Record<string, string> = {
  tofu: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  mofu: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  bofu: "bg-green-500/10 text-green-400 border-green-500/20",
};
const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

// ── Campaign Architect Tab ─────────────────────────────────────────────────
function CampaignArchitectTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    budget: "", goalType: "LEADS", niche: "", offer: "",
    targetAudience: "", funnelType: "full_funnel", budgetStrategy: "CBO", currency: "USD",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<any>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchCountries, setLaunchCountries] = useState("US");

  async function handleLaunch() {
    if (!result || !clientId) return;
    setLaunching(true);
    try {
      const countries = launchCountries.split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
      const data = await apiRequest("POST", `/api/meta-ads/launch/${clientId}`, {
        blueprint: result,
        countries,
      });
      setLaunchResult(data);
    } catch (e: any) {
      setLaunchResult({ error: e.message, permissionRequired: e.message?.includes("ads_management") });
    } finally {
      setLaunching(false);
    }
  }

  async function handleGenerate() {
    if (!form.budget || !form.niche || !form.offer) {
      toast({ title: "Fill budget, niche, and offer", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("POST", "/api/meta-ads/architect", form);
      setResult(data);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-5">
        <Card className="border border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" /> Campaign Blueprint Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monthly Budget ($)</Label>
                <Input value={form.budget} onChange={e => set("budget", e.target.value)} placeholder="e.g. 3000" className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={form.currency} onValueChange={v => set("currency", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "CAD", "AUD", "INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Campaign Goal</Label>
              <Select value={form.goalType} onValueChange={v => set("goalType", v)}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEADS">Lead Generation</SelectItem>
                  <SelectItem value="SALES">Sales / Conversions</SelectItem>
                  <SelectItem value="TRAFFIC">Website Traffic</SelectItem>
                  <SelectItem value="AWARENESS">Brand Awareness</SelectItem>
                  <SelectItem value="APP_INSTALLS">App Installs</SelectItem>
                  <SelectItem value="VIDEO_VIEWS">Video Views</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Niche / Industry</Label>
              <Input value={form.niche} onChange={e => set("niche", e.target.value)} placeholder="e.g. Online fitness coaching for women" className="mt-1 h-9" />
            </div>

            <div>
              <Label className="text-xs">Offer / Product</Label>
              <Input value={form.offer} onChange={e => set("offer", e.target.value)} placeholder="e.g. Free 30-min strategy call" className="mt-1 h-9" />
            </div>

            <div>
              <Label className="text-xs">Target Audience (optional)</Label>
              <Textarea value={form.targetAudience} onChange={e => set("targetAudience", e.target.value)} placeholder="e.g. Women 25-45, interested in fitness, weight loss, healthy lifestyle" className="mt-1 text-xs h-20 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Funnel Type</Label>
                <Select value={form.funnelType} onValueChange={v => set("funnelType", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_funnel">Full Funnel (TOFU+MOFU+BOFU)</SelectItem>
                    <SelectItem value="single">Single Stage (Conversion)</SelectItem>
                    <SelectItem value="awareness_only">Awareness Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Budget Strategy</Label>
                <Select value={form.budgetStrategy} onValueChange={v => set("budgetStrategy", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBO">CBO (Campaign Budget)</SelectItem>
                    <SelectItem value="ABO">ABO (Ad Set Budget)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Designing Structure...</> : <><Brain className="w-4 h-4 mr-2" /> Generate Campaign Blueprint</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right: Output */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center h-full">
            <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">AI blueprint will appear here</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Fill the form and click Generate</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Strategy summary */}
            <Card className="border border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> AI Strategy
                  </p>
                  <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{result.strategy_summary}</p>
              </CardContent>
            </Card>

            {/* Budget breakdown */}
            {result.budget_breakdown && (
              <Card className="border border-card-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Budget Breakdown</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "TOFU", pct: result.budget_breakdown.tofu_percent, amount: result.budget_breakdown.tofu_monthly, color: "text-blue-400" },
                      { label: "MOFU", pct: result.budget_breakdown.mofu_percent, amount: result.budget_breakdown.mofu_monthly, color: "text-yellow-400" },
                      { label: "BOFU", pct: result.budget_breakdown.bofu_percent, amount: result.budget_breakdown.bofu_monthly, color: "text-green-400" },
                    ].map(({ label, pct, amount, color }) => (
                      <div key={label} className="bg-muted/20 rounded-lg p-3 text-center">
                        <p className={`text-base font-bold ${color}`}>{pct}%</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-xs font-semibold text-foreground mt-1">{fmtCurrency(amount || 0)}/mo</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaigns */}
            {result.campaigns?.map((camp: any, i: number) => (
              <Card key={i} className="border border-card-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{camp.name}</p>
                    <Badge variant="outline" className={`text-[10px] border ${STAGE_COLORS[camp.stage] || ""}`}>{camp.stage?.toUpperCase()}</Badge>
                    <Badge variant="outline" className="text-[10px]">{camp.objective}</Badge>
                    <Badge variant="outline" className="text-[10px]">{camp.budget_type}</Badge>
                    <span className="ml-auto text-xs font-bold text-foreground">{fmtCurrency(camp.monthly_budget || 0)}/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{camp.rationale}</p>
                  {camp.ad_sets?.map((adset: any, j: number) => (
                    <div key={j} className="ml-3 pl-3 border-l border-border space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">{adset.name}</p>
                        <Badge variant="outline" className="text-[10px]">{adset.audience_type}</Badge>
                        <span className="ml-auto text-xs text-muted-foreground">${adset.daily_budget}/day</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{adset.audience_description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Testing framework */}
            {result.testing_framework && (
              <Card className="border border-card-border">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Testing Framework</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-muted/20 rounded-lg p-2.5">
                      <p className="font-semibold text-foreground mb-1">Week 1-2</p>
                      <p className="text-muted-foreground">{result.testing_framework.phase_1}</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2.5">
                      <p className="font-semibold text-foreground mb-1">Week 3-4</p>
                      <p className="text-muted-foreground">{result.testing_framework.phase_2}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5">
                    Kill threshold: {result.testing_framework.kill_threshold}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Estimated results */}
            {result.estimated_results && (
              <Card className="border border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Estimated Results</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Expected ROAS</p><p className="font-bold text-foreground">{result.estimated_results.expected_roas_range}</p></div>
                    <div><p className="text-muted-foreground">Expected CPA</p><p className="font-bold text-foreground">{result.estimated_results.expected_cpa_range}</p></div>
                    <div><p className="text-muted-foreground">Break-even ROAS</p><p className="font-bold text-foreground">{result.estimated_results.break_even_roas}x</p></div>
                    <div><p className="text-muted-foreground">Days to Optimize</p><p className="font-bold text-foreground">{result.estimated_results.days_to_optimize} days</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Launch checklist */}
            {result.launch_checklist?.length > 0 && (
              <Card className="border border-card-border">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Launch Checklist</p>
                  {result.launch_checklist.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Launch to Meta */}
            <Card className="border border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                      <Rocket className="w-4 h-4" /> Launch to Meta Ads Manager
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Creates all campaigns as PAUSED. Add creatives in Meta then activate.
                    </p>
                  </div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
                    onClick={() => { setLaunchResult(null); setShowLaunchModal(true); }}
                  >
                    <Rocket className="w-4 h-4" /> Launch Blueprint
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Launch Modal */}
      <Dialog open={showLaunchModal} onOpenChange={setShowLaunchModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-blue-400" /> Launch Blueprint to Meta
            </DialogTitle>
          </DialogHeader>
          {!launchResult ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Target Countries (comma-separated ISO codes)</Label>
                <Input
                  value={launchCountries}
                  onChange={e => setLaunchCountries(e.target.value)}
                  placeholder="US, CA, GB, AU"
                  className="mt-1 h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">e.g. US, CA, GB, AU, IN</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
                Requires <strong>ads_management</strong> permission on your Meta app. All campaigns launch as PAUSED — nothing spends until you activate in Meta Ads Manager.
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleLaunch} disabled={launching}>
                  {launching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {launching ? "Creating campaigns..." : "Confirm Launch"}
                </Button>
                <Button variant="ghost" onClick={() => setShowLaunchModal(false)}>Cancel</Button>
              </div>
            </div>
          ) : launchResult.error ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
                <p className="font-semibold mb-1">Launch Failed</p>
                <p>{launchResult.error}</p>
              </div>
              {launchResult.permissionRequired && (
                <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">How to get ads_management:</p>
                  <p>1. Go to developers.facebook.com → your app</p>
                  <p>2. Add Product → Marketing API</p>
                  <p>3. Request permission: ads_management</p>
                  <p>4. For your own account: works immediately in development mode</p>
                  <p>5. For client accounts: requires Meta App Review (1–3 weeks)</p>
                </div>
              )}
              <Button variant="ghost" className="w-full" onClick={() => setShowLaunchModal(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 mb-2" />
                <p className="font-semibold">{launchResult.message}</p>
              </div>
              {launchResult.created?.map((c: any, i: number) => (
                <div key={i} className="rounded-lg border border-border p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">{c.campaignName}</p>
                  <p className="text-muted-foreground">Campaign ID: {c.campaignId}</p>
                  {c.adSets?.map((s: any) => (
                    <p key={s.id} className="text-muted-foreground pl-2">↳ Ad Set: {s.name} ({s.id})</p>
                  ))}
                </div>
              ))}
              <Button className="w-full" onClick={() => setShowLaunchModal(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Budget Intelligence Tab ────────────────────────────────────────────────
function BudgetIntelligenceTab({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const { toast } = useToast();
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizerResult, setOptimizerResult] = useState<any>(null);
  const [newRule, setNewRule] = useState({
    name: "", conditionMetric: "roas", conditionOperator: "lt",
    conditionValue: "", conditionWindowDays: "3", actionType: "alert", actionValue: "",
  });
  const [cogsForm, setCogsForm] = useState({ productName: "", sellingPrice: "", cogsAmount: "" });
  const [showCogsForm, setShowCogsForm] = useState(false);

  const { data: pacing } = useQuery<any>({
    queryKey: ["/api/meta-ads/spend-pacing", clientId, monthlyBudget],
    queryFn: () => apiRequest("GET", `/api/meta-ads/spend-pacing/${clientId}?monthlyBudget=${monthlyBudget}`),
    enabled: !!clientId,
  });

  const { data: rules = [], refetch: refetchRules } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/scaling-rules", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/scaling-rules/${clientId}`),
    enabled: !!clientId,
  });

  const { data: profitData } = useQuery<any>({
    queryKey: ["/api/meta-ads/profit-analysis", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/profit-analysis/${clientId}`),
    enabled: !!clientId,
  });

  const { data: cogs, refetch: refetchCogs } = useQuery<any>({
    queryKey: ["/api/meta-ads/cogs", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/cogs/${clientId}`),
    enabled: !!clientId,
  });

  const createRule = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/meta-ads/scaling-rules", { ...data, clientId }),
    onSuccess: () => {
      refetchRules();
      toast({ title: "Rule created" });
      setNewRule({ name: "", conditionMetric: "roas", conditionOperator: "lt", conditionValue: "", conditionWindowDays: "3", actionType: "alert", actionValue: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/meta-ads/scaling-rules/${id}`),
    onSuccess: () => { refetchRules(); toast({ title: "Rule deleted" }); },
  });

  const saveCogs = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/meta-ads/cogs/${clientId}`, data),
    onSuccess: () => {
      refetchCogs();
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/profit-analysis", clientId] });
      toast({ title: "COGS saved" });
      setShowCogsForm(false);
    },
  });

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const data = await apiRequest("POST", `/api/meta-ads/budget-optimizer/${clientId}`, { monthlyBudget: monthlyBudget || undefined });
      setOptimizerResult(data);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  }

  const pacingStatus = pacing?.status;
  const pacingColors: Record<string, string> = {
    overpacing: "bg-red-500/10 border-red-500/20 text-red-400",
    underpacing: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    on_track: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    no_budget: "bg-muted/30 border-border text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Spend pacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`border ${pacingColors[pacingStatus || "no_budget"] || "border-border"} col-span-1`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Spend Pacing</p>
            </div>
            <p className="text-2xl font-bold">{pacing?.pacingPct != null ? fmtPct(pacing.pacingPct) : "–"}</p>
            <p className="text-xs mt-1">
              {pacingStatus === "overpacing" && `On track to overspend by ${fmtCurrency(pacing?.overspendAmount || 0)}`}
              {pacingStatus === "underpacing" && `Underspending — ${fmtCurrency(pacing?.underspendAmount || 0)} remaining capacity`}
              {pacingStatus === "on_track" && "On track for the month"}
              {pacingStatus === "no_budget" && "Set monthly budget below"}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Input
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
                placeholder="Monthly budget $"
                className="h-7 text-xs flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profit summary */}
        {profitData?.totals && (
          <>
            <Card className="border border-card-border">
              <CardContent className="p-4">
                <DollarSign className="w-4 h-4 text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-foreground">{fmtCurrency(profitData.totals.totalNetProfit)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Net Profit (30d)</p>
                <p className={`text-xs mt-1 font-semibold ${profitData.totals.totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {profitData.totals.totalNetProfit >= 0 ? "Profitable" : "In the red"}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-card-border">
              <CardContent className="p-4">
                <TrendingUp className="w-4 h-4 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-foreground">{fmtRoas(profitData.totals.overallProfitRoas)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Profit ROAS (after COGS)</p>
                {!cogs && (
                  <button onClick={() => setShowCogsForm(true)} className="text-[10px] text-primary mt-1 hover:underline">
                    + Add COGS for accurate profit
                  </button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* COGS form */}
      {(showCogsForm || !cogs) && (
        <Card className="border border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              {cogs ? "Update" : "Add"} COGS for Profit Calculation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Product Name</Label>
                <Input value={cogsForm.productName || cogs?.product_name || ""} onChange={e => setCogsForm(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Coaching Program" className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Selling Price ($)</Label>
                <Input type="number" value={cogsForm.sellingPrice || cogs?.selling_price || ""} onChange={e => setCogsForm(f => ({ ...f, sellingPrice: e.target.value }))} placeholder="e.g. 1000" className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs">COGS ($)</Label>
                <Input type="number" value={cogsForm.cogsAmount || cogs?.cogs_amount || ""} onChange={e => setCogsForm(f => ({ ...f, cogsAmount: e.target.value }))} placeholder="e.g. 200" className="mt-1 h-9 text-xs" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-8 text-xs" onClick={() => saveCogs.mutate(cogsForm)} disabled={saveCogs.isPending}>
                {saveCogs.isPending ? "Saving..." : "Save COGS"}
              </Button>
              {cogs && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowCogsForm(false)}>Cancel</Button>}
            </div>
          </CardContent>
        </Card>
      )}
      {cogs && !showCogsForm && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          COGS: {cogs.product_name} — sell {fmtCurrency(parseFloat(cogs.selling_price))}, cost {fmtCurrency(parseFloat(cogs.cogs_amount))}, margin {fmtCurrency(parseFloat(cogs.selling_price) - parseFloat(cogs.cogs_amount))} per sale
          <button onClick={() => setShowCogsForm(true)} className="text-primary hover:underline">Edit</button>
        </div>
      )}

      {/* Per-campaign profit table */}
      {profitData?.campaigns?.length > 0 && (
        <Card className="border border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Profit by Campaign</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Campaign</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Spend</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Conv.</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Revenue</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Net Profit</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">P-ROAS</th>
                </tr>
              </thead>
              <tbody>
                {profitData.campaigns.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground truncate max-w-[160px]">{c.campaignName}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtCurrency(c.spend)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell">{c.conversions}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell">{fmtCurrency(c.revenue)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${c.isProfit ? "text-emerald-400" : "text-red-400"}`}>
                      {c.isProfit ? "+" : ""}{fmtCurrency(c.netProfit)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold ${c.profitRoas >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtRoas(c.profitRoas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* AI Budget Optimizer */}
      <Card className="border border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" /> AI Budget Optimizer
            </CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleOptimize} disabled={optimizing}>
              {optimizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              {optimizing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </CardHeader>
        {optimizerResult && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{optimizerResult.summary}</p>
              </div>
              <div className="text-center px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xl font-bold text-primary">{optimizerResult.score}</p>
                <p className="text-[10px] text-muted-foreground">Health</p>
              </div>
            </div>

            {optimizerResult.quick_wins?.length > 0 && (
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Quick Wins</p>
                {optimizerResult.quick_wins.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Zap className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {optimizerResult.suggestions?.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.priority === "high" ? "bg-red-400" : s.priority === "medium" ? "bg-yellow-400" : "bg-emerald-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] capitalize ${s.type === "scale" ? "text-emerald-400 border-emerald-500/20" : s.type === "pause" ? "text-red-400 border-red-500/20" : "text-blue-400 border-blue-500/20"}`}>
                        {s.type}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">{s.campaign}</span>
                      <span className={`text-[10px] ml-auto ${PRIORITY_COLORS[s.priority]}`}>{s.priority} priority</span>
                    </div>
                    <p className="text-xs text-foreground mt-1">{s.action}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.reason}</p>
                    {s.expected_impact && <p className="text-[11px] text-emerald-400 mt-0.5">→ {s.expected_impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
        {!optimizerResult && !optimizing && (
          <CardContent>
            <p className="text-xs text-muted-foreground text-center py-4">Click Analyze to get AI-powered budget recommendations based on your current campaign performance.</p>
          </CardContent>
        )}
      </Card>

      {/* Scaling rules */}
      <Card className="border border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" /> Auto-Scaling Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add rule form */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold text-foreground">New Rule</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="col-span-2 md:col-span-1">
                <Input value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="Rule name" className="h-8 text-xs" />
              </div>
              <Select value={newRule.conditionMetric} onValueChange={v => setNewRule(r => ({ ...r, conditionMetric: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["roas", "ctr", "cpc", "cpm", "conversions", "spend"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newRule.conditionOperator} onValueChange={v => setNewRule(r => ({ ...r, conditionOperator: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">&gt; greater than</SelectItem>
                  <SelectItem value="lt">&lt; less than</SelectItem>
                  <SelectItem value="gte">≥ at least</SelectItem>
                  <SelectItem value="lte">≤ at most</SelectItem>
                </SelectContent>
              </Select>
              <Input value={newRule.conditionValue} onChange={e => setNewRule(r => ({ ...r, conditionValue: e.target.value }))} placeholder="Value (e.g. 2)" className="h-8 text-xs" />
              <Select value={newRule.actionType} onValueChange={v => setNewRule(r => ({ ...r, actionType: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">Alert me</SelectItem>
                  <SelectItem value="increase_budget">Increase budget %</SelectItem>
                  <SelectItem value="decrease_budget">Decrease budget %</SelectItem>
                  <SelectItem value="pause">Pause campaign</SelectItem>
                </SelectContent>
              </Select>
              {(newRule.actionType === "increase_budget" || newRule.actionType === "decrease_budget") && (
                <Input value={newRule.actionValue} onChange={e => setNewRule(r => ({ ...r, actionValue: e.target.value }))} placeholder="% amount" className="h-8 text-xs" />
              )}
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5" disabled={!newRule.name || !newRule.conditionValue || createRule.isPending}
              onClick={() => createRule.mutate({
                name: newRule.name, conditionMetric: newRule.conditionMetric,
                conditionOperator: newRule.conditionOperator, conditionValue: parseFloat(newRule.conditionValue),
                conditionWindowDays: parseInt(newRule.conditionWindowDays),
                actionType: newRule.actionType, actionValue: newRule.actionValue ? parseFloat(newRule.actionValue) : undefined,
              })}>
              <Plus className="w-3 h-3" /> Add Rule
            </Button>
          </div>

          {/* Rules list */}
          {rules.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No rules yet. Add a rule above.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule: any) => (
                <div key={rule.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.is_active ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{rule.name}</p>
                    <p className="text-muted-foreground">
                      If {rule.condition_metric.toUpperCase()} {rule.condition_operator} {rule.condition_value}
                      {" → "}{rule.action_type.replace(/_/g, " ")}
                      {rule.action_value ? ` ${rule.action_value}%` : ""}
                    </p>
                  </div>
                  {rule.last_triggered_at && (
                    <span className="text-[10px] text-muted-foreground">last: {format(new Date(rule.last_triggered_at), "MMM d")}</span>
                  )}
                  <button onClick={() => deleteRule.mutate(rule.id)} className="text-muted-foreground hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────
function ReportsTab({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [niche, setNiche] = useState("");

  const { data: reports = [], refetch: refetchReports } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/reports", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/reports/${clientId}`),
    enabled: !!clientId,
  });

  const { data: trendData } = useQuery<any>({
    queryKey: ["/api/meta-ads/trend-data", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/trend-data/${clientId}`),
    enabled: !!clientId,
  });

  const { data: cohortData = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/cohort", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/cohort/${clientId}`),
    enabled: !!clientId,
  });

  async function handleLoadReport(report: any) {
    try {
      const full = await apiRequest("GET", `/api/meta-ads/reports/${clientId}/${report.id}`);
      setSelectedReport(full);
    } catch (e: any) {
      toast({ title: "Failed to load report", description: e.message, variant: "destructive" });
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await apiRequest("POST", `/api/meta-ads/generate-report/${clientId}`, { clientName, niche });
      refetchReports();
      setSelectedReport({ ...data, ai_summary: data.reportText });
      toast({ title: "Report generated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  const chartData = trendData?.daily?.map((d: any) => ({
    date: format(new Date(d.snapshot_date), "MMM d"),
    spend: parseFloat(d.spend || "0").toFixed(2),
    roas: d.roas ? parseFloat(d.roas).toFixed(2) : null,
    conversions: d.conversions || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Generate report */}
      <Card className="border border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Generate AI Weekly Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client Niche (optional)</Label>
              <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Online fitness coaching" className="mt-1 h-9 text-xs" />
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Report...</> : <><Brain className="w-4 h-4" /> Generate Weekly Report</>}
          </Button>
          <p className="text-xs text-muted-foreground">AI analyzes your last 30 days of campaign data and writes a full performance report with action items.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past Reports</p>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <FileText className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No reports yet</p>
            </div>
          ) : (
            reports.map((r: any) => (
              <button key={r.id} onClick={() => handleLoadReport(r)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${selectedReport?.id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30"}`}>
                <p className="font-semibold text-foreground">{format(new Date(r.report_date), "MMM d, yyyy")}</p>
                <p className="text-muted-foreground mt-0.5">
                  {r.metrics_snapshot?.totalSpend ? `$${parseFloat(r.metrics_snapshot.totalSpend).toFixed(0)} spend` : ""}
                  {r.metrics_snapshot?.avgRoas ? ` · ${parseFloat(r.metrics_snapshot.avgRoas).toFixed(2)}x ROAS` : ""}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Report content */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card className="border border-card-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Performance Report</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                    navigator.clipboard.writeText(selectedReport.ai_summary || "");
                    toast({ title: "Copied to clipboard" });
                  }}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {selectedReport.ai_summary}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select or generate a report</p>
            </div>
          )}
        </div>
      </div>

      {/* Trend charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Daily Spend (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="spend" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">ROAS Trend (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="roas" stroke="#10b981" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cohort analysis */}
      {cohortData.length > 0 && (
        <Card className="border border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" /> Cohort Analysis — Performance by Campaign Age
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Campaign</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Week 1</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Week 2</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Week 3</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Week 4</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(cohortData.map((r: any) => r.campaign_name))].map(name => {
                    const weeks: Record<number, any> = {};
                    cohortData.filter((r: any) => r.campaign_name === name).forEach((r: any) => { weeks[r.week_num] = r; });
                    return (
                      <tr key={name as string} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground truncate max-w-[160px]">{name as string}</td>
                        {[1, 2, 3, 4].map(w => (
                          <td key={w} className="px-3 py-2.5 text-right">
                            {weeks[w] ? (
                              <div>
                                <p className="font-semibold text-foreground">{fmtRoas(parseFloat(weeks[w].roas))}</p>
                                <p className="text-muted-foreground">${parseFloat(weeks[w].spend).toFixed(0)}</p>
                              </div>
                            ) : <span className="text-muted-foreground">–</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!trendData?.hasHistory && (
              <p className="text-xs text-muted-foreground text-center py-3 border-t border-border">Cohort data builds over time as you sync campaigns daily.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Campaign Manager Tab ───────────────────────────────────────────────────
function CampaignManagerTab({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState<Array<{ role: "user" | "assistant"; content: string; error?: boolean }>>([]);
  const [scalingId, setScalingId] = useState<string | null>(null);
  const [scaleBudget, setScaleBudget] = useState("");

  const { data: campaigns = [], refetch: refetchCampaigns, isFetching } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/campaigns", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/campaigns/${clientId}`),
    enabled: !!clientId,
  });

  const { data: launchLog = [] } = useQuery<any[]>({
    queryKey: ["/api/meta-ads/launch-log", clientId],
    queryFn: () => apiRequest("GET", `/api/meta-ads/launch-log/${clientId}`),
    enabled: !!clientId,
  });

  const updateCampaign = useMutation({
    mutationFn: ({ campaignId, body }: { campaignId: string; body: any }) =>
      apiRequest("PATCH", `/api/meta-ads/campaign/${clientId}/${campaignId}`, body),
    onSuccess: () => { refetchCampaigns(); toast({ title: "Campaign updated" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteCampaign = useMutation({
    mutationFn: (campaignId: string) =>
      apiRequest("DELETE", `/api/meta-ads/campaign/${clientId}/${campaignId}`),
    onSuccess: () => { refetchCampaigns(); toast({ title: "Campaign deleted" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  async function handleAgentSend() {
    if (!agentInput.trim() || agentLoading) return;
    const instruction = agentInput.trim();
    setAgentInput("");
    setAgentMessages(m => [...m, { role: "user", content: instruction }]);
    setAgentLoading(true);
    try {
      const data = await apiRequest("POST", `/api/meta-ads/agent/${clientId}`, { instruction });
      const lines = [
        data.explanation || "",
        "",
        ...data.created.map((c: any) =>
          `✓ **${c.campaignName}** (PAUSED)\n` +
          c.adSets.map((s: any) => `  └ ${s.name}`).join("\n")
        ),
        "",
        data.message,
      ].filter(l => l !== undefined).join("\n");
      setAgentMessages(m => [...m, { role: "assistant", content: lines }]);
      queryClient.invalidateQueries({ queryKey: ["/api/meta-ads/launch-log", clientId] });
      refetchCampaigns();
    } catch (e: any) {
      const msg = e.message || "Failed";
      const isPerm = msg.toLowerCase().includes("ads_management") || msg.toLowerCase().includes("permission");
      setAgentMessages(m => [...m, {
        role: "assistant",
        content: isPerm
          ? "⚠️ **ads_management permission required.**\n\nThis permission lets the platform create campaigns on behalf of ad accounts. To get it:\n1. Go to developers.facebook.com → your app\n2. Add Product → Marketing API\n3. Request: ads_management\n4. In development mode it works on your own accounts immediately\n5. For client accounts: Meta App Review needed (1–3 weeks)"
          : `Error: ${msg}`,
        error: true,
      }]);
    } finally {
      setAgentLoading(false);
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PAUSED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    ARCHIVED: "bg-muted/30 text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      {/* AI Agent */}
      <Card className="border border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" /> AI Campaign Creator
            <Badge variant="outline" className="text-[10px] ml-auto border-purple-500/20 text-purple-400">Requires ads_management</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentMessages.length === 0 && (
            <div className="rounded-lg bg-muted/20 border border-dashed border-border p-4 text-center">
              <Brain className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Describe a campaign in plain English</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {[
                  "Create a $50/day lead gen campaign for fitness coaching targeting women 25-45 in the US",
                  "Launch a retargeting campaign with $20/day for website visitors, conversions objective",
                  "Build a 3-adset cold traffic campaign, $100/day CBO, broad + interest + lookalike",
                ].map(ex => (
                  <button key={ex} onClick={() => setAgentInput(ex)}
                    className="text-[10px] text-muted-foreground border border-border rounded-full px-3 py-1 hover:bg-accent/30 text-left transition-colors">
                    {ex.slice(0, 60)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {agentMessages.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {agentMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3 h-3 text-purple-400" />
                    </div>
                  )}
                  <div className={`rounded-xl px-3 py-2 text-xs max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20 text-foreground"
                      : msg.error
                      ? "bg-red-500/10 border border-red-500/20 text-red-300"
                      : "bg-card border border-border text-muted-foreground"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {agentLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground">Creating campaign...</div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={agentInput}
              onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAgentSend()}
              placeholder="Describe a campaign to create... (e.g. $30/day lead gen for my coaching program, women 30-50 US)"
              className="text-xs h-9"
              disabled={agentLoading}
            />
            <Button size="sm" className="h-9 px-3 gap-1.5 shrink-0" onClick={handleAgentSend} disabled={!agentInput.trim() || agentLoading}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live campaigns */}
      <Card className="border border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Live Campaigns</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={() => refetchCampaigns()} disabled={isFetching}>
              <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        {campaigns.length === 0 ? (
          <CardContent>
            <p className="text-xs text-muted-foreground text-center py-4">No campaigns in cache. Sync from the Tracking page first.</p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Campaign</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Spend</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">ROAS</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => (
                  <tr key={c.campaign_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground truncate max-w-[180px]">{c.campaign_name}</p>
                      <p className="text-muted-foreground text-[10px]">{c.objective}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                      {fmtCurrency(parseFloat(c.spend || "0"))}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold hidden md:table-cell ${parseFloat(c.roas) >= 2 ? "text-emerald-400" : parseFloat(c.roas) >= 1 ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {fmtRoas(parseFloat(c.roas))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "ACTIVE" ? (
                          <button
                            onClick={() => updateCampaign.mutate({ campaignId: c.campaign_id, body: { status: "PAUSED" } })}
                            className="p-1.5 rounded hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateCampaign.mutate({ campaignId: c.campaign_id, body: { status: "ACTIVE" } })}
                            className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Activate"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {scalingId === c.campaign_id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={scaleBudget}
                              onChange={e => setScaleBudget(e.target.value)}
                              placeholder="$/day"
                              className="w-16 h-7 text-xs px-1.5"
                            />
                            <button
                              onClick={() => {
                                if (scaleBudget) {
                                  updateCampaign.mutate({ campaignId: c.campaign_id, body: { dailyBudget: parseFloat(scaleBudget) } });
                                }
                                setScalingId(null);
                                setScaleBudget("");
                              }}
                              className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setScalingId(c.campaign_id)}
                            className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                            title="Set budget"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${c.campaign_name}"? This cannot be undone.`)) {
                              deleteCampaign.mutate(c.campaign_id);
                            }
                          }}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      {/* Launch history */}
      {launchLog.length > 0 && (
        <Card className="border border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" /> Launch History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {launchLog.map((log: any) => {
              const campaigns = log.campaigns_created as any[];
              return (
                <div key={log.id} className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs ${log.status === "error" ? "border-red-500/20 bg-red-500/5" : "border-border"}`}>
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${log.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground truncate">{log.instruction}</p>
                    {Array.isArray(campaigns) && log.status === "success" && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{campaigns.length} campaign(s) created</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {format(new Date(log.launched_at), "MMM d, h:mm a")}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminMetaAdsManager() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { data: eliteClients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", { plan: "elite" }],
    queryFn: () => apiRequest("GET", "/api/clients?plan=elite"),
  });

  const selectedClient = eliteClients.find((c: any) => c.id === selectedClientId);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-blue-400" /> Meta Ads Manager
            </h1>
            <p className="text-muted-foreground text-sm mt-1">AI-powered campaign architect, budget intelligence & performance reporting</p>
          </div>
        </div>

        {/* Client selector */}
        <Card className="border border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-400" /> Select Client
                </Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eliteClients.length === 0
                      ? <SelectItem value="none" disabled>No Elite members yet</SelectItem>
                      : eliteClients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedClient.name}</p>
                    {selectedClient.program && <p className="text-[10px] text-muted-foreground">{selectedClient.program}</p>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedClientId ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <BarChart2 className="w-12 h-12 text-blue-400/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">Select a client above to get started</p>
            <p className="text-xs text-muted-foreground mt-1">Design campaigns, optimize budgets, and generate performance reports</p>
          </div>
        ) : (
          <Tabs defaultValue="architect">
            <TabsList className="mb-6 bg-card border border-card-border">
              <TabsTrigger value="architect" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Brain className="w-4 h-4" /> Campaign Architect
              </TabsTrigger>
              <TabsTrigger value="budget" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <DollarSign className="w-4 h-4" /> Budget Intelligence
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4" /> Reports
              </TabsTrigger>
              <TabsTrigger value="manager" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Rocket className="w-4 h-4" /> Campaign Manager
              </TabsTrigger>
            </TabsList>

            <TabsContent value="architect">
              <CampaignArchitectTab clientId={selectedClientId} />
            </TabsContent>
            <TabsContent value="budget">
              <BudgetIntelligenceTab clientId={selectedClientId} clientName={selectedClient?.name} />
            </TabsContent>
            <TabsContent value="reports">
              <ReportsTab clientId={selectedClientId} clientName={selectedClient?.name} />
            </TabsContent>
            <TabsContent value="manager">
              <CampaignManagerTab clientId={selectedClientId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
