import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users, Mail, Zap, Crown, TrendingUp, Search, FileText, ChevronDown,
  ChevronUp, ChevronRight, ClipboardCheck, RefreshCw, CheckCircle2,
  ExternalLink, Send, ShieldCheck, ShieldOff, CalendarDays, CreditCard,
  Instagram, Youtube, Linkedin, Globe, Bookmark, Activity
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const GOLD = "#d4b461";

const PLAN_COLORS: Record<string, string> = {
  free:    "border-zinc-600 text-zinc-400",
  starter: "border-blue-500/40 text-blue-400",
  growth:  "border-violet-500/40 text-violet-400",
  pro:     "border-emerald-500/40 text-emerald-400",
  elite:   "border-[#d4b461]/60 text-[#d4b461]",
};

const PLAN_LABEL: Record<string, string> = {
  free:    "Tier 1 — Free",
  starter: "Tier 2 — $29",
  growth:  "Tier 3 — $59",
  pro:     "Tier 4 — $79",
  elite:   "Tier 5 — Elite",
};

const PLAN_MAX_CREDITS: Record<string, number> = {
  free: 20, starter: 150, growth: 350, pro: 700, elite: 99999,
};

const TIER_CONFIG = [
  { plan: "free",    tier: "Tier 1", label: "Free",    color: "#71717a",  bg: "rgba(113,113,122,0.08)", next: "Starter ($29)", nextPlan: "starter" },
  { plan: "starter", tier: "Tier 2", label: "Starter", color: "#60a5fa",  bg: "rgba(96,165,250,0.08)",  next: "Growth ($59)",  nextPlan: "growth"  },
  { plan: "growth",  tier: "Tier 3", label: "Growth",  color: "#a78bfa",  bg: "rgba(167,139,250,0.08)", next: "Pro ($79)",     nextPlan: "pro"     },
  { plan: "pro",     tier: "Tier 4", label: "Pro",     color: "#34d399",  bg: "rgba(52,211,153,0.08)",  next: "Elite",        nextPlan: "elite"   },
  { plan: "elite",   tier: "Tier 5", label: "Elite",   color: "#d4b461",  bg: "rgba(212,180,97,0.08)",  next: null,           nextPlan: null      },
];

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#d4b461" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#27272a" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function CreditBar({ credits, plan }: { credits: any; plan: string }) {
  if (!credits) return <span className="text-xs text-zinc-600">No credits</span>;
  const max = PLAN_MAX_CREDITS[plan] ?? 20;
  const total = credits.monthlyCredits + credits.bonusCredits;
  const pct = max >= 99999 ? 100 : Math.min(100, Math.round((total / max) * 100));
  const color = pct > 50 ? "#22c55e" : pct > 20 ? "#d4b461" : "#ef4444";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 max-w-[80px]">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs shrink-0" style={{ color }}>
        {max >= 99999 ? "∞" : `${total}/${max}`}
      </span>
    </div>
  );
}

