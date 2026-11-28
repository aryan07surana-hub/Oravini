import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trophy, Library, Zap, FileText, CalendarDays, Plus, Trash2, Copy, Check, Sparkles, TrendingUp, Bookmark, Wand2 } from "lucide-react";

const BLUE = "#2e78ef";
const LINE = "#e3e9f3";

type Reel = { id: string; source?: string; avgWatchSec?: number; url?: string; hook: string; transcript?: string; views?: number; likes?: number; comments?: number; saves?: number; shares?: number; lengthSec?: number; postedAt?: string };
type SavedHook = { id: string; hook: string; score?: number; angle?: string; source?: string };
type LabState = { reels: Reel[]; hooks: SavedHook[]; winners?: any; viral: any[]; report?: any; calendar?: any; niche?: string; igSync?: { at: string; count: number; insights: boolean; username?: string | null } };

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n?: number) => (n == null ? "-" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n));

const SAMPLE: Reel[] = [
  { id: uid(), hook: "I lost 14 clients before I learned this one rule", views: 182000, likes: 9100, saves: 4200, shares: 2600, lengthSec: 38, transcript: "I lost 14 clients before I learned this one rule. Never sell the service, sell the first win. Here is the exact message I send in the first 24 hours..." },
  { id: uid(), hook: "Stop posting every day. Do this instead.", views: 96000, likes: 5200, saves: 3100, shares: 1900, lengthSec: 33 },
  { id: uid(), hook: "3 DM scripts that book calls while you sleep", views: 141000, likes: 7300, saves: 6800, shares: 3100, lengthSec: 41 },
  { id: uid(), hook: "Hey guys, quick update on my week", views: 3100, likes: 120, saves: 8, shares: 4, lengthSec: 74 },
  { id: uid(), hook: "Today I want to talk about content strategy", views: 4800, likes: 190, saves: 22, shares: 9, lengthSec: 68 },
  { id: uid(), hook: "Nobody tells you this about your first 1,000 followers", views: 88000, likes: 4900, saves: 2800, shares: 2100, lengthSec: 36 },
  { id: uid(), hook: "My morning routine as a coach", views: 6200, likes: 310, saves: 31, shares: 12, lengthSec: 61 },
  { id: uid(), hook: "The $0 offer that got me 9 paying clients", views: 120000, likes: 6100, saves: 5400, shares: 2900, lengthSec: 44 },
];

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={"rounded-2xl bg-white " + className} style={{ border: `1px solid ${LINE}`, boxShadow: "0 1px 2px rgba(16,24,40,.04)", ...style }}>{children}</div>;
}
function Btn({ children, onClick, busy, disabled, ghost, small }: { children: React.ReactNode; onClick?: () => void; busy?: boolean; disabled?: boolean; ghost?: boolean; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled}
      className={"inline-flex items-center justify-center gap-2 rounded-full font-semibold transition " + (small ? "px-3 py-1.5 text-xs " : "px-5 py-2.5 text-sm ") + (disabled || busy ? "opacity-60 cursor-not-allowed" : "hover:opacity-90")}
      style={ghost ? { background: "#fff", color: BLUE, border: `1px solid ${LINE}` } : { background: BLUE, color: "#fff", boxShadow: "0 6px 16px -8px rgba(46,120,239,.7)" }}>
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}{children}
    </button>
  );
}
const inputCls = "w-full rounded-xl px-3 py-2 text-sm outline-none bg-white text-foreground";
const inputStyle: React.CSSProperties = { border: `1px solid ${LINE}` };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#6b7686" }}>{label}</span>{children}</label>;
}
function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "red" | "gray" }) {
  const t = { blue: ["#eaf2fe", BLUE], green: ["#e6f6ec", "#157f3d"], red: ["#fdecec", "#c0332b"], gray: ["#f1f3f6", "#5b6675"] }[tone];
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: t[0], color: t[1] }}>{children}</span>;
}
function Score({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e9eef7" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} /></svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold" style={{ color: "#101828", fontSize: size / 3.2 }}>{Math.round(v)}</div>
    </div>
  );
}
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }} className="p-1.5 rounded-lg hover:bg-[#eef3fb]" style={{ color: BLUE }}>{ok ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>;
}
function List({ items, tone }: { items?: string[]; tone?: "green" | "red" }) {
  if (!items?.length) return null;
  return <ul className="space-y-1.5">{items.map((s, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: "#344054" }}><span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone === "red" ? "#e5584f" : tone === "green" ? "#22a45d" : BLUE }} />{s}</li>)}</ul>;
}
function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return <div className="mb-3"><h3 className="text-base font-bold" style={{ color: "#101828" }}>{children}</h3>{sub && <p className="text-xs mt-0.5" style={{ color: "#6b7686" }}>{sub}</p>}</div>;
}

