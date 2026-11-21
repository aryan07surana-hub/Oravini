/**
 * Live polls for the webinar funnel.
 *   HostPollsPanel — editor tab: create / activate / close polls, live tallies.
 *   ViewerPollCard — public live room: voting card pinned above the chat tabs.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Loader2, Play, Plus, Square, Vote, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GOLD, inputCls, inputStyle } from "./hostUtils";
import { getViewerKey } from "./shared";

const POLL_MS = 4_000;

type HostPoll = { id: string; question: string; options: string[]; active: boolean; createdAt: string; counts: number[]; total: number };

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

function ResultBars({ options, counts, total, highlight }: { options: string[]; counts: number[]; total: number; highlight?: number | null }) {
  return (
    <div className="space-y-1.5">
      {options.map((o, i) => {
        const v = pct(counts[i] || 0, total);
        const mine = highlight === i;
        return (
          <div key={i} className="relative overflow-hidden rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${mine ? `${GOLD}55` : "rgba(255,255,255,0.06)"}` }}>
            <div className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${v}%`, background: mine ? `${GOLD}30` : "rgba(255,255,255,0.06)" }} />
            <div className="relative flex items-center justify-between gap-3 text-[12px]">
              <span className={`truncate ${mine ? "text-white font-semibold" : "text-zinc-300"}`}>
                {mine && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" style={{ color: GOLD }} />}{o}
              </span>
              <span className="tabular-nums font-bold flex-shrink-0" style={{ color: mine ? GOLD : "#a1a1aa" }}>{v}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Host ─────────────────────────────────────────────────────────────────────
export function HostPollsPanel({ webinarId }: { webinarId: string }) {
  const { toast } = useToast();
  const key = [`/api/webinar-funnels/${webinarId}/polls`];
  const { data: polls = [], isLoading } = useQuery<HostPoll[]>({ queryKey: key, refetchInterval: POLL_MS, refetchIntervalInBackground: false });
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const create = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinar-funnels/${webinarId}/polls`, {
      question: question.trim(), options: options.map(o => o.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      setQuestion(""); setOptions(["", ""]);
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: "Poll created", description: "Activate it when you're ready to show it to viewers." });
    },
    onError: (e: any) => toast({ title: "Couldn't create poll", description: e.message, variant: "destructive" }),
  });
  const action = useMutation({
    mutationFn: ({ id, op }: { id: string; op: "activate" | "close" }) => apiRequest("POST", `/api/webinar-funnels/${webinarId}/polls/${id}/${op}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast({ title: "Couldn't update poll", description: e.message, variant: "destructive" }),
  });

  const filled = options.map(o => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && filled.length >= 2 && !create.isPending;

  return (
    <div className="space-y-6" data-testid="host-polls">
      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Vote className="w-4 h-4" style={{ color: GOLD }} />
          <p className="text-sm font-bold text-white">New poll</p>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Registered viewers who vote get tagged <code className="text-zinc-400">poll:&lt;answer&gt;</code> in your CRM.</p>
        <input className={inputCls} style={inputStyle} placeholder="What's your biggest challenge right now?" maxLength={200}
          value={question} onChange={e => setQuestion(e.target.value)} data-testid="poll-question" />
        <div className="space-y-2 mt-3">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputCls} style={inputStyle} placeholder={`Option ${i + 1}`} maxLength={80} value={o}
                onChange={e => setOptions(prev => prev.map((x, j) => (j === i ? e.target.value : x)))} data-testid={`poll-option-${i}`} />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} title="Remove option"
                  className="p-2 rounded-lg text-zinc-500 hover:text-white" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 mt-4">
          {options.length < 4 ? (
            <button type="button" onClick={() => setOptions(prev => [...prev, ""])} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white">
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          ) : <span className="text-[11px] text-zinc-600">Up to 4 options</span>}
          <button type="button" disabled={!canCreate} onClick={() => create.mutate()} data-testid="poll-create"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
            style={{ background: GOLD, color: "#0a0910" }}>
            {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create poll
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
      ) : polls.length === 0 ? (
        <p className="text-center text-sm text-zinc-600 py-8">No polls yet. Create one above, then activate it during the live session.</p>
      ) : (
        <div className="space-y-3">
          {polls.map(pl => (
            <div key={pl.id} className="rounded-2xl p-5" data-testid={`poll-${pl.id}`}
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${pl.active ? `${GOLD}45` : "rgba(255,255,255,0.07)"}` }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {pl.active && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: `${GOLD}20`, color: GOLD }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GOLD }} /> Live
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {pl.total} vote{pl.total === 1 ? "" : "s"}</span>
                  </div>
                  <p className="text-sm font-bold text-white">{pl.question}</p>
                </div>
                {pl.active ? (
                  <button onClick={() => action.mutate({ id: pl.id, op: "close" })} disabled={action.isPending} data-testid={`poll-close-${pl.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 text-red-300"
                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
                    <Square className="w-3 h-3" /> Close
                  </button>
                ) : (
                  <button onClick={() => action.mutate({ id: pl.id, op: "activate" })} disabled={action.isPending} data-testid={`poll-activate-${pl.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                    style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
                    <Play className="w-3 h-3" /> {pl.total ? "Reopen" : "Activate"}
                  </button>
                )}
              </div>
              <ResultBars options={pl.options} counts={pl.counts} total={pl.total} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Viewer ───────────────────────────────────────────────────────────────────
type PublicPoll = { id: string; question: string; options: string[] };
type PollState = { poll: PublicPoll | null; voted?: number | null; results?: { counts: number[]; total: number } | null };

export function useActivePoll(slug: string | undefined, registrationId?: string) {
  const [state, setState] = useState<PollState>({ poll: null });
  const inflight = useRef(false);
  const load = useCallback(async () => {
    if (!slug || inflight.current) return;
    inflight.current = true;
    try {
      const qs = new URLSearchParams({ viewerKey: getViewerKey() });
      if (registrationId) qs.set("r", registrationId);
      const res = await fetch(`/api/public/webinars/${encodeURIComponent(slug)}/poll?${qs}`, { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch { /* retry next tick */ } finally { inflight.current = false; }
  }, [slug, registrationId]);
  useEffect(() => {
    if (!slug) return;
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [slug, load]);
  return { state, setState };
}

