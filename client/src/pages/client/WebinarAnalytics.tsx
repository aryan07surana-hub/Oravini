import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, MessageSquare, HelpCircle, ThumbsUp,
  Hand, Clock, Video, TrendingUp, Download, BarChart2, Zap, Target, MousePointerClick,
} from "lucide-react";
import { format } from "date-fns";
import {
  ComposedChart, Area, Bar, XAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const GOLD = "#d4b461";

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: string | number; icon: any; color?: string }) {
  const c = color || GOLD;
  return (
    <div className="rounded-2xl p-4" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: `${GOLD}55` }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${c}14`, border: `1px solid ${c}22` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: c }} />
        </div>
      </div>
      <span className="text-3xl font-black" style={{
        background: `linear-gradient(135deg, #fff 0%, ${c} 100%)`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        letterSpacing: "-0.02em",
      }}>{value}</span>
    </div>
  );
}

function fmtDuration(secs: number): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ViewerHeatmap({ timeline }: { timeline: any[] }) {
  if (!timeline || timeline.length < 2) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${GOLD}12` }}>
          <TrendingUp className="w-5 h-5" style={{ color: `${GOLD}60` }} />
        </div>
        <p className="text-zinc-500 text-sm font-semibold">Timeline available after webinar ends</p>
        <p className="text-zinc-700 text-xs mt-1">Run a live webinar to generate the dropout curve and engagement heatmap.</p>
      </div>
    );
  }

  const maxViewers    = Math.max(...timeline.map(t => t.viewers), 1);
  const maxEngagement = Math.max(...timeline.map(t => t.chats + t.reactions), 1);
  const ctaMinutes    = timeline.filter(t => t.ctaClicks > 0);
  const peakMinute    = timeline.reduce((p, c) => c.viewers > p.viewers ? c : p, timeline[0]);
  const halfViewers   = maxViewers / 2;
  const halfIdx       = timeline.findIndex(t => t.minute > 0 && t.viewers <= halfViewers);
  const retentionMin  = halfIdx > 0 ? timeline[halfIdx].minute : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ background: "#141417", border: `1px solid ${GOLD}30`, minWidth: 148 }}>
        <p className="font-black mb-2" style={{ color: GOLD }}>Minute {d.minute}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Viewers</span><span className="font-bold text-white">{d.viewers}</span></div>
          {d.chats    > 0 && <div className="flex justify-between gap-4"><span className="text-zinc-400">Chat</span><span className="font-bold text-blue-400">{d.chats}</span></div>}
          {d.reactions > 0 && <div className="flex justify-between gap-4"><span className="text-zinc-400">Reactions</span><span className="font-bold text-pink-400">{d.reactions}</span></div>}
          {d.ctaClicks > 0 && <div className="flex justify-between gap-4"><span style={{ color: GOLD }} className="font-bold">⚡ CTA Clicks</span><span className="font-bold" style={{ color: GOLD }}>{d.ctaClicks}</span></div>}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl p-5 space-y-5" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-white tracking-tight">Viewer Dropout Curve</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">When people left · chat & reaction bursts · CTA conversion moments</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
          {[
            { color: `${GOLD}70`, label: "Viewers" },
            { color: "rgba(96,165,250,0.7)", label: "Chat" },
            { color: "rgba(244,114,182,0.7)", label: "Reactions" },
            { color: GOLD, label: "CTA Click", dot: true },
          ].map(({ color, label, dot }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              {dot
                ? <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                : <span className="w-3 h-2 rounded-sm" style={{ background: color }} />
              }
              {label}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="hmViewerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={GOLD} stopOpacity={0.45} />
              <stop offset="95%" stopColor={GOLD} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="minute"
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={m => `${m}m`}
            interval={Math.max(1, Math.floor(timeline.length / 8))}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${GOLD}30`, strokeWidth: 1 }} />

          {/* CTA click reference lines */}
          {ctaMinutes.map(t => (
            <ReferenceLine key={t.minute} x={t.minute} stroke={GOLD} strokeWidth={1.5} strokeDasharray="3 3" />
          ))}

          {/* Viewer dropout area */}
          <Area
            type="monotone"
            dataKey="viewers"
            fill="url(#hmViewerGrad)"
            stroke={GOLD}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
          />

          {/* Engagement bars — scaled so they appear at bottom of chart */}
          <Bar dataKey="chats"     fill="rgba(96,165,250,0.55)"  radius={[2,2,0,0]} maxBarSize={6} />
          <Bar dataKey="reactions" fill="rgba(244,114,182,0.55)" radius={[2,2,0,0]} maxBarSize={6} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Insight pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20`, color: GOLD }}>
          <TrendingUp className="w-3 h-3" />
          Peak: {peakMinute.viewers} viewers @ min {peakMinute.minute}
        </div>
        {retentionMin && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
            50% dropped off @ min {retentionMin}
          </div>
        )}
        {ctaMinutes.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20`, color: GOLD }}>
            <Zap className="w-3 h-3" />
            CTA fired at min {ctaMinutes.map(t => t.minute).join(", ")}
          </div>
        )}
      </div>
    </div>
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

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#09090b" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  if (error || !analytics) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#09090b" }}>
      <p className="text-zinc-400">Could not load analytics.</p>
      <Button onClick={() => nav("/video-marketing")} variant="ghost" className="text-zinc-400">← Back</Button>
    </div>
  );

  const {
    webinar, registrations, attended, peakViewers,
    chatMessages, qaQuestions, totalReactions, raisedHands,
    attendeeList, chatTranscript, qaLog, recordings,
    timeline, ctaStats,
  } = analytics;

  const duration = webinar.endedAt && webinar.startedAt
    ? Math.round((new Date(webinar.endedAt).getTime() - new Date(webinar.startedAt).getTime()) / 1000)
    : null;
  const attendanceRate = registrations > 0 ? Math.round((attended / registrations) * 100) : 0;
  const isLive = webinar.status === "live";

  return (
    <div className="min-h-screen relative" style={{ background: "#040406", color: "#fff" }}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.025] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="wa-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#wa-grain)"/>
      </svg>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 120% 40% at 50% 0%, ${GOLD}08 0%, transparent 60%)` }} />
      {/* ── HEADER ── */}
      <div className="relative z-40 sticky top-0" style={{ background: "rgba(4,4,6,0.96)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${GOLD}14` }}>
        <div className="flex gap-0.5 px-6 pt-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}20` : "transparent", border: `1px solid ${GOLD}12` }} />
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav(`/webinar-studio/${webinarId}`)}
              className="p-1.5 rounded-lg transition-colors" style={{ color: `${GOLD}60` }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = `${GOLD}60`)}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5" style={{ color: GOLD }} />
                <p className="font-black text-white" style={{ letterSpacing: "-0.01em" }}>{webinar.title}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-600">
                  {webinar.scheduledAt ? format(new Date(webinar.scheduledAt), "MMM d, yyyy 'at' h:mm a") : ""}
                </span>
                <Badge className="text-[10px] h-4 px-1.5 py-0 border-none" style={{
                  background: isLive ? "#ef444422" : webinar.status === "completed" ? "#10b98122" : "#52525b22",
                  color: isLive ? "#f87171" : webinar.status === "completed" ? "#34d399" : "#a1a1aa",
                }}>{webinar.status}</Badge>
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => nav(`/webinar-studio/${webinarId}`)}
            className="gap-1.5 font-black text-xs uppercase tracking-wide"
            style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>
            <Video className="w-3.5 h-3.5" /> Studio
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── OVERVIEW STATS ── */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Registrations" value={registrations} icon={Users} color="#60a5fa" />
            <StatCard
              label="Attended"
              value={attended > 0 ? `${attended} (${attendanceRate}%)` : attended}
              icon={TrendingUp}
              color="#34d399"
            />
            <StatCard label="Peak Viewers" value={peakViewers || attended || 0} icon={Users} color={GOLD} />
            <StatCard
              label="Duration"
              value={duration ? fmtDuration(duration) : isLive ? "Live now" : "—"}
              icon={Clock}
              color="#a78bfa"
            />
          </div>
        </div>

        {/* ── ENGAGEMENT STATS ── */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>Engagement</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Chat Messages" value={chatMessages} icon={MessageSquare} color="#60a5fa" />
            <StatCard label="Q&A Questions" value={qaQuestions} icon={HelpCircle} color="#fbbf24" />
            <StatCard label="Reactions" value={totalReactions} icon={ThumbsUp} color="#f472b6" />
            <StatCard label="Raised Hands" value={raisedHands} icon={Hand} color="#fb923c" />
          </div>
        </div>

        {/* ── CTA CONVERSION STATS ── */}
        {ctaStats && (ctaStats.launches > 0 || ctaStats.clicks > 0) && (
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
              style={{ color: `${GOLD}50` }}>Offer CTA Performance</h2>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="CTA Launches" value={ctaStats.launches} icon={Zap} color={GOLD} />
              <StatCard label="Buyer Clicks" value={ctaStats.clicks} icon={MousePointerClick} color="#34d399" />
              <StatCard
                label="Click-Through Rate"
                value={ctaStats.convRate > 0 ? `${ctaStats.convRate}%` : "—"}
                icon={Target}
                color="#a78bfa"
              />
            </div>
          </div>
        )}

        {/* ── VIEWER HEATMAP ── */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>Viewer Timeline</h2>
          <ViewerHeatmap timeline={timeline || []} />
        </div>

        {/* ── RECORDINGS ── */}
        {recordings && recordings.length > 0 && (
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>
              Recordings ({recordings.length})
            </h2>
            <div className="space-y-3">
              {recordings.map((rec: any) => (
                <div
                  key={rec.id}
                  className="rounded-2xl p-4 flex items-center gap-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${GOLD}15` }}>
                    <Video className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{rec.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {rec.fileSize || ""}
                      {rec.duration ? ` · ${fmtDuration(rec.duration)}` : ""}
                      {rec.createdAt ? ` · ${format(new Date(rec.createdAt), "MMM d, yyyy")}` : ""}
                    </p>
                  </div>
                  <a
                    href={rec.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ background: `${GOLD}18`, color: GOLD }}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              ))}
            </div>
            {recordings[0]?.recordingUrl && (
              <div
                className="mt-4 rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <video
                  src={recordings[0].recordingUrl}
                  controls
                  className="w-full max-h-96 bg-black"
                />
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDEE LIST ── */}
        {attendeeList && attendeeList.length > 0 && (
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>
              Attendees ({attendeeList.length})
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    {["Name", "Joined", "Chat Msgs", "Q&A"].map(h => (
                      <th key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                        style={{ textAlign: h === "Chat Msgs" || h === "Q&A" ? "center" : "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendeeList.map((a: any, i: number) => (
                    <tr key={a.id || i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `hsl(${(i * 67) % 360}, 45%, 35%)` }}>
                            {(a.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white text-sm">{a.name || "Anonymous"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {a.joinTime ? format(new Date(a.joinTime), "h:mm a") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-zinc-300 font-semibold">{a.chatCount || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-zinc-300 font-semibold">{a.qaCount || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CHAT + Q&A TRANSCRIPTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {chatTranscript && chatTranscript.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>
                Chat Transcript ({chatTranscript.length})
              </h2>
              <div
                className="rounded-2xl overflow-y-auto max-h-80"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="p-4 space-y-3">
                  {chatTranscript.map((m: any, i: number) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: "#60a5fa" }}>
                        {m.name || "Anonymous"}
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{m.text}</p>
                      <span className="text-[9px] text-zinc-600">
                        {m.ts ? format(new Date(m.ts), "h:mm a") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {qaLog && qaLog.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: `${GOLD}50` }}>
                Q&A Log ({qaLog.length})
              </h2>
              <div
                className="rounded-2xl overflow-y-auto max-h-80"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="p-4 space-y-3">
                  {qaLog.map((q: any, i: number) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: "#fbbf24" }}>
                        {q.name || "Anonymous"}
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{q.question}</p>
                      <span className="text-[9px] text-zinc-600">
                        {q.ts ? format(new Date(q.ts), "h:mm a") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── EMPTY STATE ── */}
        {!recordings?.length &&
          !attendeeList?.length &&
          !chatTranscript?.length &&
          !qaLog?.length && (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-400 font-semibold mb-1">No event data yet</p>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              Analytics are collected live as attendees join your webinar.
              Go live in the Studio to start tracking chat, reactions, Q&A, and attendees.
            </p>
            <Button
              size="sm"
              className="mt-4 gap-1.5 font-semibold"
              style={{ background: GOLD, color: "#000" }}
              onClick={() => nav(`/webinar-studio/${webinarId}`)}>
              <Video className="w-3.5 h-3.5" /> Open Studio
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
