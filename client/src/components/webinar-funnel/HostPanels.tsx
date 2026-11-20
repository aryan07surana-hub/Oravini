import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, Eye, HelpCircle, Loader2, MessageCircle, MousePointerClick, Radio, SendHorizontal, TrendingDown, UserCheck, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { HostActions, MessageRow, useStickyScroll, type ChatMessage } from "./LiveChat";
import { GOLD, fmtDuration, type WebinarFunnelFull } from "./hostUtils";

const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" };

function Stat({ icon: Icon, label, value, sub, tone = GOLD, testid }: { icon: typeof Users; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string; testid?: string }) {
  return (
    <div className="rounded-2xl p-4" style={card} data-testid={testid}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: tone }} />
        <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Live room (host chat moderation) ────────────────────────────────────────
export function HostLiveRoom({ webinar }: { webinar: WebinarFunnelFull }) {
  const { toast } = useToast();
  const key = [`/api/webinar-funnels/${webinar.id}/chat`];
  const { data, isLoading } = useQuery<{ messages: ChatMessage[]; viewers: number }>({ queryKey: key, refetchInterval: 4_000, refetchIntervalInBackground: false });
  const messages = data?.messages ?? [];
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { hidden?: boolean; answered?: boolean } }) => apiRequest("PATCH", `/api/webinar-funnels/${webinar.id}/chat/${id}`, body),
    onMutate: ({ id }) => setBusyId(id),
    onSuccess: (m: ChatMessage) => {
      queryClient.setQueryData(key, (old: any) => old ? { ...old, messages: old.messages.map((x: ChatMessage) => (x.id === m.id ? m : x)) } : old);
    },
    onError: (e: any) => toast({ title: "Couldn't update message", description: e.message, variant: "destructive" }),
    onSettled: () => setBusyId(null),
  });
  const post = useMutation({
    mutationFn: (body: string) => apiRequest("POST", `/api/webinar-funnels/${webinar.id}/chat`, { body }),
    onSuccess: (m: ChatMessage) => {
      setDraft("");
      queryClient.setQueryData(key, (old: any) => old ? { ...old, messages: [...old.messages, m] } : { messages: [m], viewers: 0 });
    },
    onError: (e: any) => toast({ title: "Couldn't send", description: e.message, variant: "destructive" }),
  });

  const chatList = useMemo(() => messages.filter(m => showHidden || !m.hidden), [messages, showHidden]);
  const questions = useMemo(() => {
    const qs = messages.filter(m => m.isQuestion && !m.hidden);
    return [...qs.filter(q => !q.answered), ...qs.filter(q => q.answered)];
  }, [messages]);
  const openQs = questions.filter(q => !q.answered).length;
  const chatRef = useStickyScroll(chatList.length);
  const live = webinar.status === "published" && new Date(webinar.scheduledAt).getTime() <= Date.now();

  const actions = (m: ChatMessage) => (
    <HostActions m={m} busy={busyId === m.id}
      onToggleHidden={() => patch.mutate({ id: m.id, body: { hidden: !m.hidden } })}
      onToggleAnswered={() => patch.mutate({ id: m.id, body: { answered: !m.answered } })} />
  );

  return (
    <div className="space-y-4" data-testid="host-live-room">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Eye} label="Watching now" testid="host-viewers" tone={live ? "#f87171" : GOLD}
          value={<span className="flex items-center gap-2">{live && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}{data?.viewers ?? 0}</span>}
          sub={live ? "Live heartbeat, last 35s" : webinar.status === "ended" ? "Replay viewers" : "Counts start at go-live"} />
        <Stat icon={MessageCircle} label="Messages" value={messages.filter(m => !m.isHost && !m.hidden).length} />
        <Stat icon={HelpCircle} label="Open questions" value={openQs} tone="#38bdf8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chat */}
        <section className="rounded-2xl flex flex-col h-[560px] overflow-hidden" style={{ ...card, background: "#0e0d13" }}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" style={{ color: GOLD }} /> Live chat</h3>
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
              <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} className="accent-[#d4b461]" /> Show removed
            </label>
          </header>
          <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5">
            {isLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-zinc-600" /></div>
              : chatList.length === 0 ? <p className="h-full flex items-center justify-center text-xs text-zinc-600">No messages yet. They'll appear here live.</p>
              : chatList.map(m => <MessageRow key={m.id} m={m} actions={actions(m)} />)}
          </div>
          <form className="p-2.5 border-t border-white/[0.06] flex gap-2" onSubmit={e => { e.preventDefault(); if (draft.trim()) post.mutate(draft.trim()); }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={1000} placeholder={`Message everyone as ${webinar.hostName || "Host"}…`} data-testid="input-host-chat"
              className="flex-1 px-3 py-2.5 rounded-xl text-[13px] text-white placeholder:text-zinc-600 bg-white/[0.04] border border-white/10 focus:border-[#d4b461]/50 outline-none" />
            <button type="submit" disabled={!draft.trim() || post.isPending} className="h-10 w-10 rounded-xl flex items-center justify-center disabled:opacity-30" style={{ background: GOLD, color: "#0a0910" }} aria-label="Send" data-testid="btn-host-send">
              {post.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
            </button>
          </form>
        </section>

        {/* Q&A */}
        <section className="rounded-2xl flex flex-col h-[560px] overflow-hidden" style={{ ...card, background: "#0e0d13" }}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-sky-400" /> Q&amp;A</h3>
            <span className="text-[11px] text-zinc-500">{openQs} open · {questions.length - openQs} answered</span>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5" data-testid="host-qa">
            {questions.length === 0 ? <p className="h-full flex items-center justify-center text-xs text-zinc-600 px-6 text-center">Questions from the Q&amp;A tab (or chat messages sent as a question) collect here.</p>
              : questions.map(m => <MessageRow key={m.id} m={m} actions={actions(m)} />)}
          </div>
        </section>
      </div>
      <p className="text-[11px] text-zinc-600">Removed messages disappear for viewers within a few seconds; nothing is permanently deleted — toggle “Show removed” to restore one.</p>
    </div>
  );
}

