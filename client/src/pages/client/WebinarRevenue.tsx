import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, UserCheck, MousePointerClick, Briefcase, ChevronRight, Trophy, Wallet, ExternalLink, Pencil } from "lucide-react";
import { formatIST } from "@shared/webinarFunnel";

const GOLD = "#d4b461";

type Revenue = {
  webinar: { id: string; title: string; slug: string; status: string; scheduledAt: string };
  registrations: number;
  attended: number;
  registeredAttended: number;
  showRate: number | null;
  ctaClicks: number;
  uniqueClickers: number;
  deals: {
    count: number;
    wonCount: number;
    currency: string;
    mixedCurrencies: boolean;
    totalValueCents: number;
    wonValueCents: number;
    byStage: { stageId: string; name: string; position: number; isWon: boolean; isLost: boolean; count: number; valueCents: number }[];
  };
};

function fmtMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toLocaleString()}`;
  }
}
const ratio = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl ${className}`} style={{ background: "linear-gradient(180deg, #0e0e13 0%, #0a0a0e 100%)", border: `1px solid ${GOLD}14` }}>
      {children}
    </div>
  );
}

function KpiTile({ label, value, sub, color = GOLD, icon: Icon }: { label: string; value: string | number; sub?: string; color?: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-1.5"><Icon className="w-3 h-3" style={{ color }} /> {label}</p>
      <p className="text-2xl font-black mt-1 tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function WebinarRevenue({ id }: { id: string }) {
  const [, nav] = useLocation();
  const { data, isLoading, error } = useQuery<Revenue>({ queryKey: [`/api/webinar-funnels/${id}/revenue`], refetchInterval: 30_000 });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#040406" }}>
      <p className="text-zinc-400">Could not load revenue for this webinar.</p>
      <button onClick={() => nav("/tools/webinars")} className="text-sm text-zinc-400 hover:text-white">← Back to webinars</button>
    </div>
  );

  const { webinar, deals } = data;
  const steps = [
    { label: "Registered", value: data.registrations, color: "#60a5fa", icon: Users },
    { label: "Showed", value: data.attended, color: "#34d399", icon: UserCheck },
    { label: "Clicked CTA", value: data.uniqueClickers, color: "#f472b6", icon: MousePointerClick },
    { label: "Deals", value: deals.count, color: GOLD, icon: Briefcase },
  ];
  const transitions = [
    { label: "Show rate", value: data.showRate == null ? "—" : `${Math.round(data.showRate * 1000) / 10}%` },
    { label: "Click rate", value: ratio(data.uniqueClickers, data.attended) },
    { label: "Deal rate", value: ratio(deals.count, data.uniqueClickers) },
  ];
  const top = Math.max(...steps.map(s => s.value), 1);
  const maxStage = Math.max(...deals.byStage.map(s => s.count), 1);

  return (
    <div className="min-h-screen relative" style={{ background: "#040406", color: "#fff" }}>
      <div className="absolute inset-x-0 top-0 h-[520px] pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${GOLD}0d 0%, transparent 70%)` }} />

      <div className="relative z-40 sticky top-0" style={{ background: "rgba(4,4,6,0.9)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${GOLD}14` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => nav("/tools/webinars")} aria-label="Back to webinars"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ color: `${GOLD}90`, background: `${GOLD}0c`, border: `1px solid ${GOLD}1c` }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="font-black text-white truncate" style={{ letterSpacing: "-0.01em" }} data-testid="revenue-title">{webinar.title}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{formatIST(webinar.scheduledAt)} · /w/{webinar.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {webinar.status !== "draft" && (
              <a href={`/w/${webinar.slug}`} target="_blank" rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white">
                <ExternalLink className="w-3.5 h-3.5" /> Public page
              </a>
            )}
            <button onClick={() => nav(`/tools/webinars/${webinar.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide"
              style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile icon={Wallet} label="Pipeline value" value={fmtMoney(deals.totalValueCents, deals.currency)} sub={`${deals.count} deal${deals.count === 1 ? "" : "s"}`} />
          <KpiTile icon={Trophy} label="Won" value={fmtMoney(deals.wonValueCents, deals.currency)} sub={`${deals.wonCount} closed-won`} color="#34d399" />
          <KpiTile icon={Users} label="Per registrant" value={data.registrations ? fmtMoney(Math.round(deals.wonValueCents / data.registrations), deals.currency) : "—"} sub="won ÷ registered" color="#60a5fa" />
          <KpiTile icon={MousePointerClick} label="CTA clicks" value={data.ctaClicks.toLocaleString()} sub={`${data.uniqueClickers} unique`} color="#f472b6" />
        </div>

        {/* Funnel */}
        <Panel className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}70` }}>Revenue funnel</p>
              <h3 className="text-xl font-black text-white tracking-tight mt-1">From sign-up to closed deal</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Overall</p>
              <p className="text-2xl font-black" style={{ color: GOLD }}>{ratio(deals.count, data.registrations)}</p>
              <p className="text-[10px] text-zinc-600">deals / registered</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-3">
            {steps.map((st, i) => {
              const Icon = st.icon;
              const h = Math.max((st.value / top) * 100, st.value > 0 ? 8 : 4);
              return (
                <div key={st.label} className="contents">
                  <div className="flex flex-col" data-testid={`revenue-step-${i}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${st.color}14`, border: `1px solid ${st.color}28` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{st.label}</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tight leading-none">{st.value.toLocaleString()}</p>
                    <div className="mt-5 h-28 rounded-2xl flex items-end overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="w-full rounded-2xl transition-all duration-700" style={{
                        height: `${h}%`, background: `linear-gradient(180deg, ${st.color}cc 0%, ${st.color}33 100%)`, boxShadow: `0 -8px 30px ${st.color}22`,
                      }} />
                    </div>
                  </div>
                  {i < transitions.length && (
                    <div className="flex md:flex-col items-center justify-center gap-2 py-2 md:py-0 md:pt-10">
                      <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90 md:rotate-0" />
                      <div className="rounded-full px-3 py-1 text-center" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}22` }}>
                        <p className="text-sm font-black" style={{ color: GOLD }}>{transitions[i].value}</p>
                      </div>
                      <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600 text-center whitespace-nowrap">{transitions[i].label}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Stage breakdown */}
        <Panel className="p-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">Deals by stage</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">CRM opportunities tagged <code className="text-zinc-400">webinar:{webinar.slug}</code> or linked to this webinar</p>
            </div>
            {deals.mixedCurrencies && <p className="text-[10px] text-amber-300/80">Deals use more than one currency; totals shown in {deals.currency}.</p>}
          </div>
          {deals.byStage.length === 0 ? (
            <div className="text-center py-10" data-testid="revenue-no-deals">
              <Briefcase className="w-6 h-6 mx-auto mb-2" style={{ color: `${GOLD}60` }} />
              <p className="text-sm font-semibold text-zinc-300">No deals attributed to this webinar yet</p>
              <p className="text-xs text-zinc-600 mt-1">Deals created from webinar leads in your CRM pipeline will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {deals.byStage.map(s => {
                const color = s.isWon ? "#34d399" : s.isLost ? "#f87171" : GOLD;
                return (
                  <div key={s.stageId} className="grid grid-cols-[minmax(0,140px)_1fr_auto] sm:grid-cols-[180px_1fr_120px] items-center gap-3" data-testid={`revenue-stage-${s.stageId}`}>
                    <p className="text-xs font-semibold text-zinc-300 truncate">{s.name}</p>
                    <div className="h-7 rounded-lg overflow-hidden relative" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="h-full rounded-lg" style={{ width: `${Math.max((s.count / maxStage) * 100, 4)}%`, background: `linear-gradient(90deg, ${color}66, ${color}22)` }} />
                      <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] font-black text-white tabular-nums">{s.count}</span>
                    </div>
                    <p className="text-xs font-bold text-right tabular-nums" style={{ color }}>{fmtMoney(s.valueCents, deals.currency)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