export function ViewerPollCard({ slug, registrationId, email, poll }: {
  slug: string; registrationId?: string; email?: string; poll: ReturnType<typeof useActivePoll>;
}) {
  const { state, setState } = poll;
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const p = state.poll;
  if (!p) return null;
  const voted = state.voted ?? null;

  const vote = async (optionIndex: number) => {
    if (busy !== null || voted !== null) return;
    setBusy(optionIndex); setError(null);
    try {
      const res = await fetch(`/api/public/webinars/${encodeURIComponent(slug)}/poll/${encodeURIComponent(p.id)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex, viewerKey: getViewerKey(), registrationId, email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.message || "Couldn't record your vote"); if (res.status === 409) setState({ poll: null }); return; }
      setState({ poll: p, voted: d.voted, results: d.results });
    } catch {
      setError("Couldn't record your vote");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-3 border-b border-white/[0.06]" data-testid="viewer-poll"
      style={{ background: `linear-gradient(135deg, ${GOLD}10, transparent 70%)` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5" style={{ color: GOLD }}>
        <Vote className="w-3 h-3" /> Live poll
      </p>
      <p className="text-[13px] font-semibold text-white leading-snug mb-2.5">{p.question}</p>
      {voted !== null && state.results ? (
        <>
          <ResultBars options={p.options} counts={state.results.counts} total={state.results.total} highlight={voted} />
          <p className="text-[10px] text-zinc-500 mt-1.5">{state.results.total} vote{state.results.total === 1 ? "" : "s"} · thanks for voting</p>
        </>
      ) : (
        <div className="grid gap-1.5">
          {p.options.map((o, i) => (
            <button key={i} onClick={() => vote(i)} disabled={busy !== null} data-testid={`poll-vote-${i}`}
              className="text-left px-3 py-2 rounded-lg text-[12px] font-semibold text-zinc-200 transition-all hover:text-white disabled:opacity-60 flex items-center justify-between gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}30` }}>
              <span className="truncate">{o}</span>
              {busy === i && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: GOLD }} />}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-[11px] text-red-300 mt-1.5">{error}</p>}
    </div>
  );
}
