// Client Project Tracker: a board for launches and tasks. Tier 5 (and admins) only; other plans see an upgrade screen.
// Data lives in this browser (localStorage, per user) for now. Syncing it to the database is a later upgrade.
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import ClientPartnershipTracker from "@/components/ClientPartnershipTracker";

const BLUE = "#2e78ef";
const STAGES = [
  { id: "plan", label: "Planning", tint: "#eef4ff" },
  { id: "doing", label: "In progress", tint: "#e6f0ff" },
  { id: "review", label: "Review", tint: "#f3f0ff" },
  { id: "done", label: "Done", tint: "#e9f8f0" },
] as const;
type StageId = (typeof STAGES)[number]["id"];
type Task = { id: string; title: string; project: string; assignee: string; due: string; stage: StageId; created: number };

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date(new Date().toDateString()).getTime();
const dueInfo = (due: string, stage: StageId) => {
  if (!due) return { text: "No date", color: "#8a94a3", bg: "#f1f4f9" };
  const d = new Date(due + "T00:00:00").getTime();
  const days = Math.round((d - today()) / 86400000);
  const label = new Date(due + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (stage === "done") return { text: label, color: "#1f8a57", bg: "#e5f6ed" };
  if (days < 0) return { text: `${label} · overdue`, color: "#d12f2f", bg: "#fdecec" };
  if (days <= 2) return { text: `${label} · soon`, color: "#b36a00", bg: "#fff3df" };
  return { text: label, color: BLUE, bg: "#eaf1fd" };
};

const SEED: Task[] = [
  { id: "s1", title: "Record launch webinar", project: "Spring launch", assignee: "Me", due: "", stage: "plan", created: 1 },
  { id: "s2", title: "Write email sequence", project: "Spring launch", assignee: "Me", due: "", stage: "doing", created: 2 },
  { id: "s3", title: "Set up the offer page", project: "Spring launch", assignee: "Me", due: "", stage: "review", created: 3 },
];

function Board() {
  const { user } = useAuth();
  const key = `oravini_pt_v1:${(user as any)?.id ?? "anon"}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState<StageId | null>(null);
  const [form, setForm] = useState({ title: "", project: "", assignee: "", due: "" });
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<StageId | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    try { const raw = localStorage.getItem(key); setTasks(raw ? JSON.parse(raw) : SEED); } catch { setTasks(SEED); }
    setReady(true);
  }, [key]);
  useEffect(() => { if (ready) try { localStorage.setItem(key, JSON.stringify(tasks)); } catch {} }, [tasks, ready, key]);

  const visible = useMemo(() => tasks.filter(t => !q || (t.title + t.project + t.assignee).toLowerCase().includes(q.toLowerCase())), [tasks, q]);
  const stats = useMemo(() => {
    const open = tasks.filter(t => t.stage !== "done");
    const t0 = today();
    const overdue = open.filter(t => t.due && new Date(t.due + "T00:00:00").getTime() < t0).length;
    const week = open.filter(t => { if (!t.due) return false; const d = new Date(t.due + "T00:00:00").getTime(); return d >= t0 && d <= t0 + 7 * 86400000; }).length;
    const pct = tasks.length ? Math.round((tasks.filter(t => t.stage === "done").length / tasks.length) * 100) : 0;
    return { open: open.length, overdue, week, pct };
  }, [tasks]);

  const move = (id: string, stage: StageId) => setTasks(ts => ts.map(t => (t.id === id ? { ...t, stage } : t)));
  const remove = (id: string) => setTasks(ts => ts.filter(t => t.id !== id));
  const add = (stage: StageId) => {
    if (!form.title.trim()) return;
    setTasks(ts => [...ts, { id: uid(), title: form.title.trim(), project: form.project.trim() || "General", assignee: form.assignee.trim() || "Me", due: form.due, stage, created: Date.now() }]);
    setForm({ title: "", project: form.project, assignee: form.assignee, due: "" }); setAdding(null);
  };

  const inp: React.CSSProperties = { width: "100%", border: "1px solid #dfe6f2", borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", background: "#fff", color: "#101828", boxSizing: "border-box" };
  const chip = (c: string, bg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" });

  return (
    <div style={{ padding: "28px 24px 60px", maxWidth: 1240, margin: "0 auto", color: "#101828", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Project Tracker</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7686", fontSize: 14 }}>Plan launches by stage, give every task an owner and a date, and see what is due.</p>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tasks" style={{ ...inp, width: 220, borderRadius: 999, padding: "9px 16px" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 22 }}>
        {[["Open tasks", stats.open], ["Due this week", stats.week], ["Overdue", stats.overdue], ["Complete", stats.pct + "%"]].map(([l, v]) => (
          <div key={String(l)} style={{ background: "rgba(255,255,255,.85)", border: "1px solid #e6ecf6", borderRadius: 18, padding: "16px 18px", boxShadow: "0 10px 30px -20px rgba(46,120,239,.35)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#8a94a3" }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 4, color: l === "Overdue" && Number(v) > 0 ? "#d12f2f" : "#101828" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(285px,1fr))", gap: 16, alignItems: "start" }}>
        {STAGES.map(st => {
          const col = visible.filter(t => t.stage === st.id);
          return (
            <div key={st.id}
              onDragOver={e => { e.preventDefault(); setOver(st.id); }}
              onDragLeave={() => setOver(o => (o === st.id ? null : o))}
              onDrop={() => { if (drag) move(drag, st.id); setDrag(null); setOver(null); }}
              style={{ background: over === st.id ? "#e3eeff" : st.tint, borderRadius: 20, padding: 12, minHeight: 200, border: over === st.id ? `1px dashed ${BLUE}` : "1px solid transparent", transition: "background .2s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 10px" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{st.label} <span style={{ color: "#8a94a3", fontWeight: 600, marginLeft: 4 }}>{col.length}</span></div>
                <button type="button" onClick={() => setAdding(adding === st.id ? null : st.id)} aria-label={`Add task to ${st.label}`}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: 0, background: "#fff", color: BLUE, fontSize: 18, lineHeight: 1, cursor: "pointer", boxShadow: "0 2px 8px rgba(16,24,40,.08)" }}>+</button>
              </div>

              {adding === st.id && (
                <div style={{ background: "#fff", borderRadius: 14, padding: 12, marginBottom: 10, display: "grid", gap: 8, boxShadow: "0 12px 30px -18px rgba(46,120,239,.5)" }}>
                  <input autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} onKeyDown={e => e.key === "Enter" && add(st.id)} placeholder="Task name" style={inp} />
                  <input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} placeholder="Project (e.g. Spring launch)" style={inp} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="Owner" style={inp} />
                    <input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} style={inp} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => add(st.id)} style={{ flex: 1, border: 0, background: BLUE, color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 0", borderRadius: 999, cursor: "pointer" }}>Add task</button>
                    <button type="button" onClick={() => setAdding(null)} style={{ border: 0, background: "#f1f4f9", color: "#5b6675", fontWeight: 600, fontSize: 13, padding: "9px 14px", borderRadius: 999, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: 10 }}>
                {col.map(t => {
                  const di = dueInfo(t.due, t.stage); const i = STAGES.findIndex(s => s.id === t.stage);
                  return (
                    <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                      style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", boxShadow: "0 8px 22px -16px rgba(16,24,40,.35)", cursor: "grab", opacity: drag === t.id ? 0.5 : 1, border: "1px solid #eef2f8" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, letterSpacing: ".05em", textTransform: "uppercase" }}>{t.project}</div>
                      <div style={{ fontSize: 14, fontWeight: 650, margin: "4px 0 10px", textDecoration: t.stage === "done" ? "line-through" : "none", color: t.stage === "done" ? "#8a94a3" : "#101828" }}>{t.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={chip(di.color, di.bg)}>{di.text}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5b6675" }}>
                          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#dbe8fd", color: BLUE, fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center" }}>{(t.assignee[0] || "M").toUpperCase()}</span>{t.assignee}
                        </span>
                        <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                          {i > 0 && <button type="button" aria-label="Move back" onClick={() => move(t.id, STAGES[i - 1].id)} style={mv}>‹</button>}
                          {i < STAGES.length - 1 && <button type="button" aria-label="Move forward" onClick={() => move(t.id, STAGES[i + 1].id)} style={mv}>›</button>}
                          <button type="button" aria-label="Delete task" onClick={() => remove(t.id)} style={{ ...mv, color: "#d12f2f" }}>×</button>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {col.length === 0 && adding !== st.id && <div style={{ textAlign: "center", fontSize: 12.5, color: "#8a94a3", padding: "18px 0" }}>Drop a task here</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 18, fontSize: 12, color: "#9aa4b2" }}>Saved in this browser. Drag cards between columns or use the arrows.</p>
    </div>
  );
}
const mv: React.CSSProperties = { width: 24, height: 24, borderRadius: 8, border: 0, background: "#f1f4f9", color: "#5b6675", fontSize: 15, lineHeight: 1, cursor: "pointer" };

function Gate() {
  const [, navigate] = useLocation();
  return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", padding: 32, background: "linear-gradient(180deg,#f6f9ff,#e9f1fd)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, textAlign: "center", background: "rgba(255,255,255,.9)", borderRadius: 28, padding: "40px 34px", boxShadow: "0 30px 70px -30px rgba(46,120,239,.45)", border: "1px solid #e3ebf8" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, margin: "0 auto 18px", background: "#eaf1fd", display: "grid", placeItems: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BLUE, background: "#eaf1fd", padding: "4px 12px", borderRadius: 999 }}>Tier 5 tool</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "16px 0 10px", color: "#101828" }}>Project Tracker is on Tier 5</h1>
        <p style={{ fontSize: 14.5, color: "#5b6675", lineHeight: 1.65, margin: "0 0 24px" }}>Track every launch from planning to done, with stages, tasks, owners and due dates, plus the done-for-you partnership tracker. Upgrade to Tier 5 to unlock it.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/brandverse")} style={{ border: 0, background: BLUE, color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 26px", borderRadius: 999, cursor: "pointer", boxShadow: "0 14px 28px -12px rgba(46,120,239,.7)" }}>See Tier 5</button>
          <button type="button" onClick={() => navigate("/dashboard")} style={{ border: 0, background: "#eef2f8", color: "#5b6675", fontWeight: 600, fontSize: 14, padding: "12px 24px", borderRadius: 999, cursor: "pointer" }}>Back to dashboard</button>
        </div>
      </div>
    </div>
  );
}

export default function ClientProjectTracker() {
  const { user } = useAuth();
  const isElite = (user as any)?.role === "admin" || user?.plan === "elite";
  const [tab, setTab] = useState<"board" | "partner">("board");
  if (!isElite) return <ClientLayout><Gate /></ClientLayout>;
  return (
    <ClientLayout>
      <div style={{ display: "flex", gap: 8, padding: "20px 24px 0", maxWidth: 1240, margin: "0 auto" }}>
        {([["board", "My projects"], ["partner", "Partnership tracker"]] as const).map(([id, l]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{ border: 0, cursor: "pointer", padding: "8px 16px", borderRadius: 999, fontWeight: 600, fontSize: 13, background: tab === id ? BLUE : "#eef2f8", color: tab === id ? "#fff" : "#5b6675" }}>{l}</button>
        ))}
      </div>
      {tab === "board" ? <Board /> : <ClientPartnershipTracker />}
    </ClientLayout>
  );
}
