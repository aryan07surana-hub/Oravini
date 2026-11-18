import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Users, MessageSquare, HelpCircle, ThumbsUp,
  Clock, Video, TrendingUp, Download, BarChart2, MousePointerClick, ChevronRight, Film, ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const GOLD = "#d4b461";

function fmtDuration(secs: number): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "0%";
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <h2 className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}60` }}>{children}</h2>
      {right}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl ${className}`} style={{ background: "linear-gradient(180deg, #0e0e13 0%, #0a0a0e 100%)", border: `1px solid ${GOLD}14` }}>
      {children}
    </div>
  );
}

/* ── Hero: Registered → Attended → Clicked CTA ───────────────────────────── */
function ConversionFunnel({ conversion }: { conversion: any }) {
  const registered = conversion?.registered ?? 0;
  const attended = conversion?.attended ?? 0;
  const clicked = conversion?.clickedCta ?? 0;
  const top = Math.max(registered, attended, clicked, 1);
  const steps = [
    { label: "Registered", value: registered, color: "#60a5fa", icon: Users },
    { label: "Attended", value: attended, color: "#34d399", icon: TrendingUp },
    { label: "Clicked CTA", value: clicked, color: GOLD, icon: MousePointerClick },
  ];
  const transitions = [
    { label: "Show rate", value: conversion?.showRate, sub: "attended / registered" },
    { label: "CTA / attendee", value: conversion?.ctaPerAttendee, sub: "clicked / attended" },
  ];

  return (
    <Panel className="p-6 sm:p-8 h-full">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: `${GOLD}70` }}>Conversion funnel</p>
          <h3 className="text-xl font-black text-white tracking-tight mt-1">From sign-up to sale</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Overall</p>
          <p className="text-2xl font-black" style={{ color: GOLD }}>{fmtPct(conversion?.ctaPerRegistration)}</p>
          <p className="text-[10px] text-zinc-600">clicked / registered</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3">
        {steps.map((st, i) => {
          const Icon = st.icon;
          const h = Math.max((st.value / top) * 100, st.value > 0 ? 8 : 4);
          return (
            <div key={st.label} className="contents">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${st.color}14`, border: `1px solid ${st.color}28` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{st.label}</span>
                </div>
                <p className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">{st.value.toLocaleString()}</p>
                <div className="mt-5 h-28 rounded-2xl flex items-end overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="w-full rounded-2xl transition-all duration-700" style={{
                    height: `${h}%`,
                    background: `linear-gradient(180deg, ${st.color}cc 0%, ${st.color}33 100%)`,
                    boxShadow: `0 -8px 30px ${st.color}22`,
                  }} />
                </div>
              </div>
              {i < transitions.length && (
                <div className="flex md:flex-col items-center justify-center gap-2 py-2 md:py-0 md:pt-10">
                  <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90 md:rotate-0" />
                  <div className="rounded-full px-3 py-1 text-center" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}22` }}>
                    <p className="text-sm font-black" style={{ color: GOLD }}>{fmtPct(transitions[i].value)}</p>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600 text-center whitespace-nowrap">{transitions[i].label}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function KpiTile({ label, value, sub, color = GOLD }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="text-2xl font-black mt-1 tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Stay rate bars ─────────────────────────────────────────────────────── */
function StayRatePanel({ stayRate, attendees }: { stayRate: any; attendees: number }) {
  const marks = [
    { key: "p25", label: "25% in" },
    { key: "p50", label: "Halfway" },
    { key: "p75", label: "75% in" },
  ];
  const hasData = !!stayRate && attendees > 0;
  return (
    <Panel className="p-6 h-full">
      <h3 className="text-sm font-black text-white tracking-tight">Stay rate</h3>
      <p className="text-[11px] text-zinc-500 mt-0.5 mb-6">% of {attendees} attendee{attendees === 1 ? "" : "s"} still watching at each checkpoint</p>
      {!hasData ? (
        <p className="text-xs text-zinc-600 py-10 text-center">No viewer sessions yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 items-end h-48">
          {marks.map(m => {
            const d = stayRate[m.key] || { pct: 0, viewers: 0, minute: 0 };
            const color = d.pct >= 60 ? "#34d399" : d.pct >= 30 ? GOLD : "#f87171";
            return (
              <div key={m.key} className="flex flex-col items-center h-full">
                <span className="text-xl font-black mb-2" style={{ color }}>{d.pct}%</span>
                <div className="flex-1 w-full max-w-[64px] rounded-xl flex items-end overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-full rounded-xl transition-all duration-700" style={{ height: `${Math.max(d.pct, 2)}%`, background: `linear-gradient(180deg, ${color} 0%, ${color}40 100%)` }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 mt-3">{m.label}</span>
                <span className="text-[10px] text-zinc-600">min {d.minute} · {d.viewers} watching</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ── Drop-off area chart ────────────────────────────────────────────────── */
function DropOffChart({ timeline, isLive, stayRate }: { timeline: any[]; isLive?: boolean; stayRate?: any }) {
  if (!timeline || timeline.length < 2) {
    return (
      <Panel className="p-12 text-center">
        <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${GOLD}12` }}>
          <TrendingUp className="w-5 h-5" style={{ color: `${GOLD}70` }} />
        </div>
        <p className="text-zinc-400 text-sm font-semibold">
          {isLive ? "Collecting viewer data…" : "No viewer sessions recorded yet"}
        </p>
        <p className="text-zinc-600 text-xs mt-1">
          {isLive
            ? "The drop-off curve fills in minute by minute as viewers watch."
            : "Run a live webinar to generate the drop-off curve."}
        </p>
      </Panel>
    );
  }

  const maxViewers = Math.max(...timeline.map(t => t.viewers), 1);
  const ctaMinutes = timeline.filter(t => t.ctaClicks > 0);
  const peakPoint = timeline.reduce((p, c) => c.viewers > p.viewers ? c : p, timeline[0]);
  const peakIdx = timeline.indexOf(peakPoint);
  const halfIdx = timeline.findIndex((t, i) => i > peakIdx && t.viewers <= maxViewers / 2);
  const retentionMin = halfIdx > 0 ? timeline[halfIdx].minute : null;
  const endViewers = timeline[timeline.length - 1]?.viewers ?? 0;
  const data = timeline.map(t => ({
    ...t,
    retention: Math.round((t.viewers / maxViewers) * 100),
    engagement: (t.chats || 0) + (t.reactions || 0) + (t.questions || 0) + (t.pollVotes || 0),
  }));
  const maxEngagement = Math.max(...data.map(d => d.engagement), 1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const row = (label: string, value: number, cls: string) => value > 0 ? (
      <div className="flex justify-between gap-4"><span className="text-zinc-400">{label}</span><span className={`font-bold ${cls}`}>{value}</span></div>
    ) : null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ background: "#141417", border: `1px solid ${GOLD}30`, minWidth: 160 }}>
        <p className="font-black mb-2" style={{ color: GOLD }}>Minute {d.minute}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Viewers</span><span className="font-bold text-white">{d.viewers}</span></div>
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Of peak</span><span className="font-bold text-white">{d.retention}%</span></div>
          {row("Chat", d.chats, "text-blue-400")}
          {row("Reactions", d.reactions, "text-pink-400")}
          {row("Questions", d.questions, "text-amber-400")}
          {row("Poll votes", d.pollVotes, "text-orange-400")}
          {d.ctaClicks > 0 && <div className="flex justify-between gap-4"><span className="font-bold" style={{ color: GOLD }}>CTA clicks</span><span className="font-bold" style={{ color: GOLD }}>{d.ctaClicks}</span></div>}
        </div>
      </div>
    );
  };

  return (
    <Panel className="p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Viewer drop-off</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Concurrent viewers each minute · engagement bursts below · dashed lines mark CTA clicks</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { color: GOLD, label: "Viewers" },
            { color: "rgba(96,165,250,0.7)", label: "Engagement" },
            { color: GOLD, label: "CTA click", dashed: true },
          ].map(({ color, label, dashed }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              {dashed
                ? <span className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: color }} />
                : <span className="w-3 h-2 rounded-sm" style={{ background: color }} />}
              {label}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="dropOffGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="minute"
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickFormatter={m => `${m}m`}
            interval={Math.max(0, Math.floor(data.length / 10))}
          />
          <YAxis
            yAxisId="viewers"
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          {/* Engagement uses its own hidden axis, capped to the bottom ~30% of the chart */}
          <YAxis yAxisId="engagement" hide domain={[0, maxEngagement * 3.3]} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${GOLD}40`, strokeWidth: 1 }} />

          {stayRate && ["p25", "p50", "p75"].map(k => stayRate[k] && stayRate[k].minute > 0 ? (
            <ReferenceLine key={k} yAxisId="viewers" x={stayRate[k].minute} stroke="rgba(255,255,255,0.10)" strokeWidth={1}
              label={{ value: k.replace("p", "") + "%", position: "top", fill: "#52525b", fontSize: 9 }} />
          ) : null)}
          {ctaMinutes.map(t => (
            <ReferenceLine key={`cta-${t.minute}`} yAxisId="viewers" x={t.minute} stroke={GOLD} strokeWidth={1.5} strokeDasharray="4 4" />
          ))}

          <Bar yAxisId="engagement" dataKey="engagement" fill="rgba(96,165,250,0.45)" radius={[2, 2, 0, 0]} maxBarSize={8} />
          <Area
            yAxisId="viewers"
            type="monotone"
            dataKey="viewers"
            fill="url(#dropOffGrad)"
            stroke={GOLD}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: GOLD, stroke: "#0a0a0e", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <KpiTile label="Peak" value={peakPoint.viewers} sub={`at minute ${peakPoint.minute}`} />
        <KpiTile label="50% drop-off" value={retentionMin != null ? `min ${retentionMin}` : "—"} sub={retentionMin != null ? "half of peak gone" : "never fell below half"} color="#f87171" />
        <KpiTile label="Still watching at end" value={`${Math.round((endViewers / maxViewers) * 100)}%`} sub={`${endViewers} of ${maxViewers} peak`} color="#34d399" />
        <KpiTile label="CTA moments" value={ctaMinutes.length} sub={ctaMinutes.length ? `min ${ctaMinutes.slice(0, 4).map(t => t.minute).join(", ")}${ctaMinutes.length > 4 ? "…" : ""}` : "no clicks yet"} />
      </div>
    </Panel>
  );
}

/* ── Engagement counters ────────────────────────────────────────────────── */
function EngagementPanel({ items, engagementRate, completionRate }: {
  items: { label: string; value: number; icon: any; color: string }[];
  engagementRate: number; completionRate: number;
}) {
  return (
    <Panel className="p-6 h-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">Engagement</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Everything your audience did during the session</p>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Engagement rate</p>
            <p className="text-lg font-black" style={{ color: GOLD }}>{fmtPct(engagementRate)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Completion</p>
            <p className="text-lg font-black text-emerald-400">{fmtPct(completionRate)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: `${color}08`, border: `1px solid ${color}1c` }}>
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</span>
            </div>
            <p className="text-3xl font-black text-white mt-2 tracking-tight">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

type AttendeeSort = "watch" | "joined" | "name";

function AttendeeTable({ attendeeList, duration }: { attendeeList: any[]; duration: number }) {
  const [sort, setSort] = useState<AttendeeSort>("watch");
  const rows = useMemo(() => {
    const list = [...attendeeList];
    if (sort === "watch") list.sort((x, y) => (y.watchedSeconds || 0) - (x.watchedSeconds || 0));
    if (sort === "joined") list.sort((x, y) => new Date(x.joinedAt || 0).getTime() - new Date(y.joinedAt || 0).getTime());
    if (sort === "name") list.sort((x, y) => String(x.name || "").localeCompare(String(y.name || "")));
    return list;
  }, [attendeeList, sort]);
  const maxWatch = Math.max(duration || 0, ...attendeeList.map(r => r.watchedSeconds || 0), 1);

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">Attendees</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{attendeeList.length} viewer session{attendeeList.length === 1 ? "" : "s"} · join & leave times, watch duration</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ArrowUpDown className="w-3 h-3 text-zinc-500 mx-1.5" />
          {([["watch", "Watch time"], ["joined", "Joined"], ["name", "Name"]] as [AttendeeSort, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)}
              className="text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg transition-colors"
              style={sort === k ? { background: `${GOLD}20`, color: GOLD } : { color: "#71717a" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0" style={{ background: "#0d0d12" }}>
            <tr>
              {["Attendee", "Joined", "Left", "Watch duration", "Status"].map(h => (
                <th key={h} className="text-left px-6 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-[0.14em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => {
              const w = r.watchedSeconds || 0;
              return (
                <tr key={r.id || i} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                        style={{ background: `hsl(${((r.name || "?").charCodeAt(0) * 37) % 360}, 40%, 30%)` }}>
                        {(r.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-semibold truncate max-w-[200px]">{r.name || "Anonymous"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                    {r.joinedAt ? format(new Date(r.joinedAt), "MMM d, h:mm a") : "—"}
                  </td>
                  <td className="px-6 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                    {r.leftAt ? format(new Date(r.leftAt), "h:mm a") : "—"}
                    {r.dropOffMinute != null && <span className="ml-1.5 text-[10px] text-zinc-600">min {r.dropOffMinute}</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[140px]" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (w / maxWatch) * 100)}%`, background: GOLD }} />
                      </div>
                      <span className="text-zinc-200 text-xs font-bold whitespace-nowrap">{fmtDuration(w)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {r.active ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Watching
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-zinc-500" style={{ background: "rgba(255,255,255,0.04)" }}>Left</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function WebinarAnalytics() {
  const params = useParams<{ id: string }>();
  const [, nav] = useLocation();
  const webinarId = params.id;

  const { data: analytics, isLoading, error } = useQuery<any>({
    queryKey: [`/api/webinars/${webinarId}/analytics`],
    enabled: !!webinarId,
    refetchInterval: 15000,
  });

  const { data: engagementScores = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/engagement-scores`],
    enabled: !!webinarId,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  if (error || !analytics) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#040406" }}>
      <p className="text-zinc-400">Could not load analytics.</p>
      <Button onClick={() => nav("/video-marketing")} variant="ghost" className="text-zinc-400">← Back</Button>
    </div>
  );

  const a = analytics || {};
  const webinar = a.webinar || {};
  const registrations = a.registrations ?? 0;
  const attended = a.attended ?? 0;
  const uniqueViewers = a.uniqueViewers ?? 0;
  const peakViewers = a.peakViewers ?? 0;
  const avgWatchTime = a.avgWatchTime ?? 0;
  const totalWatchSeconds = a.totalWatchSeconds ?? 0;
  const chatMessages = a.chatMessages ?? 0;
  const qaQuestions = a.qaQuestions ?? 0;
  const totalReactions = a.totalReactions ?? 0;
  const pollVotes = a.pollVotes ?? 0;
  const ctaClicks = a.ctaClicks ?? 0;
  const engagementRate = a.engagementRate ?? 0;
  const showRate = a.showRate ?? 0;
  const completionRate = a.completionRate ?? 0;
  const duration = a.duration ?? 0;
  const timeline = a.timeline ?? [];
  const attendeeList = a.attendeeList ?? [];
  const recordings = a.recordings ?? [];
  const chatTranscript = a.chatTranscript ?? [];
  const qaLog = a.qaLog ?? [];
  const medianWatchTime = a.medianWatchTime ?? 0;
  const peakMinute: number | null = a.peakMinute ?? null;
  const stayRate = a.stayRate ?? null;
  const attendees = a.attendees ?? attended;
  const uniqueViewerIds = a.uniqueViewerIds ?? uniqueViewers;
  const conversion = a.conversion ?? {
    registered: registrations,
    attended,
    clickedCta: ctaClicks,
    showRate,
    ctaPerAttendee: attended > 0 ? Math.round((ctaClicks / attended) * 1000) / 10 : 0,
    ctaPerRegistration: registrations > 0 ? Math.round((ctaClicks / registrations) * 1000) / 10 : 0,
  };

  const isLive = webinar?.status === "live";
  const hasAnyData = registrations > 0 || attendeeList.length > 0 || timeline.length > 1 || chatTranscript.length > 0;

  return (
    <div className="min-h-screen relative" style={{ background: "#040406", color: "#fff" }}>
      <div className="absolute inset-x-0 top-0 h-[520px] pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${GOLD}0d 0%, transparent 70%)` }} />

      {/* ── HEADER ── */}
      <div className="relative z-40 sticky top-0" style={{ background: "rgba(4,4,6,0.9)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${GOLD}14` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => nav(`/webinar-studio/${webinarId}`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              style={{ color: `${GOLD}90`, background: `${GOLD}0c`, border: `1px solid ${GOLD}1c` }}
              aria-label="Back to studio">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-white truncate" style={{ letterSpacing: "-0.01em" }}>{webinar.title || "Webinar"}</p>
                <Badge className="text-[10px] h-4 px-1.5 py-0 border-none flex-shrink-0" style={{
                  background: isLive ? "#ef444422" : webinar.status === "completed" ? "#10b98122" : "#52525b22",
                  color: isLive ? "#f87171" : webinar.status === "completed" ? "#34d399" : "#a1a1aa",
                }}>{isLive ? "● live" : webinar.status}</Badge>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {webinar.scheduledAt ? format(new Date(webinar.scheduledAt), "EEEE, MMM d, yyyy 'at' h:mm a") : ""}
                {duration ? ` · ${fmtDuration(duration)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => nav("/recordings")}
              className="gap-1.5 font-bold text-xs text-zinc-400 hover:text-white hidden sm:inline-flex">
              <Film className="w-3.5 h-3.5" /> Recordings
            </Button>
            <Button size="sm" onClick={() => nav(`/webinar-studio/${webinarId}`)}
              className="gap-1.5 font-black text-xs uppercase tracking-wide"
              style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>
              <Video className="w-3.5 h-3.5" /> Studio
            </Button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-10 space-y-12">

        {/* ── HERO: funnel + key numbers ── */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8">
            <ConversionFunnel conversion={conversion} />
          </div>
          <Panel className="xl:col-span-4 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: `${GOLD}70` }}>Audience & watch time</p>
            <div className="grid grid-cols-2 gap-3">
              <KpiTile label="Registrations" value={registrations} color="#60a5fa" />
              <KpiTile label="Attended" value={attended} sub={`${fmtPct(showRate)} show rate`} color="#34d399" />
              <KpiTile label="Peak concurrent" value={peakViewers} sub={peakMinute != null ? `at minute ${peakMinute}` : undefined} />
              <KpiTile label="Unique viewers" value={uniqueViewerIds} color="#60a5fa" />
              <KpiTile label="Avg watch" value={fmtDuration(avgWatchTime)} color="#a78bfa" />
              <KpiTile label="Median watch" value={fmtDuration(medianWatchTime)} color="#c4b5fd" />
              <KpiTile label="Total watch" value={fmtDuration(totalWatchSeconds)} />
              <KpiTile label="Duration" value={duration ? fmtDuration(duration) : isLive ? "Live now" : "—"} color="#a78bfa" />
            </div>
          </Panel>
        </section>

        {/* ── DROP-OFF CHART ── */}
        <section>
          <SectionLabel>Viewer timeline</SectionLabel>
          <DropOffChart timeline={timeline} isLive={isLive} stayRate={stayRate} />
        </section>

        {/* ── STAY RATE + ENGAGEMENT ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5">
            <StayRatePanel stayRate={stayRate} attendees={attendees} />
          </div>
          <div className="lg:col-span-7">
            <EngagementPanel
              engagementRate={engagementRate}
              completionRate={completionRate}
              items={[
                { label: "Chat", value: chatMessages, icon: MessageSquare, color: "#60a5fa" },
                { label: "Q&A", value: qaQuestions, icon: HelpCircle, color: "#fbbf24" },
                { label: "Reactions", value: totalReactions, icon: ThumbsUp, color: "#f472b6" },
                { label: "Poll votes", value: pollVotes, icon: BarChart2, color: "#fb923c" },
                { label: "CTA clicks", value: ctaClicks, icon: MousePointerClick, color: "#34d399" },
                { label: "Watch hours", value: Math.round((totalWatchSeconds / 3600) * 10) / 10, icon: Clock, color: GOLD },
              ]}
            />
          </div>
        </section>

        {/* ── ATTENDEE TABLE ── */}
        {attendeeList.length > 0 && (
          <section>
            <SectionLabel>Per-attendee</SectionLabel>
            <AttendeeTable attendeeList={attendeeList} duration={duration} />
          </section>
        )}

        {/* ── ENGAGEMENT LEADERBOARD ── */}
        {engagementScores && engagementScores.length > 0 && (
          <section>
            <SectionLabel>Top engaged attendees ({engagementScores.length})</SectionLabel>
            <Panel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.025)" }}>
                      {["#", "Attendee", "Engagement", "Chat", "Polls", "Reactions", "CTAs", "Watch time"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-[0.14em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {engagementScores.slice(0, 20).map((s: any, i: number) => (
                      <tr key={s.id || i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="px-4 py-3 text-zinc-500 font-mono text-xs">#{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-white text-xs font-semibold">{s.viewerName || "Anonymous"}</p>
                          {s.viewerEmail && <p className="text-[10px] text-zinc-600">{s.viewerEmail}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden max-w-[80px]">
                              <div className="h-full rounded-full" style={{ width: `${s.engagementScore || 0}%`, background: GOLD }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: GOLD }}>{Math.round(s.engagementScore || 0)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{s.chatMessages || 0}</td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{s.pollsVoted || 0}</td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{s.reactionsCount || 0}</td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{s.ctaClicks || 0}</td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{fmtDuration(s.watchDuration || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>
        )}

        {/* ── RECORDINGS ── */}
        {recordings.length > 0 && (
          <section>
            <SectionLabel right={
              <button onClick={() => nav("/recordings")} className="text-[11px] font-bold flex items-center gap-1" style={{ color: GOLD }}>
                Open library <ChevronRight className="w-3 h-3" />
              </button>
            }>Recordings ({recordings.length})</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {recordings[0]?.recordingUrl && (
                <Panel className="lg:col-span-8 overflow-hidden">
                  <video src={recordings[0].recordingUrl} controls preload="metadata" className="w-full aspect-video bg-black" />
                </Panel>
              )}
              <div className="lg:col-span-4 space-y-3">
                {recordings.map((rec: any) => (
                  <div key={rec.id} className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}15` }}>
                      <Video className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{rec.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {rec.duration ? fmtDuration(rec.duration) : ""}
                        {rec.createdAt ? `${rec.duration ? " · " : ""}${format(new Date(rec.createdAt), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <a href={rec.recordingUrl} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg flex-shrink-0" style={{ background: `${GOLD}18`, color: GOLD }} aria-label="Download recording">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CHAT + Q&A TRANSCRIPTS ── */}
        {(chatTranscript.length > 0 || qaLog.length > 0) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {chatTranscript.length > 0 && (
              <div>
                <SectionLabel>Chat transcript ({chatTranscript.length})</SectionLabel>
                <Panel className="overflow-y-auto max-h-80 p-5 space-y-3">
                  {chatTranscript.map((m: any, i: number) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: "#60a5fa" }}>{m.name || "Anonymous"}</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{m.text}</p>
                      <span className="text-[9px] text-zinc-600">{m.ts ? format(new Date(m.ts), "h:mm a") : ""}</span>
                    </div>
                  ))}
                </Panel>
              </div>
            )}
            {qaLog.length > 0 && (
              <div>
                <SectionLabel>Q&A log ({qaLog.length})</SectionLabel>
                <Panel className="overflow-y-auto max-h-80 p-5 space-y-3">
                  {qaLog.map((q: any, i: number) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: "#fbbf24" }}>{q.name || "Anonymous"}</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{q.question}</p>
                      <span className="text-[9px] text-zinc-600">{q.ts ? format(new Date(q.ts), "h:mm a") : ""}</span>
                    </div>
                  ))}
                </Panel>
              </div>
            )}
          </section>
        )}

        {/* ── EMPTY STATE ── */}
        {!hasAnyData && !recordings.length && (
          <div className="rounded-3xl p-12 text-center" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-400 font-semibold mb-1">No event data yet</p>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              Analytics are collected live as attendees join your webinar.
              Go live in the Studio to start tracking chat, reactions, Q&A, and attendees.
            </p>
            <Button size="sm" className="mt-4 gap-1.5 font-semibold" style={{ background: GOLD, color: "#000" }}
              onClick={() => nav(`/webinar-studio/${webinarId}`)}>
              <Video className="w-3.5 h-3.5" /> Open Studio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
