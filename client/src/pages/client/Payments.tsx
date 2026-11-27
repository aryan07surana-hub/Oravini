import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CreditCard, Loader2, Table2, BarChart3 } from "lucide-react";
import ClientLayout from "@/components/layout/ClientLayout";
import PaymentConnections, { PROVIDER_META, REVENUE_KEY, type PaymentConnection, type ProviderId } from "@/components/payments/PaymentConnections";

const GOLD = "#d4b461";

interface RevenueItem { id: string; amount: number; currency: string; date: string; status: string; source: ProviderId }
interface ProcessorData {
  provider: ProviderId; currency: string; total30d: number; thisMonth: number; lastMonth: number;
  recent: RevenueItem[]; balance?: { available: number; pending: number; currency: string } | null;
  otherCurrencies?: string[]; notes?: string[]; error?: string;
}
type DailyPoint = { date: string } & Partial<Record<ProviderId, number>>;
interface RevenueResponse {
  connections: PaymentConnection[];
  processors: Partial<Record<ProviderId, ProcessorData>>;
  combined: null | {
    currency: string; total30d: number; thisMonth: number; lastMonth: number; excluded: ProviderId[];
    daily: DailyPoint[]; recent: RevenueItem[];
  };
}

function money(amount: number, currency: string, compact = false) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency: currency.toUpperCase(),
      notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

const cardStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };

