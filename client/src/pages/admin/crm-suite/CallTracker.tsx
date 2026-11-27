import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Phone, PhoneCall, MessageSquare, Reply, CalendarCheck, Sparkles, ChevronRight, Search, AlertCircle, Check } from "lucide-react";
import { type CrmContact, fullName } from "./types";

const BLUE = "#2e78ef";
type Mark = { at: string; by: string } | null;
type Tracker = {
  called?: Mark; followedUp?: Mark; replied?: Mark; booked?: Mark;
  nextFollowUp?: string | null; note?: string; summary?: string; nextStep?: string;
};
const STEPS: { key: "called" | "followedUp" | "replied" | "booked"; label: string; icon: any }[] = [
  { key: "called", label: "Called", icon: PhoneCall },
  { key: "followedUp", label: "Followed up", icon: MessageSquare },
  { key: "replied", label: "Replied", icon: Reply },
  { key: "booked", label: "Booked", icon: CalendarCheck },
];

const trackerOf = (c: CrmContact): Tracker => ((c.customFields || {}) as any).tracker || {};
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const isDue = (t: Tracker) => !!t.nextFollowUp && dayStart(new Date(t.nextFollowUp)) <= dayStart(new Date());
const isOverdue = (t: Tracker) => !!t.nextFollowUp && dayStart(new Date(t.nextFollowUp)) < dayStart(new Date());
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

function script(c: CrmContact) {
  const n = c.firstName || "there";
  const wb = (c.tags || []).some(t => t.startsWith("webinar"));
  return wb
    ? `Hi ${n}, this is [your name] from Oravini. You registered for our webinar, so I wanted to check you got everything and ask what you hope to get out of it. What are you working on right now?`
    : `Hi ${n}, this is [your name] from Oravini. I saw you showed interest and wanted to see if I can help. Do you have two minutes?`;
}