// ── Analytics ───────────────────────────────────────────────────────────────
type Analytics = {
  durationMinutes: number; viewersNow: number; registrants: number; attendees: number; liveAttendees: number; replayViewers: number;
  registeredAttendees: number; showRate: number | null; totalWatchSeconds: number; avgWatchSeconds: number;
  dropoff: { mark: number; viewers: number }[];
  cta: { clicks: number; uniqueClickers: number; registered: { name: string; email: string; clicks: number; last_click: string }[] };
  chat: { messages: number; questions: number; answered: number };
  attendeesList: { name: string | null; email: string | null; watchSeconds: number; joinAt: string; source: string; clickedCta: boolean }[];
};

export function WebinarAnalyticsPanel({ webinar }: { webinar: WebinarFunnelFull }) {
  const { data, isLoading } = useQuery<Analytics>({ queryKey: [`/api/webinar-funnels/${webinar.id}/analytics`], refetchInterval: 15_000 });
  if (isLoading || !data) {
    return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}</div>;
  }
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const showRate = data.showRate == null ? "—" : `${Math.round(data.showRate * 100)}%`;
  const noData = data.attendees === 0;

  return (
    <div className="space-y-5" data-testid="webinar-analytics">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Users} label="Registrants" value={data.registrants} tone="#f472b6" testid="stat-registrants" />
        <Stat icon={UserCheck} label="Attended live" value={data.liveAttendees} sub={`${data.registeredAttendees} registrants · ${Math.max(0, data.attendees - data.registeredAttendees)} anonymous`} tone="#34d399" testid="stat-attendees" />
        <Stat icon={Radio} label="Show rate" value={showRate} sub={`${data.registeredAttendees} of ${data.registrants} registrants watched`} testid="stat-show-rate" />
        <Stat icon={Clock} label="Avg watch time" value={fmtDuration(data.avgWatchSeconds)} sub={`${fmtDuration(data.totalWatchSeconds)} watched in total`} tone="#818cf8" testid="stat-avg-watch" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Eye} label="Watching now" value={data.viewersNow} tone="#f87171" testid="stat-viewers-now" />
        <Stat icon={Eye} label="Replay viewers" value={data.replayViewers} tone="#a78bfa" />
        <Stat icon={MousePointerClick} label="CTA clicks" value={data.cta.clicks} sub={`${data.cta.uniqueClickers} unique · ${pct(data.cta.uniqueClickers, data.attendees)}% of viewers`} testid="stat-cta" />
        <Stat icon={HelpCircle} label="Questions" value={data.chat.questions} sub={`${data.chat.answered} answered · ${data.chat.messages} chat messages`} tone="#38bdf8" />
      </div>

      {/* Drop-off */}
      <section className="rounded-2xl p-5" style={card}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><TrendingDown className="w-4 h-4" style={{ color: GOLD }} /> Watch-through</h3>
          <span className="text-[11px] text-zinc-500">Share of {data.attendees} viewers who watched at least… (of {data.durationMinutes} min)</span>
        </div>
        {noData ? (
          <p className="text-xs text-zinc-600 py-4">No attendance yet. Viewers are tracked automatically from the moment the live page goes live.</p>
        ) : (
          <div className="space-y-3">
            {data.dropoff.map(d => {
              const p = pct(d.viewers, data.attendees);
              return (
                <div key={d.mark} className="grid grid-cols-[64px_1fr_72px] items-center gap-3" data-testid={`dropoff-${d.mark}`}>
                  <span className="text-[12px] font-semibold text-zinc-400">{d.mark === 100 ? "Finished" : `${d.mark}%`}</span>
                  <div className="h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(p, d.viewers ? 2 : 0)}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}aa)` }} />
                  </div>
                  <span className="text-[12px] text-zinc-300 tabular-nums text-right"><b>{p}%</b> <span className="text-zinc-600">({d.viewers})</span></span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl p-5" style={card}>
          <h3 className="text-sm font-bold text-white mb-3">Attendees</h3>
          {data.attendeesList.length === 0 ? <p className="text-xs text-zinc-600">Nobody yet.</p> : (
            <div className="max-h-80 overflow-y-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-left text-zinc-500"><th className="font-medium px-1 pb-2">Viewer</th><th className="font-medium px-1 pb-2">Watched</th><th className="font-medium px-1 pb-2 text-right">CTA</th></tr></thead>
                <tbody>
                  {data.attendeesList.map((a, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="px-1 py-2 min-w-0">
                        <p className="text-zinc-200 truncate max-w-[200px]">{a.name || (a.email ? a.email : "Anonymous viewer")}</p>
                        {a.name && a.email && <p className="text-[11px] text-zinc-600 truncate max-w-[200px]">{a.email}</p>}
                      </td>
                      <td className="px-1 py-2 text-zinc-300 tabular-nums whitespace-nowrap">{fmtDuration(a.watchSeconds)}{a.source === "replay" && <span className="ml-1 text-[10px] text-violet-300">replay</span>}</td>
                      <td className="px-1 py-2 text-right">{a.clickedCta ? <span className="text-emerald-400 font-semibold">Clicked</span> : <span className="text-zinc-700">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="rounded-2xl p-5" style={card}>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">Registrants who clicked the CTA <ArrowUpRight className="w-3.5 h-3.5" style={{ color: GOLD }} /></h3>
          {data.cta.registered.length === 0 ? <p className="text-xs text-zinc-600">{data.cta.clicks ? `${data.cta.clicks} click(s) from viewers we couldn't match to a registration.` : "No CTA clicks yet."}</p> : (
            <ul className="space-y-2 max-h-80 overflow-y-auto" data-testid="cta-clickers">
              {data.cta.registered.map(c => (
                <li key={c.email} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="min-w-0"><span className="block text-zinc-200 truncate">{c.name}</span><span className="block text-zinc-600 truncate">{c.email}</span></span>
                  <span className="text-zinc-400 tabular-nums flex-shrink-0">{c.clicks}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