const TABS = [
  { id: "winners", label: "My Winners", icon: Trophy, sub: "Learn from your own reels" },
  { id: "viral", label: "Viral Library", icon: Library, sub: "Break down any reel" },
  { id: "hooks", label: "Hook Bank", icon: Zap, sub: "Save and test hooks" },
  { id: "report", label: "Weekly Report", icon: FileText, sub: "What worked, what to post" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, sub: "Built from your winners" },
] as const;

export default function CoachLab({ niche: profileNiche }: { niche?: string }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("winners");
  const [st, setSt] = useState<LabState>({ reels: [], hooks: [], viral: [] });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const timer = useRef<any>(null);
  const [ig, setIg] = useState<any>(null);
  const [igBusy, setIgBusy] = useState("");
  const loadedRef = useRef(false);

  useEffect(() => {
    apiRequest("GET", "/api/coach/lab/state").then((d: any) => { setSt({ reels: [], hooks: [], viral: [], ...(d || {}) }); setLoaded(true); loadedRef.current = true; }).catch(() => setLoaded(true));
    apiRequest("GET", "/api/coach/lab/ig/status").then(setIg).catch(() => setIg(null));
  }, []);
  const update = (patch: Partial<LabState>) => {
    setSt((prev) => {
      const next = { ...prev, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => apiRequest("PUT", "/api/coach/lab/state", next).catch(() => {}), 700);
      return next;
    });
  };
  const run = async (key: string, path: string, body: any): Promise<any | null> => {
    setBusy(key);
    try { return await apiRequest("POST", path, body); }
    catch (e: any) { toast({ title: e?.insufficientCredits ? "Not enough credits" : "Something went wrong", description: String(e?.message || "Try again"), variant: "destructive" }); return null; }
    finally { setBusy(""); }
  };
  const niche = st.niche ?? profileNiche ?? "";
  const saveNow = (next: LabState) => { if (timer.current) clearTimeout(timer.current); apiRequest("PUT", "/api/coach/lab/state", next).catch(() => {}); };
  /** Pull reels + insights from Instagram. Free. */
  const syncIg = async (force = true): Promise<LabState | null> => {
    setIgBusy("sync");
    try {
      const d: any = await apiRequest("POST", "/api/coach/lab/ig/sync", { force });
      if (d?.state) { const n = { reels: [], hooks: [], viral: [], ...d.state } as LabState; setSt(n); return n; }
      return null;
    } catch (e: any) {
      toast({ title: e?.code === "reconnect" ? "Reconnect Instagram" : "Could not sync Instagram", description: String(e?.message || "Try again"), variant: "destructive" });
      return null;
    } finally { setIgBusy(""); }
  };
  /** Sync, then rebuild winners, weekly report and calendar from the real numbers. */
  const refreshFromIg = async () => {
    const fresh = await syncIg(true);
    if (!fresh || fresh.reels.length < 2) { if (fresh) toast({ title: "Not enough reels yet", description: "Post at least 2 reels and sync again." }); return; }
    let cur: LabState = fresh;
    const w = await run("winners", "/api/coach/lab/winners", { reels: cur.reels });
    if (!w) return; cur = { ...cur, winners: w }; setSt(cur);
    const formula2 = w.formula;
    const r = await run("report", "/api/coach/lab/report", { reels: cur.reels, formula: formula2 });
    if (r) { cur = { ...cur, report: r }; setSt(cur); }
    const nz = cur.niche ?? profileNiche ?? "";
    if (nz) {
      const ids = new Set<string>(w.winnerIds || []);
      const c = await run("calendar", "/api/coach/lab/calendar", { niche: nz, perWeek: "4", weeks: "2", formula: formula2, winners: cur.reels.filter((x) => ids.has(x.id)) });
      if (c?.posts) cur = { ...cur, calendar: c };
    }
    setSt(cur); saveNow(cur);
    toast({ title: "Coach updated from your real reels" });
  };
  useEffect(() => {
    if (!loaded || !ig?.enabled || !ig?.connected || ig?.expired) return;
    const at = st.igSync?.at ? new Date(st.igSync.at).getTime() : 0;
    if (Date.now() - at > 12 * 3600 * 1000) syncIg(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, ig?.enabled, ig?.connected]);
  const winnerReels = useMemo(() => {
    const ids = new Set<string>(st.winners?.winnerIds || []);
    return st.reels.filter((r) => ids.has(r.id));
  }, [st.reels, st.winners]);
  const formula = st.winners?.formula;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "#f6f8fc" }} data-testid="coach-lab">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-5">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: BLUE }} /><h2 className="text-xl font-bold" style={{ color: "#101828" }}>Growth Lab</h2><Pill>NEW</Pill></div>
          <p className="text-sm mt-1" style={{ color: "#5b6675" }}>The coach learns from your own reels, studies what goes viral, and plans what you post next.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className="text-left rounded-xl px-3 py-2.5 transition" data-testid={`lab-tab-${t.id}`}
              style={tab === t.id ? { background: "#fff", border: `1px solid ${BLUE}`, boxShadow: "0 8px 20px -12px rgba(46,120,239,.6)" } : { background: "#fff", border: `1px solid ${LINE}` }}>
              <t.icon className="w-4 h-4 mb-1.5" style={{ color: tab === t.id ? BLUE : "#8a94a3" }} />
              <div className="text-[13px] font-semibold" style={{ color: tab === t.id ? BLUE : "#101828" }}>{t.label}</div>
              <div className="text-[11px]" style={{ color: "#8a94a3" }}>{t.sub}</div>
            </button>
          ))}
        </div>
        {loaded && ig?.enabled && <IgPanel ig={ig} st={st} busy={busy} igBusy={igBusy} onSync={() => syncIg(true)} onRefresh={refreshFromIg} update={update} setTab={setTab} />}
        {!loaded ? <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: BLUE }} /></div> : (
          <>
            {tab === "winners" && <Winners st={st} update={update} run={run} busy={busy} />}
            {tab === "viral" && <Viral st={st} update={update} run={run} busy={busy} niche={niche} setNiche={(n) => update({ niche: n })} />}
            {tab === "hooks" && <Hooks st={st} update={update} run={run} busy={busy} formula={formula} />}
            {tab === "report" && <Report st={st} update={update} run={run} busy={busy} formula={formula} />}
            {tab === "calendar" && <Calendar st={st} update={update} run={run} busy={busy} niche={niche} setNiche={(n) => update({ niche: n })} formula={formula} winnerReels={winnerReels} />}
          </>
        )}
      </div>
    </div>
  );
}

