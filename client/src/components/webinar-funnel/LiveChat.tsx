import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, EyeOff, Eye, HelpCircle, Loader2, MessageCircle, SendHorizontal } from "lucide-react";
import { GOLD } from "./shared";

export type ChatMessage = {
  id: number;
  name: string;
  body: string;
  isQuestion: boolean;
  isHost: boolean;
  answered: boolean;
  hidden: boolean;
  createdAt: string;
};

const POLL_MS = 4_000;
const NAME_KEY = "oravini:webinar-chat-name";

export function readChatName(): string {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
}
function saveChatName(n: string) {
  try { localStorage.setItem(NAME_KEY, n); } catch {}
}

/**
 * Polls the public chat endpoint every 4s while the tab is visible.
 * Sends `since` + If-None-Match so an idle room answers 304 with no body.
 */
export function useWebinarChat(slug: string | undefined) {
  const [messages, setMessages] = useState<Map<number, ChatMessage>>(new Map());
  const [viewers, setViewers] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastId = useRef(0);
  const etag = useRef<string | null>(null);
  const inflight = useRef(false);

  const poll = useCallback(async () => {
    if (!slug || inflight.current) return;
    inflight.current = true;
    try {
      const headers: Record<string, string> = {};
      if (etag.current) headers["If-None-Match"] = etag.current;
      const res = await fetch(`/api/public/webinars/${encodeURIComponent(slug)}/chat?since=${lastId.current}`, { headers, cache: "no-store" });
      if (res.status === 304) return;
      if (!res.ok) return;
      const data = await res.json();
      setViewers(data.viewers ?? 0);
      setStatus(data.status ?? null);
      const prevLast = lastId.current;
      lastId.current = Math.max(prevLast, data.lastId || 0);
      // The ETag encodes `since`; it only applies if the next request reuses the same one.
      etag.current = lastId.current === prevLast ? res.headers.get("ETag") : null;
      setMessages(prev => {
        const next = new Map(prev);
        for (const m of data.messages as ChatMessage[]) next.set(m.id, m);
        const hidden = new Set<number>(data.hiddenIds || []);
        const answered = new Set<number>(data.answeredIds || []);
        for (const [id, m] of next) {
          if (hidden.has(id)) { next.delete(id); continue; }
          const a = answered.has(id);
          if (m.answered !== a) next.set(id, { ...m, answered: a });
        }
        return next;
      });
    } catch {
      /* network blip — next tick retries */
    } finally {
      inflight.current = false;
      setLoaded(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    poll();
    const t = setInterval(() => { if (document.visibilityState === "visible") poll(); }, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [slug, poll]);

  const send = useCallback(async (body: string, isQuestion: boolean, name: string, registrationId?: string) => {
    const res = await fetch(`/api/public/webinars/${encodeURIComponent(slug!)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, isQuestion, name: name || undefined, registrationId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't send message");
    setMessages(prev => new Map(prev).set(data.id, data));
    return data as ChatMessage;
  }, [slug]);

  const list = useMemo(() => Array.from(messages.values()).sort((a, b) => a.id - b.id), [messages]);
  return { messages: list, viewers, status, loaded, send, refresh: poll };
}

// ── Presentation ────────────────────────────────────────────────────────────
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?";
const hueOf = (n: string) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

export function MessageRow({ m, actions }: { m: ChatMessage; actions?: React.ReactNode }) {
  return (
    <div
      data-testid={`chat-msg-${m.id}`}
      className={`group relative flex gap-2.5 px-3 py-2 rounded-xl transition-colors ${m.hidden ? "opacity-40" : ""}`}
      style={m.isHost ? { background: `${GOLD}10`, boxShadow: `inset 2px 0 0 ${GOLD}` } : undefined}
    >
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
        style={m.isHost
          ? { background: GOLD, color: "#0a0910" }
          : { background: `hsl(${hueOf(m.name)} 30% 18%)`, color: `hsl(${hueOf(m.name)} 60% 75%)` }}
        aria-hidden
      >
        {initials(m.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold truncate max-w-[60%]" style={{ color: m.isHost ? GOLD : "#e4e4e7" }}>{m.name}</span>
          {m.isHost && <span className="text-[9px] font-black tracking-wider px-1.5 py-px rounded" style={{ background: GOLD, color: "#0a0910" }}>HOST</span>}
          {m.isQuestion && (
            <span className={`text-[9px] font-bold tracking-wider px-1.5 py-px rounded ${m.answered ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
              {m.answered ? "ANSWERED" : "Q"}
            </span>
          )}
          <span className="text-[10px] text-zinc-600 ml-auto tabular-nums">{timeOf(m.createdAt)}</span>
        </div>
        <p className="text-[13px] leading-snug text-zinc-300 whitespace-pre-wrap break-words mt-0.5">{m.body}</p>
      </div>
      {actions}
    </div>
  );
}

/** Scroll container that sticks to the bottom unless the reader scrolled up. */
export function useStickyScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => { stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

type ViewerPanelProps = {
  mode: "chat" | "qa";
  messages: ChatMessage[];
  loaded: boolean;
  closed: boolean;
  defaultName: string;
  registrationId?: string;
  send: (body: string, isQuestion: boolean, name: string, registrationId?: string) => Promise<ChatMessage>;
};

export function ViewerChatPanel({ mode, messages, loaded, closed, defaultName, registrationId, send }: ViewerPanelProps) {
  const shown = useMemo(() => {
    if (mode === "chat") return messages;
    const qs = messages.filter(m => m.isQuestion);
    return [...qs.filter(q => !q.answered), ...qs.filter(q => q.answered)];
  }, [messages, mode]);
  const scrollRef = useStickyScroll(mode === "chat" ? shown.length : 0);

  const [name, setName] = useState(() => readChatName() || defaultName);
  const [editingName, setEditingName] = useState(false);
  const [body, setBody] = useState("");
  const [asQuestion, setAsQuestion] = useState(mode === "qa");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!name && defaultName) setName(defaultName); }, [defaultName]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAsQuestion(mode === "qa"); }, [mode]);

  const needsName = !name.trim() && !registrationId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    if (needsName) { setEditingName(true); setError("Add your name first"); return; }
    setSending(true);
    setError(null);
    try {
      await send(text, asQuestion, name.trim(), registrationId);
      if (name.trim()) saveChatName(name.trim());
      setBody("");
      setEditingName(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const empty = mode === "chat"
    ? { icon: MessageCircle, title: "Say hello", text: "Messages from everyone in the room show up here." }
    : { icon: HelpCircle, title: "No questions yet", text: "Ask anything — the host sees every question in one list." };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-2 px-1 space-y-0.5 webinar-scroll" data-testid={`panel-${mode}`}>
        {!loaded ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-zinc-600" /></div>
        ) : shown.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <empty.icon className="w-6 h-6 mb-2" style={{ color: `${GOLD}80` }} />
            <p className="text-sm font-semibold text-zinc-300">{empty.title}</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-[220px]">{empty.text}</p>
          </div>
        ) : (
          shown.map(m => <MessageRow key={m.id} m={m} />)
        )}
      </div>

      {closed ? (
        <div className="border-t border-white/5 px-4 py-3 text-center text-[11px] text-zinc-500">Chat is closed — this is the replay.</div>
      ) : (
        <form onSubmit={submit} className="border-t border-white/5 p-2.5 space-y-2" data-testid={`form-${mode}`}>
          {(editingName || needsName) ? (
            <input
              data-testid="input-chat-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder="Your name"
              autoComplete="name"
              className="w-full px-3 py-2 rounded-lg text-[13px] text-white placeholder:text-zinc-600 bg-white/[0.04] border border-white/10 focus:border-[#d4b461]/50 outline-none"
            />
          ) : (
            <button type="button" onClick={() => setEditingName(true)} className="text-[11px] text-zinc-500 hover:text-zinc-300 px-1">
              Chatting as <b className="text-zinc-300">{name || "registered attendee"}</b> · change
            </button>
          )}
          <div className="flex items-end gap-2">
            <textarea
              data-testid={`input-${mode}`}
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }}
              rows={1}
              maxLength={500}
              placeholder={asQuestion ? "Ask the host a question…" : "Say something…"}
              className="flex-1 resize-none max-h-28 px-3 py-2.5 rounded-xl text-[13px] text-white placeholder:text-zinc-600 bg-white/[0.04] border border-white/10 focus:border-[#d4b461]/50 outline-none"
            />
            <button
              data-testid={`btn-send-${mode}`}
              type="submit"
              disabled={sending || !body.trim()}
              aria-label="Send"
              className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:brightness-110"
              style={{ background: GOLD, color: "#0a0910" }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer select-none">
              <input type="checkbox" checked={asQuestion} onChange={e => setAsQuestion(e.target.checked)} className="accent-[#d4b461]" data-testid={`check-question-${mode}`} />
              Send as a question
            </label>
            {error ? <span className="text-[11px] text-red-400" role="alert">{error}</span>
              : <span className="text-[10px] text-zinc-700 tabular-nums">{body.length}/500</span>}
          </div>
        </form>
      )}
    </div>
  );
}

// ── Host moderation row actions ─────────────────────────────────────────────
export function HostActions({ m, onToggleHidden, onToggleAnswered, busy }: {
  m: ChatMessage; busy: boolean;
  onToggleHidden: () => void; onToggleAnswered: () => void;
}) {
  return (
    <div className="flex items-start gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
      {m.isQuestion && !m.hidden && (
        <button onClick={onToggleAnswered} disabled={busy} title={m.answered ? "Mark unanswered" : "Mark answered"}
          data-testid={`btn-answer-${m.id}`}
          className={`p-1.5 rounded-lg transition-colors ${m.answered ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-emerald-300 hover:bg-white/5"}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      )}
      {!m.isHost && (
        <button onClick={onToggleHidden} disabled={busy} title={m.hidden ? "Restore message" : "Remove from chat"}
          data-testid={`btn-hide-${m.id}`}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-white/5 transition-colors">
          {m.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