function StatCard({ label, value, sub, testId }: { label: string; value: string; sub?: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-2xl p-5" style={cardStyle} data-testid={testId}>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function MonthCompare({ thisMonth, lastMonth, currency }: { thisMonth: number; lastMonth: number; currency: string }) {
  const pct = pctChange(thisMonth, lastMonth);
  return (
    <span className="flex items-center gap-1">
      {pct !== null && (
        <span className={`flex items-center font-semibold ${pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(pct).toFixed(0)}%
        </span>
      )}
      <span>vs {money(lastMonth, currency)} last month</span>
    </span>
  );
}

function ChartTooltip({ active, payload, label, currency, providers }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-zinc-950 border border-zinc-700 shadow-lg">
      <p className="text-zinc-400 mb-1">{new Date(label + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</p>
      {(providers as ProviderId[]).map(p => {
        const item = payload.find((x: any) => x.dataKey === p);
        return (
          <p key={p} className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-sm" style={{ background: PROVIDER_META[p].color }} />
            {PROVIDER_META[p].name}<span className="ml-auto pl-3 text-white tabular-nums">{money(item?.value || 0, currency)}</span>
          </p>
        );
      })}
      {providers.length > 1 && <p className="text-white font-semibold mt-1 pt-1 border-t border-zinc-800 tabular-nums">Total {money(total, currency)}</p>}
    </div>
  );
}

function RevenueChart({ daily, currency, providers }: { daily: DailyPoint[]; currency: string; providers: ProviderId[] }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div className="rounded-2xl p-5" style={cardStyle} data-testid="payments-chart">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm font-bold text-white">Revenue by day <span className="text-zinc-500 font-normal">· last 30 days</span></p>
        <div className="flex items-center gap-4">
          {providers.length > 1 && providers.map(p => (
            <span key={p} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PROVIDER_META[p].color }} />{PROVIDER_META[p].name}
            </span>
          ))}
          <button onClick={() => setAsTable(v => !v)} className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1" aria-label={asTable ? "Show chart" : "Show table"}>
            {asTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}{asTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-zinc-500 text-left"><th className="py-1 font-medium">Date</th>{providers.map(p => <th key={p} className="py-1 font-medium text-right">{PROVIDER_META[p].name}</th>)}</tr></thead>
            <tbody>
              {[...daily].reverse().map(d => (
                <tr key={d.date} className="border-t border-zinc-800/60 text-zinc-300">
                  <td className="py-1">{d.date}</td>
                  {providers.map(p => <td key={p} className="py-1 text-right tabular-nums">{money(d[p] || 0, currency)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#71717a", fontSize: 11 }} interval="preserveStartEnd" minTickGap={24}
                tickFormatter={(d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v: number) => money(v, currency, true)} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip currency={currency} providers={providers} />} />
              {providers.map((p, i) => (
                <Bar key={p} dataKey={p} stackId="rev" fill={PROVIDER_META[p].color} stroke="#0c0c0e" strokeWidth={providers.length > 1 ? 1 : 0}
                  radius={i === providers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function statusClass(status: string) {
  if (["succeeded", "paid", "resolved"].includes(status)) return "text-emerald-400 bg-emerald-500/10";
  if (["failed", "uncollectible", "void", "refunded"].includes(status)) return "text-red-400 bg-red-500/10";
  return "text-zinc-300 bg-zinc-700/40";
}

function RecentList({ items, showSource }: { items: RevenueItem[]; showSource: boolean }) {
  if (!items.length) return <p className="text-xs text-zinc-500 py-4">No payments in this period yet.</p>;
  return (
    <div className="divide-y divide-zinc-800/70">
      {items.map(i => (
        <div key={`${i.source}-${i.id}`} className="flex items-center gap-3 py-2.5 text-sm">
          {showSource && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: PROVIDER_META[i.source].color }} aria-hidden />}
          <span className="text-white font-semibold tabular-nums w-28 shrink-0">{money(i.amount, i.currency)}</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusClass(i.status)}`}>{i.status.replace(/_/g, " ")}</span>
          <span className="ml-auto text-xs text-zinc-500">{showSource && `${PROVIDER_META[i.source].name} · `}{new Date(i.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      ))}
    </div>
  );
}

function ProcessorSection({ data }: { data: ProcessorData }) {
  const meta = PROVIDER_META[data.provider];
  return (
    <div className="rounded-2xl p-5" style={cardStyle} data-testid={`payments-section-${data.provider}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: meta.color }} />
        <p className="text-sm font-bold text-white">{meta.name}</p>
      </div>
      {data.error ? (
        <p className="text-xs text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{data.error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div><p className="text-[11px] text-zinc-500 uppercase tracking-wider">30 days</p><p className="text-base font-bold text-white tabular-nums">{money(data.total30d, data.currency)}</p></div>
            <div><p className="text-[11px] text-zinc-500 uppercase tracking-wider">This month</p><p className="text-base font-bold text-white tabular-nums">{money(data.thisMonth, data.currency)}</p></div>
            <div><p className="text-[11px] text-zinc-500 uppercase tracking-wider">Last month</p><p className="text-base font-bold text-white tabular-nums">{money(data.lastMonth, data.currency)}</p></div>
            {data.balance && (
              <div><p className="text-[11px] text-zinc-500 uppercase tracking-wider">Balance</p><p className="text-base font-bold text-white tabular-nums">{money(data.balance.available, data.balance.currency)}</p>
                <p className="text-[11px] text-zinc-500">{money(data.balance.pending, data.balance.currency)} pending</p></div>
            )}
          </div>
          {!!data.otherCurrencies?.length && <p className="text-[11px] text-zinc-500 mb-2">Totals are in {data.currency.toUpperCase()}; charges in {data.otherCurrencies.map(c => c.toUpperCase()).join(", ")} appear in the list but not in the totals.</p>}
          {data.notes?.map(n => <p key={n} className="text-[11px] text-zinc-500 mb-2">{n}</p>)}
          <p className="text-xs font-semibold text-zinc-400 mb-1">Recent {data.provider === "stripe" ? "charges" : "payments"}</p>
          <RecentList items={data.recent.slice(0, 10)} showSource={false} />
        </>
      )}
    </div>
  );
}

export default function Payments() {
  const { data, isLoading, error } = useQuery<RevenueResponse>({ queryKey: [REVENUE_KEY], staleTime: 60_000 });
  const providers = useMemo(
    () => (["stripe", "whop"] as ProviderId[]).filter(p => data?.processors?.[p] && !data.processors[p]!.error),
    [data],
  );
  const connected = data?.connections ?? [];
  const combined = data?.combined;

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
            <CreditCard className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Revenue</h1>
            <p className="text-xs text-zinc-500">Your Stripe and Whop sales in one place. Only visible to you.</p>
          </div>
        </div>

        <a href="/get-paid" className="block rounded-2xl p-4 text-sm text-zinc-200 hover:bg-white/[0.04]" style={cardStyle} data-testid="link-get-paid">
          <span className="font-bold text-white">Sell with Oravini checkout.</span> Connect your Whop account, make checkout links and sell inside your webinars. Oravini takes 1.5% per sale.
        </a>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500 py-10 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading revenue…</div>
        ) : error ? (
          <p className="text-sm text-red-400">Could not load revenue. Refresh to try again.</p>
        ) : connected.length === 0 ? (
          <div className="rounded-2xl p-6" style={cardStyle} data-testid="payments-empty">
            <p className="text-base font-bold text-white">Connect a payment processor</p>
            <p className="text-sm text-zinc-500 mb-5">See your revenue, recent payments and daily trend. Connect Stripe, Whop, or both.</p>
            <PaymentConnections />
          </div>
        ) : (
          <>
            {combined && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard testId="payments-total-30d" label="Revenue · last 30 days" value={money(combined.total30d, combined.currency)}
                    sub={providers.length > 1 ? "Stripe + Whop" : PROVIDER_META[providers[0]]?.name} />
                  <StatCard testId="payments-this-month" label="This month" value={money(combined.thisMonth, combined.currency)}
                    sub={<MonthCompare thisMonth={combined.thisMonth} lastMonth={combined.lastMonth} currency={combined.currency} />} />
                  <StatCard label="Last month" value={money(combined.lastMonth, combined.currency)} />
                </div>
                {combined.excluded.length > 0 && (
                  <p className="text-xs text-zinc-500">{combined.excluded.map(p => PROVIDER_META[p].name).join(", ")} reports in a different currency, so it is shown in its own section and not added to these totals.</p>
                )}
                <RevenueChart daily={combined.daily} currency={combined.currency} providers={providers.filter(p => !combined.excluded.includes(p))} />
                <div className="rounded-2xl p-5" style={cardStyle} data-testid="payments-recent">
                  <p className="text-sm font-bold text-white mb-1">Recent payments</p>
                  <RecentList items={combined.recent.slice(0, 15)} showSource={connected.length > 1} />
                </div>
              </>
            )}
            {connected.length > 1 || Object.values(data?.processors ?? {}).some(p => p?.error) ? (
              <div className="grid gap-4">
                {(["stripe", "whop"] as ProviderId[]).map(p => data?.processors?.[p] && <ProcessorSection key={p} data={data.processors[p]!} />)}
              </div>
            ) : null}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <p className="text-sm font-bold text-white mb-3">Connections</p>
              <PaymentConnections compact />
            </div>
            <p className="text-[11px] text-zinc-600">Figures refresh every 5 minutes.</p>
          </>
        )}
      </div>
    </ClientLayout>
  );
}