type P = { st: LabState; update: (p: Partial<LabState>) => void; run: (k: string, p: string, b: any) => Promise<any | null>; busy: string };

function Winners({ st, update, run, busy }: P) {
  const empty = { url: "", hook: "", views: "", likes: "", saves: "", shares: "", lengthSec: "", transcript: "", postedAt: "" };
  const [f, setF] = useState<any>(empty);
  const [script, setScript] = useState("");
  const [score, setScore] = useState<any>(null);
  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));
  const add = () => {
    if (!f.hook.trim() && !f.transcript.trim()) return;
    const n = (v: string) => (v ? Number(v.replace(/[, ]/g, "")) || 0 : undefined);
    update({ reels: [...st.reels, { id: uid(), url: f.url.trim(), hook: f.hook.trim(), transcript: f.transcript.trim(), views: n(f.views), likes: n(f.likes), saves: n(f.saves), shares: n(f.shares), lengthSec: n(f.lengthSec), postedAt: f.postedAt }] });
    setF(empty);
  };
  const analyse = async () => {
    const r = await run("winners", "/api/coach/lab/winners", { reels: st.reels });
    if (r) update({ winners: r });
  };
  const ranked: any[] = st.winners?.ranked || [];
  const scoreMap = new Map(ranked.map((r) => [r.id, r.score]));
  const winSet = new Set(st.winners?.winnerIds || []);
  const w = st.winners;
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-5 gap-5">
        <Card className="md:col-span-2 p-5">
          <H sub="Paste a reel link and its numbers from Instagram Insights. Instagram connect will fill this in automatically.">Add a reel</H>
          <div className="space-y-3">
            <Field label="Reel link (optional)"><input className={inputCls} style={inputStyle} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://instagram.com/reel/..." /></Field>
            <Field label="Hook (first line)"><input className={inputCls} style={inputStyle} value={f.hook} onChange={(e) => set("hook", e.target.value)} placeholder="The first thing you say" /></Field>
            <div className="grid grid-cols-2 gap-3">
              {([["views", "Views"], ["saves", "Saves"], ["shares", "Shares"], ["likes", "Likes"], ["lengthSec", "Length (sec)"]] as const).map(([k, l]) => (
                <Field key={k} label={l}><input className={inputCls} style={inputStyle} inputMode="numeric" value={f[k]} onChange={(e) => set(k, e.target.value)} /></Field>
              ))}
              <Field label="Posted on"><input type="date" className={inputCls} style={inputStyle} value={f.postedAt} onChange={(e) => set("postedAt", e.target.value)} /></Field>
            </div>
            <Field label="Script or caption (optional)"><textarea rows={3} className={inputCls} style={inputStyle} value={f.transcript} onChange={(e) => set("transcript", e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2"><Btn onClick={add} disabled={!f.hook.trim() && !f.transcript.trim()}><Plus className="w-4 h-4" />Add reel</Btn>
              {st.reels.length === 0 && <Btn ghost onClick={() => update({ reels: SAMPLE.map((s) => ({ ...s, id: uid() })) })}>Try with sample reels</Btn>}</div>
          </div>
        </Card>
        <Card className="md:col-span-3 p-5">
          <div className="flex items-center justify-between mb-3 gap-3">
            <H sub={`${st.reels.length} reel${st.reels.length === 1 ? "" : "s"} added. Add 5 or more for a sharper read.`}>Your reels</H>
            <Btn onClick={analyse} busy={busy === "winners"} disabled={st.reels.length < 3}><Trophy className="w-4 h-4" />Find my winners <span className="opacity-80 font-medium">3 credits</span></Btn>
          </div>
          {st.reels.length === 0 ? <p className="text-sm py-10 text-center" style={{ color: "#8a94a3" }}>No reels yet. Add a few, or load the sample set to see how it works.</p> : (
            <div className="divide-y" style={{ borderColor: LINE }}>
              {[...st.reels].sort((a, b) => (scoreMap.get(b.id) ?? -1) - (scoreMap.get(a.id) ?? -1) || (b.views || 0) - (a.views || 0)).map((r) => (
                <div key={r.id} className="py-2.5 flex items-center gap-3">
                  {scoreMap.has(r.id) ? <div className="w-9 text-center"><div className="text-sm font-bold" style={{ color: winSet.has(r.id) ? BLUE : "#8a94a3" }}>{scoreMap.get(r.id)}</div></div> : <div className="w-9" />}
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate" style={{ color: "#101828" }}>{r.hook || r.transcript}</div>
                    <div className="text-[11px]" style={{ color: "#8a94a3" }}>{fmt(r.views)} views · {fmt(r.saves)} saves · {fmt(r.shares)} shares{r.lengthSec ? ` · ${r.lengthSec}s` : ""}</div></div>
                  {winSet.has(r.id) && <Pill>Winner</Pill>}
                  <button type="button" aria-label="Remove" onClick={() => update({ reels: st.reels.filter((x) => x.id !== r.id) })} className="p-1.5 rounded-lg hover:bg-[#eef3fb]" style={{ color: "#8a94a3" }}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {w && (
        <Card className="p-6" style={{ background: "linear-gradient(180deg,#f4f8fe,#fff)" }}>
          <div className="flex items-center gap-2 mb-1"><Pill>Your winning formula</Pill></div>
          <h3 className="text-lg font-bold mb-4" style={{ color: "#101828" }}>{w.headline}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Hook styles that win</div><List items={w.formula?.hookStyles} /></div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Structure</div><List items={w.formula?.structure} />
              {w.formula?.idealLengthSec && <div className="mt-3"><Pill tone="gray">Sweet spot {w.formula.idealLengthSec[0]}-{w.formula.idealLengthSec[1]}s</Pill></div>}</div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Openers that work</div><List items={w.formula?.openers} /></div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#157f3d" }}>Do more</div><List items={w.formula?.doMore} tone="green" /></div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c0332b" }}>Stop doing</div><List items={w.formula?.stopDoing} tone="red" /></div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Topics</div><div className="flex flex-wrap gap-1.5">{(w.formula?.topics || []).map((t: string, i: number) => <Pill key={i} tone="gray">{t}</Pill>)}</div></div>
          </div>
        </Card>
      )}
      {w && (
        <Card className="p-6">
          <H sub="Paste a new script and see how closely it matches what already works for you.">Score a new script against your winners</H>
          <textarea rows={4} className={inputCls} style={inputStyle} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste your next reel script..." />
          <div className="mt-3"><Btn onClick={async () => { const r = await run("score", "/api/coach/lab/score", { script, formula: w.formula, winners: st.reels.filter((x) => winSet.has(x.id)) }); if (r) setScore(r); }} busy={busy === "score"} disabled={script.trim().length < 20}><Wand2 className="w-4 h-4" />Score it <span className="opacity-80 font-medium">1 credit</span></Btn></div>
          {score && (
            <div className="mt-5 grid md:grid-cols-3 gap-5">
              <div className="flex items-start gap-4"><Score value={score.score || 0} size={84} /><div><div className="text-sm font-semibold" style={{ color: "#101828" }}>{score.verdict}</div></div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#157f3d" }}>Matches your winners</div><List items={score.matches} tone="green" /><div className="text-[11px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: "#c0332b" }}>Missing</div><List items={score.gaps} tone="red" /></div>
              <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Stronger opening</div>
                <div className="rounded-xl p-3 text-sm flex gap-2" style={{ background: "#eef4fe", color: "#101828" }}><span className="flex-1">{score.fixHook}</span><CopyBtn text={score.fixHook || ""} /></div>
                <div className="mt-3"><List items={score.fixes} /></div></div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Viral({ st, update, run, busy, niche, setNiche }: P & { niche: string; setNiche: (n: string) => void }) {
  const [url, setUrl] = useState(""); const [text, setText] = useState(""); const [views, setViews] = useState("");
  const [res, setRes] = useState<any>(null);
  const go = async () => {
    const r = await run("viral", "/api/coach/lab/viral", { reel: { url, hook: text.split("\n")[0].slice(0, 200), transcript: text, views: views }, niche });
    if (r) { setRes(r); update({ viral: [{ id: uid(), url, source: text.slice(0, 120), ...r, ts: Date.now() }, ...st.viral].slice(0, 20) }); }
  };
  const shown = res || st.viral[0];
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-5 gap-5">
        <Card className="md:col-span-2 p-5">
          <H sub="Paste the reel's spoken script or caption. Auto-fetching from the link comes with the Instagram connect.">Break down a viral reel</H>
          <div className="space-y-3">
            <Field label="Reel link (optional)"><input className={inputCls} style={inputStyle} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/reel/..." /></Field>
            <Field label="Script or caption"><textarea rows={6} className={inputCls} style={inputStyle} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste what is said in the reel. The first line is treated as the hook." /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Views (optional)"><input className={inputCls} style={inputStyle} value={views} onChange={(e) => setViews(e.target.value)} /></Field>
              <Field label="Your niche"><input className={inputCls} style={inputStyle} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. fitness coaches" /></Field></div>
            <Btn onClick={go} busy={busy === "viral"} disabled={text.trim().length < 15}><Library className="w-4 h-4" />Break it down and rewrite <span className="opacity-80 font-medium">2 credits</span></Btn>
          </div>
        </Card>
        <div className="md:col-span-3 space-y-5">
          {!shown ? <Card className="p-10 text-center text-sm" style={{ color: "#8a94a3" }}>Your breakdown shows up here: hook type, pacing, structure, and a rewrite for your niche.</Card> : (
            <>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3"><Pill>Hook</Pill><span className="text-sm font-semibold" style={{ color: "#101828" }}>{shown.breakdown?.hook?.type}</span></div>
                <p className="text-sm mb-4" style={{ color: "#344054" }}>{shown.breakdown?.hook?.why}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Pacing</div><p className="text-sm" style={{ color: "#344054" }}>{shown.breakdown?.pacing}</p></div>
                  <div><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Why it worked</div><List items={shown.breakdown?.whyItWorked} /></div>
                </div>
                <div className="mt-4"><div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7686" }}>Structure</div>
                  <div className="space-y-2">{(shown.breakdown?.structure || []).map((b: any, i: number) => <div key={i} className="flex gap-3"><div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0" style={{ background: "#eaf2fe", color: BLUE }}>{i + 1}</div><div className="text-sm"><b style={{ color: "#101828" }}>{b.beat}</b><span style={{ color: "#5b6675" }}> · {b.detail}</span></div></div>)}</div></div>
              </Card>
              <Card className="p-5" style={{ background: "linear-gradient(180deg,#f4f8fe,#fff)" }}>
                <div className="flex items-center justify-between mb-2"><Pill>Rewritten for {niche || "your niche"}</Pill>
                  <Btn small ghost onClick={() => update({ hooks: [{ id: uid(), hook: shown.rewrite?.hook, source: "Viral Library" }, ...st.hooks] })}><Bookmark className="w-3.5 h-3.5" />Save hook</Btn></div>
                <div className="text-base font-bold mb-2" style={{ color: "#101828" }}>{shown.rewrite?.hook}</div>
                <div className="rounded-xl p-3 text-sm whitespace-pre-wrap flex gap-2" style={{ background: "#fff", border: `1px solid ${LINE}`, color: "#344054" }}><span className="flex-1">{shown.rewrite?.script}</span><CopyBtn text={shown.rewrite?.script || ""} /></div>
                {shown.rewrite?.caption && <p className="text-xs mt-3" style={{ color: "#5b6675" }}><b>Caption:</b> {shown.rewrite.caption} {shown.rewrite.cta && <>· <b>CTA:</b> {shown.rewrite.cta}</>}</p>}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Hooks({ st, update, run, busy, formula }: P & { formula?: any }) {
  const [hook, setHook] = useState(""); const [topic, setTopic] = useState(""); const [vars, setVars] = useState<any[]>([]);
  const test = async (h = hook, t = topic) => {
    const r = await run("hooks", "/api/coach/lab/hooks", { hook: h, topic: t, formula });
    if (r?.variations) setVars([...r.variations].sort((a: any, b: any) => (b.score || 0) - (a.score || 0)));
  };
  const save = (h: string, score?: number, angle?: string) => { if (!st.hooks.some((x) => x.hook === h)) update({ hooks: [{ id: uid(), hook: h, score, angle, source: "Hook lab" }, ...st.hooks] }); };
  return (
    <div className="grid md:grid-cols-5 gap-5">
      <div className="md:col-span-3 space-y-5">
        <Card className="p-5">
          <H sub="Type a hook you like or just a topic. The coach writes six angles and scores each one.">Test hook variations</H>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Hook"><input className={inputCls} style={inputStyle} value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Your current opening line" /></Field>
            <Field label="Topic (optional)"><input className={inputCls} style={inputStyle} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What the reel is about" /></Field>
          </div>
          <div className="mt-3"><Btn onClick={() => test()} busy={busy === "hooks"} disabled={!hook.trim() && !topic.trim()}><Zap className="w-4 h-4" />Test variations <span className="opacity-80 font-medium">1 credit</span></Btn></div>
        </Card>
        {vars.length > 0 && (
          <div className="space-y-3">
            {vars.map((v, i) => (
              <Card key={i} className="p-4 flex items-center gap-4">
                <Score value={v.score || 0} size={52} />
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold" style={{ color: "#101828" }}>{v.hook}</div><div className="text-[11px] mt-0.5" style={{ color: "#8a94a3" }}><Pill tone="gray">{v.angle}</Pill> <span className="ml-1">{v.weakness}</span></div></div>
                <CopyBtn text={v.hook} />
                <Btn small ghost onClick={() => save(v.hook, v.score, v.angle)}><Bookmark className="w-3.5 h-3.5" />Save</Btn>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Card className="md:col-span-2 p-5 h-fit">
        <H sub={`${st.hooks.length} saved`}>Your hook bank</H>
        {st.hooks.length === 0 ? <p className="text-sm py-6 text-center" style={{ color: "#8a94a3" }}>Saved hooks live here. Save the best variations and reuse them.</p> : (
          <div className="space-y-2">
            {st.hooks.map((h) => (
              <div key={h.id} className="rounded-xl p-3" style={{ background: "#f6f8fc", border: `1px solid ${LINE}` }}>
                <div className="text-sm font-medium" style={{ color: "#101828" }}>{h.hook}</div>
                <div className="flex items-center gap-2 mt-2">{h.score != null && <Pill>{h.score}/100</Pill>}{h.source && <Pill tone="gray">{h.source}</Pill>}
                  <span className="ml-auto flex items-center"><CopyBtn text={h.hook} />
                    <button type="button" className="text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-white" style={{ color: BLUE }} onClick={() => { setHook(h.hook); test(h.hook, topic); }}>Test variations</button>
                    <button type="button" aria-label="Delete" className="p-1.5 rounded-lg hover:bg-white" style={{ color: "#8a94a3" }} onClick={() => update({ hooks: st.hooks.filter((x) => x.id !== h.id) })}><Trash2 className="w-3.5 h-3.5" /></button></span></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Report({ st, update, run, busy, formula }: P & { formula?: any }) {
  const r = st.report;
  const build = async () => { const d = await run("report", "/api/coach/lab/report", { reels: st.reels, formula }); if (d) update({ report: d }); };
  const tiles = r ? [["Reels", r.metrics?.reels], ["Views", fmt(r.metrics?.views)], ["Saves", fmt(r.metrics?.saves)], ["Shares", fmt(r.metrics?.shares)]] : [];
  return (
    <div className="space-y-5">
      <Card className="p-5 flex items-center justify-between gap-4 flex-wrap">
        <div><H sub={r?.generatedAt ? `Last built ${new Date(r.generatedAt).toLocaleString()}` : "Uses the reels in My Winners. Posts from the last 7 days when you have dates."}>Weekly report</H></div>
        <Btn onClick={build} busy={busy === "report"} disabled={st.reels.length < 2}><FileText className="w-4 h-4" />{r ? "Rebuild report" : "Build my report"} <span className="opacity-80 font-medium">2 credits</span></Btn>
      </Card>
      {st.reels.length < 2 && <Card className="p-8 text-center text-sm" style={{ color: "#8a94a3" }}>Add your reels in My Winners first (or load the sample set).</Card>}
      {r && (
        <>
          <Card className="p-6" style={{ background: "linear-gradient(180deg,#f4f8fe,#fff)" }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: "#101828" }}>{r.headline}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{tiles.map(([l, v]) => <div key={String(l)} className="rounded-xl bg-white p-3" style={{ border: `1px solid ${LINE}` }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8a94a3" }}>{l}</div><div className="text-2xl font-bold" style={{ color: "#101828" }}>{v}</div></div>)}</div>
          </Card>
          <div className="grid md:grid-cols-2 gap-5">
            <Card className="p-5"><div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" style={{ color: "#22a45d" }} /><span className="font-bold text-sm" style={{ color: "#101828" }}>What worked</span></div>
              <div className="space-y-3">{(r.worked || []).map((x: any, i: number) => <div key={i}><div className="text-sm font-semibold" style={{ color: "#101828" }}>{x.title}</div><div className="text-xs" style={{ color: "#5b6675" }}>{x.why}</div></div>)}</div></Card>
            <Card className="p-5"><div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 rotate-180" style={{ color: "#e5584f" }} /><span className="font-bold text-sm" style={{ color: "#101828" }}>What flopped</span></div>
              <div className="space-y-3">{(r.flopped || []).map((x: any, i: number) => <div key={i}><div className="text-sm font-semibold" style={{ color: "#101828" }}>{x.title}</div><div className="text-xs" style={{ color: "#5b6675" }}>{x.why}</div></div>)}</div></Card>
          </div>
          <Card className="p-5"><div className="font-bold text-sm mb-3" style={{ color: "#101828" }}>Post next</div>
            <div className="grid md:grid-cols-3 gap-3">{(r.nextPosts || []).map((p: any, i: number) => (
              <div key={i} className="rounded-xl p-4" style={{ background: "#f6f8fc", border: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between"><Pill>{p.format}</Pill><CopyBtn text={p.hook} /></div>
                <div className="text-sm font-semibold mt-2" style={{ color: "#101828" }}>{p.hook}</div><div className="text-xs mt-1" style={{ color: "#5b6675" }}>{p.why}</div></div>))}</div>
            {r.oneChange && <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: "#eaf2fe", color: "#1a4fb0" }}><b>One change for next week:</b> {r.oneChange}</div>}
          </Card>
        </>
      )}
    </div>
  );
}

function Calendar({ st, update, run, busy, niche, setNiche, formula, winnerReels }: P & { niche: string; setNiche: (n: string) => void; formula?: any; winnerReels: Reel[] }) {
  const [perWeek, setPerWeek] = useState("4"); const [weeks, setWeeks] = useState("2");
  const cal = st.calendar;
  const go = async () => { const d = await run("calendar", "/api/coach/lab/calendar", { niche, perWeek, weeks, formula, winners: winnerReels }); if (d?.posts) update({ calendar: d }); };
  const byWeek: Record<number, any[]> = {};
  (cal?.posts || []).forEach((p: any) => { (byWeek[p.week] = byWeek[p.week] || []).push(p); });
  const tone = (g: string) => (g === "sales" ? "green" : g === "trust" ? "gray" : "blue") as any;
  const all = (cal?.posts || []).map((p: any) => `Week ${p.week} ${p.day}: ${p.hook} (${p.topic}, ${p.format})`).join("\n");
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <H sub={formula ? "Built from your winning formula." : "Run My Winners first and the plan repeats what already works. You can also build one from your niche alone."}>Content calendar</H>
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2"><Field label="Your niche"><input className={inputCls} style={inputStyle} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. online fitness coaches" /></Field></div>
          <Field label="Posts per week"><select className={inputCls} style={inputStyle} value={perWeek} onChange={(e) => setPerWeek(e.target.value)}>{[2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Weeks"><select className={inputCls} style={inputStyle} value={weeks} onChange={(e) => setWeeks(e.target.value)}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></Field>
        </div>
        <div className="mt-3 flex gap-2"><Btn onClick={go} busy={busy === "calendar"} disabled={!niche.trim()}><CalendarDays className="w-4 h-4" />{cal ? "Rebuild calendar" : "Build my calendar"} <span className="opacity-80 font-medium">3 credits</span></Btn>{cal && <Btn ghost onClick={() => navigator.clipboard?.writeText(all)}><Copy className="w-4 h-4" />Copy plan</Btn>}</div>
      </Card>
      {Object.keys(byWeek).map((wk) => (
        <div key={wk}>
          <div className="text-sm font-bold mb-2" style={{ color: "#101828" }}>Week {wk}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {byWeek[+wk].map((p, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold" style={{ color: BLUE }}>{p.day}</span><Pill tone={tone(p.goal)}>{p.goal}</Pill></div>
                <div className="text-sm font-semibold" style={{ color: "#101828" }}>{p.hook}</div>
                <div className="text-xs mt-1" style={{ color: "#5b6675" }}>{p.topic}</div>
                <div className="flex items-center justify-between mt-3"><Pill tone="gray">{p.format}</Pill><CopyBtn text={p.hook} /></div>
                {p.basedOn && <div className="text-[11px] mt-2" style={{ color: "#8a94a3" }}>Repeats: {p.basedOn}</div>}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


function IgPanel({ ig, st, busy, igBusy, onSync, onRefresh, update, setTab }: { ig: any; st: LabState; busy: string; igBusy: string; onSync: () => void; onRefresh: () => void; update: (p: Partial<LabState>) => void; setTab: (t: any) => void }) {
  const sync = st.igSync;
  const working = !!busy || !!igBusy;
  const f = st.winners?.formula;
  const ids = new Set<string>(st.winners?.winnerIds || []);
  const top = st.reels.filter((r) => ids.has(r.id)).slice(0, 3);
  const next: any[] = st.report?.nextPosts || [];
  const hasCoaching = st.reels.some((r) => r.source === "instagram") && (f || next.length > 0);
  const saveHook = (h: string) => { if (!st.hooks.some((x) => x.hook === h)) update({ hooks: [{ id: uid(), hook: h, source: "my winner" }, ...st.hooks] }); };
  return (
    <div className="space-y-4 mb-6" data-testid="coach-ig-panel">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eaf2fe" }}><TrendingUp className="w-5 h-5" style={{ color: BLUE }} /></div>
            <div>
              {!ig.connected ? (<><div className="text-sm font-bold" style={{ color: "#101828" }}>Connect Instagram, skip the typing</div>
                <div className="text-xs" style={{ color: "#6b7686" }}>The coach pulls your reels and insights, finds your winners and coaches you from real numbers.</div></>)
                : ig.expired ? (<><div className="text-sm font-bold" style={{ color: "#101828" }}>Instagram connection expired</div><div className="text-xs" style={{ color: "#6b7686" }}>Reconnect to keep your reels in sync.</div></>)
                : (<><div className="text-sm font-bold flex items-center gap-2" style={{ color: "#101828" }}>Instagram connected{ig.igUsername ? ` as @${ig.igUsername}` : ""} <Pill tone="green">Live</Pill></div>
                  <div className="text-xs" style={{ color: "#6b7686" }}>{sync ? `${sync.count} reels synced ${new Date(sync.at).toLocaleString()}.` : "Not synced yet."}{sync && !sync.insights ? " Views, saves and shares need the insights permission. Reconnect to allow it." : ""}</div></>)}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(!ig.connected || ig.expired) ? <a href="/api/oauth/meta/connect"><Btn>{ig.expired ? "Reconnect Instagram" : "Connect Instagram"}</Btn></a> : (<>
              <Btn ghost onClick={onSync} busy={igBusy === "sync"} disabled={working}><RefreshCw className="w-4 h-4" />Sync now</Btn>
              <Btn onClick={onRefresh} busy={working && igBusy !== "sync"} disabled={working}><Sparkles className="w-4 h-4" />Coach me from my reels <span className="opacity-80 font-medium">up to 8 credits</span></Btn></>)}
          </div>
        </div>
        {!ig.connected && <div className="text-[11px] mt-3" style={{ color: "#8a94a3" }}>Prefer not to connect? Paste your reels in My Winners, it works the same.</div>}
      </Card>
      {hasCoaching && (
        <Card className="p-5" style={{ background: "linear-gradient(180deg,#f4f8fe,#fff)" }}>
          <div className="flex items-center justify-between mb-3"><div className="font-bold text-sm" style={{ color: "#101828" }}>Your coaching, from your real reels</div><Pill>Updated {sync ? new Date(sync.at).toLocaleDateString() : "today"}</Pill></div>
          <div className="grid md:grid-cols-3 gap-4">
            <div><div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8a94a3" }}>Post next</div>
              <div className="space-y-2">{next.slice(0, 3).map((p, i) => <div key={i} className="text-[13px]" style={{ color: "#101828" }}><b>{p.hook}</b><div className="text-xs" style={{ color: "#6b7686" }}>{p.format}</div></div>)}{!next.length && <button type="button" className="text-xs font-semibold" style={{ color: BLUE }} onClick={() => setTab("report")}>Build your weekly report</button>}</div></div>
            <div><div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8a94a3" }}>Reuse these hooks</div>
              <div className="space-y-2">{top.map((r) => <div key={r.id} className="flex items-start justify-between gap-2 text-[13px]" style={{ color: "#101828" }}><span>{r.hook}</span><button type="button" onClick={() => saveHook(r.hook)} className="text-[11px] font-semibold shrink-0" style={{ color: BLUE }}>Save</button></div>)}{!top.length && <div className="text-xs" style={{ color: "#8a94a3" }}>Run the winners analysis to see them.</div>}</div></div>
            <div><div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8a94a3" }}>Stop doing</div>
              <div className="space-y-1.5">{(f?.stopDoing || []).slice(0, 3).map((x: string, i: number) => <div key={i} className="text-[13px]" style={{ color: "#101828" }}>{x}</div>)}{!f && <div className="text-xs" style={{ color: "#8a94a3" }}>Appears after the winners analysis.</div>}</div></div>
          </div>
          <button type="button" className="text-xs font-semibold mt-4" style={{ color: BLUE }} onClick={() => setTab("winners")}>Paste a new script in My Winners to get feedback against your own best reels</button>
        </Card>
      )}
    </div>
  );
}