export function CallTracker({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const rep = user?.name || user?.email || "Rep";
  const [view, setView] = useState<"today" | "queue" | "all">("today");
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | "registrant" | "buyer">("all");
  const [qi, setQi] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: contacts = [], isLoading } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm-suite/contacts", "tracker"],
    queryFn: () => apiRequest("GET", "/api/crm-suite/contacts?limit=1000"),
  });

  const save = useMutation({
    mutationFn: async ({ c, patch, log }: { c: CrmContact; patch: Partial<Tracker>; log?: { title: string; body?: string; type?: string } }) => {
      const customFields = { ...(c.customFields || {}), tracker: { ...trackerOf(c), ...patch } };
      await apiRequest("PATCH", `/api/crm-suite/contacts/${c.id}`, { customFields });
      if (log) await apiRequest("POST", "/api/crm-suite/activities", { contactId: c.id, type: log.type || "call", title: log.title, body: log.body || null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] }),
    onError: () => toast({ title: "Could not save", variant: "destructive" }),
  });

  const tick = (c: CrmContact, key: (typeof STEPS)[number]["key"]) => {
    const t = trackerOf(c);
    if (t[key]) { save.mutate({ c, patch: { [key]: null } as any }); return; }
    const label = STEPS.find(s => s.key === key)!.label;
    const patch: any = { [key]: { at: new Date().toISOString(), by: rep } };
    if ((key === "called" || key === "followedUp") && !t.nextFollowUp) {
      const d = new Date(); d.setDate(d.getDate() + 2); patch.nextFollowUp = d.toISOString().slice(0, 10);
    }
    save.mutate({ c, patch, log: { title: `${label} by ${rep}`, type: key === "called" ? "call" : "system" } });
  };

  const matches = (c: CrmContact) => {
    if (c.archivedAt || c.doNotContact) return false;
    const s = `${fullName(c)} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
    if (q && !s.includes(q.toLowerCase())) return false;
    const tg = (c.tags || []).join(" ");
    if (tagFilter === "registrant" && !tg.includes("registrant")) return false;
    if (tagFilter === "buyer" && !tg.includes("buyer")) return false;
    return true;
  };
  const list = useMemo(() => contacts.filter(matches), [contacts, q, tagFilter]);
  const today = useMemo(() => list.filter(c => isDue(trackerOf(c))).sort((a, b) => +new Date(trackerOf(a).nextFollowUp!) - +new Date(trackerOf(b).nextFollowUp!)), [list]);
  const fresh = useMemo(() => list.filter(c => !trackerOf(c).called && !trackerOf(c).nextFollowUp && c.status !== "customer"), [list]);
  const queue = useMemo(() => [...today, ...fresh], [today, fresh]);
  const cur = queue[Math.min(qi, Math.max(queue.length - 1, 0))];

  const cleanNote = async (c: CrmContact) => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const r: any = await apiRequest("POST", "/api/crm-suite/ai/clean-note", { contactId: c.id, note });
      const d = new Date(); d.setDate(d.getDate() + Math.max(1, Math.min(30, Number(r.followUpDays) || 3)));
      await save.mutateAsync({
        c, patch: { note, summary: r.summary, nextStep: r.nextStep, nextFollowUp: d.toISOString().slice(0, 10), called: { at: new Date().toISOString(), by: rep } },
        log: { title: `Call by ${rep}: ${r.summary}`, body: `Next step: ${r.nextStep}\n\nRaw note: ${note}` },
      });
      setNote("");
      toast({ title: "Note cleaned and saved" });
    } catch { toast({ title: "AI cleanup failed", variant: "destructive" }); }
    setBusy(false);
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 20, boxShadow: "0 10px 40px rgba(46,120,239,0.12)", border: "1px solid #e6eefc" };
  const pill = (on: boolean): React.CSSProperties => ({ border: "none", cursor: "pointer", borderRadius: 99, padding: "8px 16px", fontSize: 13, fontWeight: 700, background: on ? BLUE : "#eef4ff", color: on ? "#fff" : BLUE });

  const Row = ({ c }: { c: CrmContact }) => {
    const t = trackerOf(c);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,1.3fr) auto auto", gap: 14, alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #eef3fc", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <button onClick={() => onOpenContact(c.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 800, color: "#0b1530", fontSize: 14, textAlign: "left" }}>{fullName(c)}</button>
          <div style={{ fontSize: 12, color: "#6b7a99" }}>{c.phone || c.email || "No contact info"}</div>
          {(c.tags || []).filter(x => /registrant|buyer/.test(x)).map(x => (
            <span key={x} style={{ fontSize: 10, fontWeight: 800, background: x.includes("buyer") ? "#dcfce7" : "#eef4ff", color: x.includes("buyer") ? "#15803d" : BLUE, borderRadius: 99, padding: "2px 8px", marginRight: 4 }}>{x.includes("buyer") ? "Buyer" : "Registrant"}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STEPS.map(({ key, label, icon: Icon }) => {
            const m = t[key];
            return (
              <button key={key} onClick={() => tick(c, key)} title={m ? `${label} by ${m.by}, ${fmt(m.at)}. Click to undo.` : `Mark ${label}`}
                style={{ display: "flex", alignItems: "center", gap: 6, border: m ? "none" : "1px solid #d5e3fb", cursor: "pointer", borderRadius: 99, padding: "6px 12px", fontSize: 12, fontWeight: 700, background: m ? BLUE : "#fff", color: m ? "#fff" : "#4a5b7d" }}>
                {m ? <Check size={13} /> : <Icon size={13} />}{label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="date" value={t.nextFollowUp ? String(t.nextFollowUp).slice(0, 10) : ""} onChange={e => save.mutate({ c, patch: { nextFollowUp: e.target.value || null } })}
            style={{ border: `1px solid ${isOverdue(t) ? "#ef4444" : "#d5e3fb"}`, color: isOverdue(t) ? "#ef4444" : "#0b1530", borderRadius: 10, padding: "6px 8px", fontSize: 12, fontWeight: isOverdue(t) ? 800 : 500 }} />
          {isOverdue(t) && <AlertCircle size={16} color="#ef4444" />}
        </div>
        {(t.called || t.followedUp) && (
          <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "#6b7a99" }}>
            {STEPS.filter(s => t[s.key]).map(s => `${s.label}: ${t[s.key]!.by}, ${fmt(t[s.key]!.at)}`).join("  ·  ")}
            {t.summary ? `  ·  ${t.summary}` : ""}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button style={pill(view === "today")} onClick={() => setView("today")}>Call today ({today.length})</button>
        <button style={pill(view === "queue")} onClick={() => setView("queue")}>Next lead queue ({queue.length})</button>
        <button style={pill(view === "all")} onClick={() => setView("all")}>All leads ({list.length})</button>
        <div style={{ flex: 1 }} />
        {(["all", "registrant", "buyer"] as const).map(f => (
          <button key={f} style={{ ...pill(tagFilter === f), padding: "6px 12px", fontSize: 12 }} onClick={() => setTagFilter(f)}>{f === "all" ? "Everyone" : f === "registrant" ? "Registrants" : "Buyers"}</button>
        ))}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#8aa0c8" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ border: "1px solid #d5e3fb", borderRadius: 99, padding: "7px 12px 7px 30px", fontSize: 13, background: "#fff", width: 170 }} />
        </div>
      </div>

      {isLoading && <div style={{ color: "#8aa0c8" }}>Loading leads...</div>}

      {view === "queue" && (
        <div style={{ ...card, padding: 24 }}>
          {!cur ? (
            <div style={{ color: "#6b7a99", textAlign: "center", padding: 30 }}>Queue is empty. Nobody is due and every lead has been contacted.</div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 800, color: BLUE, letterSpacing: "0.08em", textTransform: "uppercase" }}>Next lead · {Math.min(qi, queue.length - 1) + 1} of {queue.length}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0b1530", marginTop: 6 }}>{fullName(cur)}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                {cur.phone ? <a href={`tel:${cur.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: BLUE, color: "#fff", borderRadius: 99, padding: "10px 20px", fontWeight: 800, textDecoration: "none" }}><Phone size={16} />{cur.phone}</a> : <span style={{ color: "#ef4444", fontWeight: 700 }}>No phone number on file</span>}
                {cur.email && <span style={{ color: "#6b7a99", fontSize: 13 }}>{cur.email}</span>}
              </div>
              {trackerOf(cur).summary && <div style={{ marginTop: 14, background: "#f4f8ff", borderRadius: 14, padding: 14, fontSize: 13, color: "#0b1530" }}><b>Last call:</b> {trackerOf(cur).summary}<br /><b>Next step:</b> {trackerOf(cur).nextStep}</div>}
              {cur.notes && <div style={{ marginTop: 10, fontSize: 13, color: "#4a5b7d" }}><b>Notes:</b> {cur.notes}</div>}
              <div style={{ marginTop: 14, background: "#f4f8ff", borderRadius: 14, padding: 14, fontSize: 13, color: "#0b1530" }}><b>Script</b><br />{script(cur)}</div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="After the call, type or paste what happened. AI will clean it up and suggest the next step." rows={3}
                style={{ width: "100%", marginTop: 14, border: "1px solid #d5e3fb", borderRadius: 14, padding: 12, fontSize: 13, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button disabled={busy || !note.trim()} onClick={() => cleanNote(cur)} style={{ ...pill(true), display: "flex", alignItems: "center", gap: 6, opacity: busy || !note.trim() ? 0.5 : 1 }}><Sparkles size={14} />{busy ? "Cleaning..." : "Clean up with AI and save"}</button>
                <button onClick={() => tick(cur, "called")} style={pill(false)}>{trackerOf(cur).called ? "Called ✓" : "Mark called"}</button>
                <button onClick={() => { setNote(""); setQi(i => i + 1 >= queue.length ? 0 : i + 1); }} style={{ ...pill(false), display: "flex", alignItems: "center", gap: 4 }}>Next lead <ChevronRight size={14} /></button>
              </div>
            </>
          )}
        </div>
      )}

      {view !== "queue" && (
        <div style={{ ...card, overflow: "hidden" }}>
          {(view === "today" ? today : list).length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7a99" }}>{view === "today" ? "Nobody is due today. Set a next follow-up date on a lead and it shows up here." : "No leads match."}</div>
          ) : (view === "today" ? today : list).slice(0, 300).map(c => <Row key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