export default function AdminCRM() {
  const [activeTab, setActiveTab] = useState<"tiers" | "leads" | "clients">("tiers");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [expandedTier, setExpandedTier] = useState<string | null>("free");
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ clients: any[]; leads: any[] }>({
    queryKey: ["/api/admin/crm"],
  });
  const { data: sequences = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/email/sequences"],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/crm/sync"),
    onSuccess: (res: any) => { setSyncResult({ synced: res.synced }); setTimeout(() => setSyncResult(null), 5000); },
  });

  const enrollTriggerMut = useMutation({
    mutationFn: ({ trigger }: { trigger: string }) => apiRequest("POST", "/api/admin/email/enroll-trigger", { trigger }),
    onSuccess: (res: any) => {
      toast({ title: `Enrolled ${res.enrolled} members`, description: "Sequence enrollment complete." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/stats"] });
    },
    onError: (e: any) => toast({ title: "Enroll failed", description: e.message, variant: "destructive" }),
  });

  const clients = data?.clients ?? [];
  const leads = data?.leads ?? [];

  const lowerSearch = search.toLowerCase();

  const filteredClients = clients.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(lowerSearch) || c.email?.toLowerCase().includes(lowerSearch);
    const matchPlan = planFilter === "all" || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const filteredLeads = leads.filter(l =>
    !search || l.name?.toLowerCase().includes(lowerSearch) || l.email?.toLowerCase().includes(lowerSearch)
  );

  const conversionRate = leads.length > 0
    ? Math.round((clients.length / (clients.length + leads.length)) * 100)
    : 0;

  const clientsByPlan = {
    free:    clients.filter(c => c.plan === "free").length,
    starter: clients.filter(c => c.plan === "starter").length,
    growth:  clients.filter(c => c.plan === "growth").length,
    pro:     clients.filter(c => c.plan === "pro").length,
    elite:   clients.filter(c => c.plan === "elite").length,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">CRM</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Leads, clients, and plan segmentation · Auto-synced to Oravini CRM</p>
          </div>
          <div className="flex items-center gap-3">
            {syncResult && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium" data-testid="text-sync-result">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {syncResult.synced} records synced
              </span>
            )}
            <Button
              data-testid="button-sync-stats"
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 gap-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing…" : "Sync Stats"}
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Leads</p>
              <p className="text-2xl font-bold text-white">{leads.length}</p>
              <p className="text-xs text-zinc-600 mt-0.5">email list</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Tier 1</p>
              <p className="text-2xl font-bold text-zinc-400">{clientsByPlan.free}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Free</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Tier 2</p>
              <p className="text-2xl font-bold text-blue-400">{clientsByPlan.starter}</p>
              <p className="text-xs text-zinc-600 mt-0.5">$29/mo</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Tier 3</p>
              <p className="text-2xl font-bold text-violet-400">{clientsByPlan.growth}</p>
              <p className="text-xs text-zinc-600 mt-0.5">$59/mo</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Tier 4</p>
              <p className="text-2xl font-bold text-emerald-400">{clientsByPlan.pro}</p>
              <p className="text-xs text-zinc-600 mt-0.5">$79/mo</p>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Tier 5</p>
              <p className="text-2xl font-bold text-[#d4b461]">{clientsByPlan.elite}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Elite ∞</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex rounded-lg border border-zinc-800 p-1 gap-1">
            {(["tiers", "clients", "leads"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
                data-testid={`tab-crm-${tab}`}
              >
                {tab === "tiers" ? "Tier Breakdown" : tab === "clients" ? `Clients (${clients.length})` : `Email Leads (${leads.length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-800/60 border-zinc-700"
              data-testid="input-crm-search"
            />
          </div>
          {activeTab === "clients" && (
            <div className="flex gap-1.5">
              {["all", "free", "starter", "growth", "pro", "elite"].map(p => (
                <button
                  key={p}
                  onClick={() => setPlanFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${planFilter === p ? "border-[#d4b461] text-[#d4b461] bg-[#d4b461]/10" : "border-zinc-800 text-zinc-500 hover:text-white"}`}
                  data-testid={`filter-plan-${p}`}
                >
                  {p === "all" ? "All" : p === "free" ? "T1" : p === "starter" ? "T2" : p === "growth" ? "T3" : p === "pro" ? "T4" : "T5"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Tiers tab ── */}
        {activeTab === "tiers" && (
          <div className="space-y-3">
            {TIER_CONFIG.map(tierCfg => {
              const allTierClients = clients.filter(c => c.plan === tierCfg.plan);
              const tierClients = search
                ? allTierClients.filter(c =>
                    c.name?.toLowerCase().includes(lowerSearch) ||
                    c.email?.toLowerCase().includes(lowerSearch)
                  )
                : allTierClients;
              const isOpen = expandedTier === tierCfg.plan;
              const pct = clients.length > 0 ? Math.round((allTierClients.length / clients.length) * 100) : 0;
              const confirmedCount = allTierClients.filter(c => c.planConfirmed).length;
              const upsellSeqs = sequences.filter((s: any) => s.trigger === "upgrade" && s.active);

              return (
                <Card
                  key={tierCfg.plan}
                  className="border border-card-border overflow-hidden"
                  data-testid={`tier-card-${tierCfg.plan}`}
                >
                  {/* Tier header row */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/30 transition-colors text-left"
                    onClick={() => setExpandedTier(isOpen ? null : tierCfg.plan)}
                    data-testid={`tier-toggle-${tierCfg.plan}`}
                  >
                    <div className="w-2 h-9 rounded-full shrink-0" style={{ background: tierCfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tierCfg.color }}>{tierCfg.tier}</span>
                        <span className="text-sm font-semibold text-white">{tierCfg.label}</span>
                        {tierCfg.next && (
                          <span className="text-[11px] text-zinc-600 hidden sm:block">→ upsell to {tierCfg.next}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 max-w-[120px]">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: tierCfg.color }} />
                          </div>
                          <span className="text-xs text-zinc-500">{pct}%</span>
                        </div>
                        <span className="text-[11px] text-zinc-600 hidden sm:flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {confirmedCount}/{allTierClients.length} confirmed
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-white">{allTierClients.length}</p>
                      <p className="text-xs text-zinc-600">member{allTierClients.length !== 1 ? "s" : ""}</p>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
                  </button>

                  {/* Expanded user list */}
                  {isOpen && (
                    <div className="border-t border-zinc-800">
                      {/* Tier actions bar */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60">
                        <p className="text-xs text-zinc-500">
                          {search ? (
                            <><span className="text-white font-medium">{tierClients.length}</span> of {allTierClients.length} shown</>
                          ) : (
                            <><span className="text-white font-medium">{allTierClients.length}</span> member{allTierClients.length !== 1 ? "s" : ""}</>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          {tierCfg.plan !== "elite" && upsellSeqs.length > 0 && (
                            <button
                              data-testid={`enroll-tier-${tierCfg.plan}`}
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm(`Enroll all ${allTierClients.length} ${tierCfg.label} members in upgrade sequence?`)) {
                                  enrollTriggerMut.mutate({ trigger: "upgrade" });
                                }
                              }}
                              disabled={enrollTriggerMut.isPending}
                              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              Enroll in Upgrade Seq.
                            </button>
                          )}
                        </div>
                      </div>

                      {tierClients.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-zinc-600">
                            {search ? "No members match your search." : "No members in this tier."}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-800/60">
                          {tierClients.map((client: any) => {
                            const initials = client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                            const totalCredits = client.credits
                              ? client.credits.monthlyCredits + client.credits.bonusCredits
                              : null;
                            return (
                              <div
                                key={client.id}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/20 transition-colors group"
                                data-testid={`tier-client-${client.id}`}
                              >
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="bg-zinc-700 text-white text-xs font-bold">{initials}</AvatarFallback>
                                </Avatar>

                                {/* Name + email + niche */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                                    {client.planConfirmed ? (
                                      <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" title="Plan confirmed" />
                                    ) : (
                                      <ShieldOff className="w-3 h-3 text-zinc-600 shrink-0" title="Plan not confirmed" />
                                    )}
                                    {client.surveyCompleted && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,180,97,0.1)", color: GOLD, border: "1px solid rgba(212,180,97,0.2)" }} title="Survey completed">✓</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <p className="text-xs text-zinc-500 truncate">{client.email}</p>
                                    {/* Niche pill */}
                                    {client.fields?.[0] && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: "rgba(212,180,97,0.08)", color: "rgba(212,180,97,0.7)" }}>
                                        {client.fields[0]}
                                      </span>
                                    )}
                                    {/* Platforms */}
                                    {(client.platforms || []).slice(0, 2).map((p: string) => {
                                      const icons: Record<string, any> = { Instagram, YouTube: Youtube, LinkedIn: Linkedin, TikTok: Activity };
                                      const PIcon = icons[p] || Globe;
                                      return <PIcon key={p} className="w-3 h-3 text-zinc-600 shrink-0" title={p} />;
                                    })}
                                  </div>
                                </div>

                                {/* Credits bar */}
                                <div className="hidden md:flex flex-col gap-0.5 min-w-[100px]">
                                  <p className="text-[10px] text-zinc-600 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5" style={{ color: GOLD }} />
                                    Credits
                                  </p>
                                  <CreditBar credits={client.credits} plan={client.plan} />
                                </div>

                                {/* Primary goal (survey) */}
                                {client.primaryGoal && (
                                  <div className="hidden xl:flex flex-col gap-0.5 min-w-[100px] max-w-[130px]">
                                    <p className="text-[10px] text-zinc-600">Goal</p>
                                    <p className="text-[10px] text-zinc-400 truncate" title={client.primaryGoal}>{client.primaryGoal}</p>
                                  </div>
                                )}

                                {/* Join date */}
                                <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-600 shrink-0">
                                  <CalendarDays className="w-3 h-3" />
                                  {client.createdAt
                                    ? new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                                    : "—"}
                                </div>

                                {/* View profile link */}
                                <Link
                                  href={`/admin/clients/${client.id}`}
                                  className="p-1.5 rounded-md border border-transparent hover:border-zinc-700 hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 shrink-0"
                                  title="View client profile"
                                  data-testid={`view-client-${client.id}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Clients tab ── */}
        {activeTab === "clients" && (
          <Card className="border border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Client Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-800 rounded-lg" />)}
                </div>
              ) : filteredClients.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-10">No clients found.</p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filteredClients.map((client: any) => {
                    const initials = client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                    const totalCredits = client.credits ? client.credits.monthlyCredits + client.credits.bonusCredits : null;
                    return (
                      <div key={client.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/30 transition-colors group" data-testid={`crm-client-${client.id}`}>
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="bg-zinc-700 text-white text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                          <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />{client.email}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${PLAN_COLORS[client.plan || "free"]}`}>
                          {client.plan === "elite" && <Crown className="w-2.5 h-2.5 mr-1" />}
                          {PLAN_LABEL[client.plan || "free"]}
                        </Badge>
                        <div className="flex items-center gap-1 shrink-0 text-xs text-zinc-500">
                          <Zap className="w-3 h-3 text-[#d4b461]" />
                          {totalCredits !== null ? `${totalCredits} cr` : "—"}
                        </div>
                        <div className="text-xs text-zinc-600 shrink-0 hidden md:block">
                          {client.createdAt ? new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                        </div>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="p-1.5 rounded-md border border-transparent hover:border-zinc-700 hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 shrink-0"
                          title="View client profile"
                          data-testid={`view-client-detail-${client.id}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Leads tab ── */}
        {activeTab === "leads" && (
          <Card className="border border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-800 rounded-lg" />)}
                </div>
              ) : filteredLeads.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-10">No leads yet. They'll appear here when visitors fill out the form on the landing page.</p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filteredLeads.map((lead: any) => {
                    const isExpanded = expandedLead === lead.id;
                    const report = lead.monetizationReport;
                    return (
                      <div key={lead.id} data-testid={`crm-lead-${lead.id}`}>
                        <div
                          className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                        >
                          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                            {lead.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{lead.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 border-zinc-700 text-zinc-400">
                            {lead.source === "quiz" ? "📋 Quiz" : "📧 Email"}
                          </Badge>
                          {report && (
                            <div className="shrink-0 hidden sm:flex items-center gap-1 text-xs text-zinc-500">
                              <ClipboardCheck className="w-3 h-3 text-green-500" />
                              <span className="text-green-500">Has Report</span>
                            </div>
                          )}
                          <div className="text-xs text-zinc-600 shrink-0 hidden md:block">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 bg-zinc-900/50 border-t border-zinc-800">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                              <div><p className="text-zinc-500 mb-0.5">Stage</p><p className="text-zinc-200">{lead.creatorType || "—"}</p></div>
                              <div><p className="text-zinc-500 mb-0.5">Platform</p><p className="text-zinc-200">{lead.platform || "—"}</p></div>
                              <div><p className="text-zinc-500 mb-0.5">Challenge</p><p className="text-zinc-200">{lead.biggestChallenge || "—"}</p></div>
                              <div><p className="text-zinc-500 mb-0.5">Goal</p><p className="text-zinc-200">{lead.monetizationGoal || "—"}</p></div>
                            </div>

                            {report && (
                              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-white">{report.headline}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{report.scoreLabel}</p>
                                  </div>
                                  <ScoreGauge score={report.score ?? 0} />
                                </div>
                                <p className="text-xs text-zinc-300 border-l-2 border-[#d4b461] pl-3">{report.topOpportunity}</p>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400 mb-1.5">Quick Wins</p>
                                  <div className="space-y-1">
                                    {(report.quickWins || []).map((w: string, i: number) => (
                                      <p key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                                        <span className="text-[#d4b461] shrink-0">✓</span>{w}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                  <p className="text-xs text-green-400 font-medium">{report.estimatedMonthlyRevenue}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
