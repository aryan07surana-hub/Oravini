import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Users, Eye, DollarSign, TrendingUp,
  TrendingDown, BarChart2, ChevronDown, ChevronUp, Download,
  Mail, Phone, Clock, ArrowRight, Globe, Edit3,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR_BG = "#06060b";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

const STEP_COLORS: Record<string, string> = {
  landing: "#3b82f6", sales: "#d4b461", upsell: "#22c55e",
  downsell: "#f97316", order_bump: "#ec4899", thank_you: "#a855f7",
  confirmation: "#06b6d4", webinar: "#ec4899",
};

type AnalyticsData = {
  funnel: any;
  steps: Array<{
    id: string; name: string; type: string; slug: string; position: number;
    visits: number; conversions: number; price: number | null;
    cvr: number; dropOff: number; pctOfTop: number; stepRevenue: number;
  }>;
  contacts: Array<{
    id: string; email: string; name: string | null; phone: string | null;
    created_at: string; step_name: string | null; step_type: string | null;
  }>;
  dailyLeads: Array<{ day: string; count: number }>;
  summary: {
    totalRevenue: number; aov: number; overallCvr: number;
    totalLeads: number; totalVisits: number; totalSales: number;
  };
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = GOLD, trend }: {
  label: string; value: string | number; sub?: string;
  icon: any; color?: string; trend?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl flex items-start gap-4"
      style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}14`, border: `1px solid ${color}25` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </motion.div>
  );
}

// ── Funnel Waterfall ─────────────────────────────────────────────────────────

function FunnelWaterfall({ steps, onStepClick, selectedStepId }: {
  steps: AnalyticsData["steps"];
  onStepClick: (id: string) => void;
  selectedStepId: string | null;
}) {
  if (!steps.length) return null;
  const maxVisits = steps[0]?.visits || 1;

  return (
    <div className="p-6 rounded-2xl" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
      <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-6">Conversion Funnel</p>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const color = STEP_COLORS[step.type] || GOLD;
          const barPct = maxVisits > 0 ? (step.visits / maxVisits) * 100 : 0;
          const isSelected = selectedStepId === step.id;
          const prevVisits = i === 0 ? step.visits : steps[i - 1].visits;
          const entryRate = prevVisits > 0 ? (step.visits / prevVisits * 100).toFixed(0) : "100";

          return (
            <motion.div key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onStepClick(step.id)}
              className="cursor-pointer group"
            >
              {/* Drop-off arrow between steps */}
              {i > 0 && step.dropOff > 0 && (
                <div className="flex items-center gap-2 mb-1 ml-2">
                  <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <p className="text-[10px] text-red-400 font-bold">
                    -{step.dropOff.toFixed(0)}% dropped off
                  </p>
                </div>
              )}

              <div className={`rounded-xl overflow-hidden transition-all ${isSelected ? "ring-2" : ""}`}
                style={{ ringColor: color, border: `1px solid ${isSelected ? color + "50" : "rgba(255,255,255,0.06)"}` }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: isSelected ? `${color}10` : "transparent" }}>
                  {/* Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{step.type.replace(/_/g, " ")}</span>
                        <span className="text-xs font-bold text-white truncate max-w-[160px]">{step.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black">
                        <span className="text-white">{step.visits.toLocaleString()}</span>
                        <span style={{ color: step.cvr > 20 ? "#22c55e" : step.cvr > 10 ? GOLD : "#ef4444" }}>
                          {step.cvr.toFixed(1)}% CVR
                        </span>
                        {step.stepRevenue > 0 && (
                          <span style={{ color: GOLD }}>${step.stepRevenue.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-5 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                        className="h-full rounded-lg"
                        style={{ background: `linear-gradient(90deg, ${color}80, ${color}40)` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                      <span>{step.conversions} converted</span>
                      {i > 0 && <span>{entryRate}% entered from prev step</span>}
                      <span className="ml-auto">{step.pctOfTop.toFixed(0)}% of top</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step Detail Panel ─────────────────────────────────────────────────────────

function StepDetailPanel({ step, funnelId, onClose }: {
  step: AnalyticsData["steps"][0]; funnelId: string; onClose: () => void;
}) {
  const [, nav] = useLocation();
  const color = STEP_COLORS[step.type] || GOLD;
  const metrics = [
    { label: "Visits",       value: step.visits.toLocaleString() },
    { label: "Conversions",  value: step.conversions.toLocaleString() },
    { label: "CVR",          value: `${step.cvr.toFixed(1)}%` },
    { label: "Drop-off",     value: step.dropOff > 0 ? `-${step.dropOff.toFixed(1)}%` : "—" },
    { label: "Revenue",      value: step.stepRevenue > 0 ? `$${step.stepRevenue.toLocaleString()}` : "—" },
    { label: "Price",        value: step.price ? `$${step.price}` : "—" },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${color}30` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{step.type.replace(/_/g, " ")}</p>
          <p className="text-sm font-black text-white">{step.name}</p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {metrics.map(m => (
          <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs font-black text-white">{m.value}</p>
            <p className="text-[10px] text-zinc-600">{m.label}</p>
          </div>
        ))}
      </div>

      {/* CVR bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[10px] text-zinc-600 mb-1">
          <span>Conversion rate</span><span style={{ color }}>{step.cvr.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(step.cvr, 100)}%` }} transition={{ duration: 0.5 }}
            className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
        </div>
      </div>

      <button onClick={() => nav(`/funnels/${funnelId}/steps/${step.id}/edit`)}
        className="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2"
        style={{ background: `${color}14`, border: `1px solid ${color}25`, color }}>
        <Edit3 className="w-3.5 h-3.5" />Edit Page
      </button>
    </motion.div>
  );
}

// ── Mini Bar Chart (daily leads) ──────────────────────────────────────────────

function DailyLeadsChart({ data, accent }: { data: Array<{ day: string; count: number }>; accent: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const last7 = data.slice(-30);

  if (!last7.length) return (
    <div className="p-6 rounded-2xl text-center" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
      <p className="text-zinc-600 text-sm">No lead activity yet</p>
    </div>
  );

  return (
    <div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
      <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-5">Daily Leads (last 30 days)</p>
      <div className="flex items-end gap-1 h-20">
        {last7.map((d, i) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute bottom-full mb-1 hidden group-hover:block text-[9px] text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap">
              {new Date(d.day).toLocaleDateString("en", { month: "short", day: "numeric" })}: {d.count}
            </div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / max) * 100}%` }}
              transition={{ delay: i * 0.02, duration: 0.5 }}
              className="w-full rounded-t-sm min-h-[2px]"
              style={{ background: `${accent}60` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-700 mt-1">
        <span>{last7[0] ? new Date(last7[0].day).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}</span>
        <span>{last7[last7.length - 1] ? new Date(last7[last7.length - 1].day).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}</span>
      </div>
    </div>
  );
}

// ── Contacts Table ────────────────────────────────────────────────────────────

function ContactsTable({ contacts }: { contacts: AnalyticsData["contacts"] }) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(c =>
    !search || c.email.includes(search) || (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Step", "Date"],
      ...filtered.map(c => [c.name || "", c.email, c.phone || "", c.step_name || "", new Date(c.created_at).toLocaleDateString()]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "funnel-leads.csv";
    a.click();
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: PANEL_BORDER }}>
        <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Leads ({contacts.length})</p>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…" className="px-3 py-1.5 rounded-lg text-xs text-white bg-white/5 border outline-none"
            style={{ borderColor: PANEL_BORDER, width: 160 }} />
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <Download className="w-3 h-3" />CSV
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="w-8 h-8 mx-auto mb-3" style={{ color: `${GOLD}30` }} />
          <p className="text-zinc-600 text-sm">No leads yet</p>
          <p className="text-zinc-700 text-xs mt-1">Leads appear here when visitors submit your opt-in forms</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
                {["Contact", "Email", "Step", "Date"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const stepColor = STEP_COLORS[c.step_type || ""] || GOLD;
                return (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b hover:bg-white/2 transition-colors"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ background: `${GOLD}18`, color: GOLD }}>
                          {(c.name || c.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{c.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-zinc-600 mt-0.5">
                          <Phone className="w-3 h-3 flex-shrink-0" />{c.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.step_name ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: `${stepColor}14`, color: stepColor }}>
                          {c.step_name}
                        </span>
                      ) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <Clock className="w-3 h-3" />
                        {new Date(c.created_at).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FunnelAnalytics() {
  const [, params] = useRoute("/funnels/:id/analytics");
  const id = params?.id ?? "";
  const [, nav] = useLocation();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: [`/api/funnels/${id}/analytics`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}/analytics`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  if (isLoading || !data) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const { funnel, steps, contacts, dailyLeads, summary } = data;
  const selectedStep = steps.find(s => s.id === selectedStepId) || null;

  const summaryCards = [
    { label: "Total Visits",   value: summary.totalVisits.toLocaleString(),  icon: Eye,          color: "#3b82f6" },
    { label: "Total Leads",    value: summary.totalLeads.toLocaleString(),   icon: Users,        color: "#22c55e" },
    { label: "Revenue",        value: `$${summary.totalRevenue.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})}`, icon: DollarSign, color: GOLD },
    { label: "Overall CVR",    value: `${summary.overallCvr.toFixed(1)}%`,   icon: TrendingUp,   color: "#a855f7" },
    { label: "Avg Order Value",value: summary.aov > 0 ? `$${summary.aov.toFixed(0)}` : "—",    icon: BarChart2,   color: "#f97316" },
    { label: "Sales",          value: summary.totalSales.toLocaleString(),   icon: ArrowRight,   color: "#06b6d4" },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Topbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: PANEL_BORDER, background: SIDEBAR_BG }}>
        <div className="flex items-center gap-3">
          <button onClick={() => nav(`/funnels/${id}/edit`)} className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-black text-white">{funnel.name}</p>
            <p className="text-[10px] text-zinc-600">Analytics Dashboard</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: funnel.status === "active" ? "#22c55e" : "#52525b" }} />
            <span className="text-xs text-zinc-500">{funnel.status === "active" ? "Live" : "Draft"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav(`/funnels/${id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <Edit3 className="w-3.5 h-3.5" />Edit Funnel
          </button>
          {funnel.status === "active" && (
            <a href={`/f/${funnel.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
              <Globe className="w-3.5 h-3.5" />View Live
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="p-4 rounded-2xl text-center"
              style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${s.color}14` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <p className="text-lg font-black text-white">{s.value}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: waterfall + daily chart */}
          <div className="lg:col-span-2 space-y-6">
            <FunnelWaterfall steps={steps} onStepClick={id => setSelectedStepId(prev => prev === id ? null : id)} selectedStepId={selectedStepId} />
            <DailyLeadsChart data={dailyLeads} accent={GOLD} />
          </div>

          {/* Right: step detail or step list */}
          <div className="space-y-4">
            {selectedStep ? (
              <StepDetailPanel step={selectedStep} funnelId={id} onClose={() => setSelectedStepId(null)} />
            ) : (
              <div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-4">Steps ({steps.length})</p>
                <div className="space-y-2">
                  {steps.map(step => {
                    const color = STEP_COLORS[step.type] || GOLD;
                    return (
                      <button key={step.id} onClick={() => setSelectedStepId(step.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5"
                        style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-base"
                          style={{ background: `${color}14` }}>
                          {step.type === "landing" ? "🏠" : step.type === "sales" ? "💰" : step.type === "upsell" ? "⬆️" : step.type === "downsell" ? "⬇️" : step.type === "thank_you" ? "🙏" : "✅"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{step.name}</p>
                          <p className="text-[10px] text-zinc-600">{step.visits.toLocaleString()} visits · {step.cvr.toFixed(1)}% CVR</p>
                        </div>
                        <div className="flex-shrink-0">
                          {step.dropOff > 0 && step.position > 0 && (
                            <span className="text-[10px] font-bold text-red-400">-{step.dropOff.toFixed(0)}%</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-700 text-center mt-3">Click a step or bar to see details</p>
              </div>
            )}

            {/* Quick insights */}
            {steps.length > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-4">Insights</p>
                <div className="space-y-3">
                  {(() => {
                    const insights: Array<{ icon: string; text: string; color: string }> = [];
                    const worstStep = [...steps].sort((a, b) => a.cvr - b.cvr)[0];
                    const bestStep = [...steps].sort((a, b) => b.cvr - a.cvr)[0];
                    const biggestDrop = [...steps].sort((a, b) => b.dropOff - a.dropOff)[0];

                    if (worstStep && worstStep.cvr < 5) insights.push({ icon: "⚠️", text: `"${worstStep.name}" has a low ${worstStep.cvr.toFixed(1)}% CVR — review the page copy`, color: "#f97316" });
                    if (bestStep && bestStep.cvr > 20) insights.push({ icon: "🏆", text: `"${bestStep.name}" is your best step at ${bestStep.cvr.toFixed(1)}% CVR`, color: "#22c55e" });
                    if (biggestDrop && biggestDrop.dropOff > 40 && biggestDrop.position > 0) insights.push({ icon: "📉", text: `${biggestDrop.dropOff.toFixed(0)}% of visitors drop off before "${biggestDrop.name}"`, color: "#ef4444" });
                    if (summary.totalLeads > 0 && summary.totalRevenue === 0) insights.push({ icon: "💡", text: "Add offer steps to monetize your leads", color: GOLD });
                    if (summary.totalVisits === 0) insights.push({ icon: "🚀", text: "No visits yet — publish and drive traffic", color: "#3b82f6" });
                    if (insights.length === 0) insights.push({ icon: "✅", text: "Funnel is running well — keep driving traffic", color: "#22c55e" });

                    return insights.slice(0, 4).map((ins, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${ins.color}15` }}>
                        <span className="text-sm flex-shrink-0">{ins.icon}</span>
                        <p className="text-[11px] leading-relaxed" style={{ color: ins.color }}>{ins.text}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contacts */}
        <ContactsTable contacts={contacts} />
      </div>
    </div>
  );
}
