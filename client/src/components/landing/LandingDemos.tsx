// Looping, scroll-triggered product cards for the landing bento.
// Every state is filled, motion is eased, and each card only ticks while on screen.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* ---------- helpers ---------- */
function useLoop(len: number, ms: number, start: number, restart = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!vis) return;
    const t = setInterval(() => setI(x => (x + 1 >= len ? restart : x + 1)), ms);
    return () => clearInterval(t);
  }, [vis, len, ms, restart]);
  return { ref, i };
}

function useTween(target: number, ms = 800) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const a = from.current, b = target; if (a === b) return;
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      const cur = a + (b - a) * e; from.current = cur; setV(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
const Num = ({ v, ms }: { v: number; ms?: number }) => <>{Math.round(useTween(v, ms))}</>;

const ICON: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  cal: <><rect x="3" y="5" width="18" height="16" rx="3.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  users: <><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" /><circle cx="10" cy="8" r="3.5" /><path d="M20 19v-1a4 4 0 0 0-3-3.8M16 4.3a3.5 3.5 0 0 1 0 6.4" /></>,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />,
  send: <path d="M21 3L10 14M21 3l-6.5 18-3.5-7.5L3.5 10z" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H16" /></>,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  ig: <><rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" /></>,
  play: <path d="M8 5.5v13l11-6.5z" />,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="3" /><path d="M16 10.5l5-3v9l-5-3z" /></>,
  flame: <path d="M12 2c1.2 3.2-1.8 4.6-1.8 7 0 1.4 1 2.4 2.3 2.4 1.8 0 2.6-1.6 2.2-3.4 2.4 1.6 3.6 4 3.6 6.4A6.3 6.3 0 0 1 12 20.8 6.3 6.3 0 0 1 5.7 14.4C5.7 9 10.5 7.4 12 2z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
};
function I({ n, s = 14, w = 1.9, c, f }: { n: string; s?: number; w?: number; c?: string; f?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={f || "none"} stroke={f ? "none" : c || "currentColor"} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", display: "block" }}>{ICON[n]}</svg>;
}
const AVC: [string, string][] = [["#a9ccff", "#4f93ff"], ["#bfd4ff", "#2e78ef"], ["#a5dcff", "#2f9bff"], ["#cfc8ff", "#6f68ff"], ["#a8e6ff", "#2a86e8"], ["#bcd2ff", "#3f6fe0"]];
function Av({ k, s = 24, ring = true }: { k: number; s?: number; ring?: boolean }) {
  const [a, b] = AVC[k % AVC.length]; const id = `av${k % AVC.length}`;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" style={{ flex: "none", borderRadius: "50%", boxShadow: ring ? "0 0 0 2px #fff" : undefined, display: "block" }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="32" height="32" fill={`url(#${id})`} />
      <circle cx="16" cy="13" r="5.4" fill="#fff" opacity=".95" />
      <path d="M5 29c1.3-5.6 5.6-8.6 11-8.6S25.7 23.4 27 29z" fill="#fff" opacity=".95" />
    </svg>
  );
}

const CSS = `
.adw{position:relative;width:100%;height:100%;font-family:Inter,system-ui,sans-serif}
.ad{position:absolute;inset:0;border-radius:20px;background:linear-gradient(180deg,#fff 0,#fbfdff 100%);border:1px solid #e4ecf8;box-shadow:0 1px 0 #fff inset,0 24px 44px -26px rgba(46,120,239,.5),0 4px 12px -6px rgba(16,24,40,.08);display:flex;flex-direction:column;overflow:hidden;text-align:left;color:#101828}
.ad-bar{flex:none;height:42px;display:flex;align-items:center;gap:9px;padding:0 14px;border-bottom:1px solid #edf2fa;background:linear-gradient(180deg,#f8fbff,#fff)}
.ad-ic{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#4f93ff,#2e78ef);display:grid;place-items:center;color:#fff;box-shadow:0 4px 10px -3px rgba(46,120,239,.6)}
.ad-bar b{font-size:12.5px;font-weight:650;letter-spacing:-.01em}
.ad-tag{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:600;color:#2e78ef;background:#eef4ff;border-radius:99px;padding:4px 9px}
.ad-tag.ev{background:rgba(255,255,255,.9);border:1px solid #cfe0fb;box-shadow:0 10px 20px -10px rgba(46,120,239,.7);animation:ad-float .6s cubic-bezier(.2,.9,.3,1.15) both;color:#101828}
.ad-tag.ev .t{width:16px;height:16px;border-radius:50%;background:#2e78ef;color:#fff;display:grid;place-items:center}
.ad-tag.m{color:#667085;background:#f3f6fb}
.ad-dot{width:6px;height:6px;border-radius:50%;background:#2e78ef;box-shadow:0 0 0 0 rgba(46,120,239,.5);animation:ad-ping 1.8s infinite}
.ad-foot{flex:none;height:40px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 14px;border-top:1px solid #edf2fa;background:#f9fbfe;font-size:10.5px;color:#667085}
.ad-foot b{color:#101828;font-weight:650;font-variant-numeric:tabular-nums}
.ad-feed{flex:1;min-height:0;overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 22px);mask-image:linear-gradient(180deg,transparent 0,#000 22px)}
.ad-feed>div{display:flex;flex-direction:column;gap:8px;padding:14px;will-change:transform}
.ad-m{max-width:80%;font-size:11.5px;line-height:1.4;padding:7px 11px;border-radius:15px;animation:ad-in .5s cubic-bezier(.2,.8,.2,1) both}
.ad-m small{display:flex;align-items:center;gap:5px;font-size:9.5px;font-weight:650;margin-bottom:2px;opacity:.7}
.ad-r{align-self:flex-start;background:#f0f4fa;color:#101828;border-bottom-left-radius:5px}
.ad-s{align-self:flex-end;background:linear-gradient(135deg,#4f93ff,#2e78ef);color:#fff;border-bottom-right-radius:5px;box-shadow:0 8px 16px -8px rgba(46,120,239,.7)}
.ad-who{align-self:flex-start;display:flex;align-items:center;gap:7px;animation:ad-in .5s cubic-bezier(.2,.8,.2,1) both}
.ad-who span{font-size:10.5px;color:#667085}.ad-who b{font-size:11px;color:#101828;font-weight:650}
.ad-typ{display:inline-flex;gap:3px;padding:5px 2px}.ad-typ i{width:5px;height:5px;border-radius:50%;background:#fff;opacity:.55;animation:ad-dot 1s infinite}
.ad-typ i:nth-child(2){animation-delay:.14s}.ad-typ i:nth-child(3){animation-delay:.28s}
.ad-crm{align-self:center;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #dbe8fb;border-radius:12px;padding:6px 10px 6px 7px;font-size:10.5px;color:#475467;box-shadow:0 10px 20px -12px rgba(46,120,239,.55);animation:ad-in .5s cubic-bezier(.2,.8,.2,1) both}
.ad-crm b{color:#101828;font-weight:650}
.ad-ok{width:18px;height:18px;border-radius:50%;background:#2e78ef;color:#fff;display:grid;place-items:center}
.ad-float{position:absolute;z-index:4;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.9);border-radius:14px;padding:7px 11px 7px 8px;font-size:10.5px;color:#475467;box-shadow:0 18px 34px -14px rgba(46,120,239,.55),0 2px 6px rgba(16,24,40,.06);animation:ad-float .7s cubic-bezier(.2,.9,.3,1.15) both}
.ad-float b{color:#101828;font-weight:650;display:block;font-size:11px;line-height:1.15}
.ad-float .t{width:22px;height:22px;border-radius:7px;background:#eaf2ff;color:#2e78ef;display:grid;place-items:center}
.ad-tile{border-radius:12px;background:#fff;border:1px solid #e8eef8;box-shadow:0 6px 14px -10px rgba(16,24,40,.25)}
.ad-idea{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px 0 8px;animation:ad-in .55s cubic-bezier(.2,.8,.2,1) both}
.ad-idea .ti{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;flex:none;background:#eaf2ff;color:#2e78ef}
.ad-idea strong{font-size:11.5px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.ad-idea em{font-style:normal;font-size:10px;font-weight:650;color:#2e78ef;background:#eef4ff;border-radius:99px;padding:3px 8px;flex:none}
.ad-sk{height:36px;display:flex;align-items:center;gap:10px;padding:0 10px 0 8px}
.ad-sk i{display:block;border-radius:6px;background:linear-gradient(90deg,#eef2f9 0,#f8fafd 50%,#eef2f9 100%);background-size:200% 100%;animation:ad-sh 1.4s linear infinite}
.ad-field{flex:1;display:flex;align-items:center;gap:8px;height:32px;padding:0 11px;border-radius:11px;background:#f4f7fc;border:1px solid #e6edf8;font-size:11.5px;color:#344054}
.ad-btn{flex:none;height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 13px;border-radius:11px;background:linear-gradient(135deg,#4f93ff,#2e78ef);color:#fff;font-size:11px;font-weight:650;box-shadow:0 8px 16px -8px rgba(46,120,239,.8);transition:opacity .3s}
.ad-btn.w{opacity:.8}
.ad-cal{flex:1;min-height:0;display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:12px 14px 10px}
.ad-col{border-radius:12px;background:#f6f9fe;border:1px solid #eaf0f9;display:flex;flex-direction:column;align-items:center;padding:6px 4px;gap:5px;min-height:0}
.ad-col.on{background:#eef4ff;border-color:#d3e3fc}
.ad-col u{text-decoration:none;font-size:9.5px;font-weight:650;color:#98a2b3;letter-spacing:.04em}
.ad-col s{text-decoration:none;font-size:12px;font-weight:700;color:#344054;font-variant-numeric:tabular-nums}
.ad-post{width:100%;flex:1;min-height:0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;font-size:8.5px;font-weight:650;animation:ad-drop .7s cubic-bezier(.2,.9,.3,1.15) both;box-shadow:0 8px 14px -8px rgba(46,120,239,.8)}
.ad-empty{width:100%;flex:1;border-radius:8px;border:1.5px dashed #d6e2f5}
.ad-big{font-size:34px;font-weight:700;letter-spacing:-.035em;line-height:1;font-variant-numeric:tabular-nums}
.ad-lbl{font-size:9.5px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;color:#98a2b3}
.ad-track{height:8px;border-radius:99px;background:#e9f0fb;overflow:hidden}
.ad-track>div{height:100%;border-radius:99px;background:linear-gradient(90deg,#6aa6ff,#2e78ef);transition:width .9s cubic-bezier(.2,.8,.2,1);box-shadow:0 0 12px rgba(46,120,239,.5)}
.ad-row{display:flex;align-items:center;gap:9px;height:34px;padding:0 10px 0 8px;font-size:11px;color:#475467;animation:ad-in .5s cubic-bezier(.2,.8,.2,1) both}
.ad-row b{color:#101828;font-weight:650}.ad-row small{margin-left:auto;font-size:10px;color:#98a2b3}
.ad-days{display:grid;grid-template-columns:repeat(14,1fr);gap:4px}
.ad-day{aspect-ratio:1;border-radius:7px;background:#e9f0fb;display:grid;place-items:center;color:#fff;transition:background .4s}
.ad-day.on{background:linear-gradient(135deg,#6aa6ff,#2e78ef)}
.ad-day.now{background:#fff;border:2px solid #2e78ef;color:#2e78ef;animation:ad-ping 1.8s infinite}
@keyframes ad-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ad-drop{0%{opacity:0;transform:translateY(-22px) scale(.7)}60%{opacity:1;transform:translateY(2px) scale(1.04)}100%{transform:none}}
@keyframes ad-float{from{opacity:0;transform:translateY(8px) scale(.9)}to{opacity:1;transform:none}}
@keyframes ad-dot{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
@keyframes ad-ping{0%{box-shadow:0 0 0 0 rgba(46,120,239,.45)}70%,100%{box-shadow:0 0 0 7px rgba(46,120,239,0)}}
@keyframes ad-sh{to{background-position:-200% 0}}
`;

function Card({ rf, icon, title, tag, foot, children, floats }: { rf: React.Ref<HTMLDivElement>; icon: string; title: string; tag: ReactNode; foot: ReactNode; children: ReactNode; floats?: ReactNode }) {
  return (
    <div className="adw" ref={rf}>
      <style>{CSS}</style>
      <div className="ad">
        <div className="ad-bar"><span className="ad-ic"><I n={icon} s={12} w={2.2} /></span><b>{title}</b>{tag}</div>
        {children}
        <div className="ad-foot">{foot}</div>
      </div>
      {floats}
    </div>
  );
}

const Ev = ({ k, ic, t }: { k: string | number; ic: string; t: string }) => <span className="ad-tag ev" key={k}><span className="t"><I n={ic} s={9} w={3} /></span>{t}</span>;

function Feed({ n, children }: { n: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0); const [instant, setInstant] = useState(true); const prev = useRef(n);
  useLayoutEffect(() => {
    const o = outer.current!, d = inner.current!;
    setInstant(n < prev.current || prev.current === n && y === 0); prev.current = n;
    setY(Math.max(0, d.scrollHeight - o.clientHeight));
  }, [n]);
  useEffect(() => { const t = setTimeout(() => setInstant(false), 60); return () => clearTimeout(t); }, [n]);
  return <div className="ad-feed" ref={outer}><div ref={inner} style={{ transform: `translateY(${-y}px)`, transition: instant ? "none" : "transform .6s cubic-bezier(.2,.8,.2,1)" }}>{children}</div></div>;
}

/* ---------- DM automation ---------- */
type DM = { k: "in" | "out" | "typing" | "crm"; a?: number; h?: string; t: string };
const DM_SCRIPT: DM[] = [
  { k: "in", a: 0, h: "priya.fit", t: "Send me the link" },
  { k: "typing", t: "" },
  { k: "out", t: "Hey Priya! Here is the free hook guide. Tap to open it." },
  { k: "crm", a: 0, t: "Priya" },
  { k: "in", a: 1, h: "marcus.k", t: "GUIDE" },
  { k: "typing", t: "" },
  { k: "out", t: "Sent! What do you sell, Marcus?" },
  { k: "crm", a: 1, t: "Marcus" },
  { k: "in", a: 2, h: "jess.coach", t: "how much is it?" },
  { k: "typing", t: "" },
  { k: "out", t: "Plans start free. Want the link?" },
  { k: "crm", a: 2, t: "Jess" },
];
export function DMDemo() {
  const { ref, i } = useLoop(DM_SCRIPT.length + 2, 1250, 6, 3);
  const seen = DM_SCRIPT.slice(0, Math.min(i, DM_SCRIPT.length - 1) + 1);
  const shown = seen.filter((m, idx) => m.k !== "typing" || idx === seen.length - 1);
  const leads = 24 + seen.filter(m => m.k === "crm").length;
  const replies = 118 + seen.filter(m => m.k === "out").length * 3;
  const last = seen[seen.length - 1];
  return (
    <Card rf={ref} icon="ig" title="Instagram DMs" tag={last?.k === "crm" ? <Ev k={leads} ic="users" t="+1 new lead" /> : <span className="ad-tag"><span className="ad-dot" />Automation live</span>}
      foot={<><span>Replies today <b><Num v={replies} /></b></span><span>New leads <b><Num v={leads} /></b></span></>}>
      <Feed n={shown.length}>
        {shown.map(m => {
          const key = DM_SCRIPT.indexOf(m);
          if (m.k === "typing") return <div key={key} className="ad-m ad-s"><span className="ad-typ"><i /><i /><i /></span></div>;
          if (m.k === "crm") return <div key={key} className="ad-crm"><span className="ad-ok"><I n="check" s={10} w={3} /></span><span><b>{m.t}</b> saved to your CRM</span></div>;
          if (m.k === "in") return <div key={key} className="ad-who"><Av k={m.a!} s={22} ring={false} /><div className="ad-m ad-r" style={{ animation: "none" }}><small>@{m.h}</small>{m.t}</div></div>;
          return <div key={key} className="ad-m ad-s"><small><I n="bolt" s={9} w={2.4} />Auto reply</small>{m.t}</div>;
        })}
      </Feed>
    </Card>
  );
}

/* ---------- Content ideas ---------- */
const IDEAS = [
  { ic: "bolt", t: "3 mistakes every new coach makes", s: 92 },
  { ic: "video", t: "A day in my life as a fitness coach", s: 88 },
  { ic: "layers", t: "5 meals under 400 calories", s: 85 },
];
export function IdeasDemo() {
  const { ref, i } = useLoop(8, 1100, 4, 1);
  const n = Math.min(i, IDEAS.length);
  const busy = n < IDEAS.length;
  return (
    <Card rf={ref} icon="spark" title="Content Ideas" tag={<span className="ad-tag m">30 ideas per niche</span>}
      foot={<><span>Niche <b>Fitness coaching</b></span><span>Ready <b><Num v={n} /> of {IDEAS.length}</b></span></>}>
      <div style={{ flex: 1, minHeight: 0, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="ad-field"><I n="search" s={13} c="#98a2b3" />Fitness coaching</div>
          <div className={`ad-btn${busy ? " w" : ""}`}><I n="spark" s={12} w={2.2} />{busy ? "Generating" : "Generate"}</div>
        </div>
        {IDEAS.map((d, k) => k < n
          ? <div key={d.t} className="ad-tile ad-idea"><span className="ti"><I n={d.ic} s={12} /></span><strong>{d.t}</strong><em>{d.s} score</em></div>
          : <div key={d.t} className="ad-sk"><i style={{ width: 22, height: 22, borderRadius: 7 }} /><i style={{ flex: 1, height: 9 }} /><i style={{ width: 44, height: 16, borderRadius: 99 }} /></div>)}
      </div>
    </Card>
  );
}

/* ---------- Scheduler ---------- */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const POSTS = [
  { d: 0, k: "Reel", ic: "video", t: "9:00", c: "linear-gradient(160deg,#6aa6ff,#2e78ef)" },
  { d: 2, k: "Story", ic: "spark", t: "12:30", c: "linear-gradient(160deg,#7fb2ff,#4a8df0)" },
  { d: 1, k: "Carousel", ic: "layers", t: "7:00", c: "linear-gradient(160deg,#4f93ff,#1d5fd6)" },
  { d: 3, k: "Reel", ic: "video", t: "9:00", c: "linear-gradient(160deg,#6aa6ff,#2e78ef)" },
  { d: 4, k: "Photo", ic: "ig", t: "6:00", c: "linear-gradient(160deg,#7fb2ff,#4a8df0)" },
  { d: 5, k: "Reel", ic: "video", t: "10:00", c: "linear-gradient(160deg,#4f93ff,#1d5fd6)" },
  { d: 6, k: "Story", ic: "spark", t: "8:00", c: "linear-gradient(160deg,#6aa6ff,#2e78ef)" },
];
export function SchedulerDemo() {
  const { ref, i } = useLoop(POSTS.length + 3, 1150, 5, 2);
  const n = Math.min(i, POSTS.length);
  const lastP = POSTS[Math.max(0, n - 1)];
  return (
    <Card rf={ref} icon="cal" title="Content Scheduler" tag={i % 3 === 0 ? <Ev k={n} ic="check" t={`${lastP.k} scheduled`} /> : <span className="ad-tag m">This week</span>}
      foot={<><span><b><Num v={n} /> posts</b> scheduled</span><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><I n="clock" s={11} />Next <b>Thu 9:00 AM</b></span></>}>
      <div className="ad-cal">
        {DAYS.map((d, c) => {
          const p = POSTS.slice(0, n).find(x => x.d === c);
          return (
            <div className={`ad-col${p ? " on" : ""}`} key={d}>
              <u>{d.toUpperCase()}</u><s>{12 + c}</s>
              {p ? <div className="ad-post" key={p.k + c} style={{ background: p.c }}><I n={p.ic} s={13} w={2.1} /><span>{p.t}</span></div> : <div className="ad-empty" />}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function VideoDemo() {
  return (
<div className="demo"><div style={{"position":"absolute","inset":"0","borderRadius":"18px","background":"linear-gradient(160deg,#3b82f0,#1d4ba8)"}}></div>
<div style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center"}}><span style={{"width":"48px","height":"48px","borderRadius":"50%","background":"rgba(255,255,255,.92)","display":"flex","alignItems":"center","justifyContent":"center","animation":"lp-vplay 16s infinite both"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="#141414" style={{"marginLeft":"2px"}}><path d="M6 4l14 8-14 8z"/></svg></span></div>
<div style={{"position":"absolute","left":"16px","right":"16px","bottom":"64px","borderRadius":"12px","background":"#fff","padding":"8px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","animation":"lp-vcta 16s infinite both"}}>
<span style={{"fontSize":"10.5px","fontWeight":"600","color":"#141414"}}>Ready to start?</span>
<span style={{"borderRadius":"8px","background":"#2e78ef","color":"#fff","fontSize":"10px","fontWeight":"600","padding":"6px 10px","animation":"lp-vclick 16s infinite both"}}>Book a call</span></div>
<div style={{"position":"absolute","left":"16px","right":"16px","bottom":"16px"}}>
<div style={{"height":"6px","borderRadius":"99px","background":"rgba(255,255,255,.2)","overflow":"hidden"}}><div style={{"height":"100%","borderRadius":"99px","background":"#2e78ef","animation":"lp-vbar 16s infinite both"}}></div></div>
<div style={{"display":"flex","justifyContent":"space-between","marginTop":"8px","fontSize":"9.5px","color":"rgba(255,255,255,.6)"}}><span>Your VSL</span><span>Plays everywhere</span></div></div>
<svg className="cur" width="16" height="16" viewBox="0 0 24 24" style={{"animation":"lp-vcur 16s infinite both"}}><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#fff" strokeWidth="1.6"/></svg></div>
  );
}


/* ---------- Webinars ---------- */
const NAMES = ["Aria", "Noah", "Mia", "Leo", "Zoe", "Kai", "Eva", "Sam"];
export function WebinarDemo() {
  const { ref, i } = useLoop(12, 1150, 6, 2);
  const regs = 37 + i * 2;
  const who = i % NAMES.length;
  const copied = i % 6 === 3;
  return (
    <Card rf={ref} icon="video" title="Webinars" tag={i % 2 === 0 ? <Ev k={who} ic="users" t={`${NAMES[who]} registered`} /> : <span className="ad-tag"><span className="ad-dot" />Registration open</span>}
      foot={<><span>Show-up rate <b><Num v={Math.min(64, 41 + i * 2)} />%</b></span><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><I n="clock" s={11} />Thu <b>7:00 PM</b></span></>}>
      <div style={{ flex: 1, minHeight: 0, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: "-.015em" }}>How to sell high-ticket offers live</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="ad-field" style={{ color: "#667085" }}><I n="link" s={13} c="#98a2b3" />oravini.com/w/high-ticket</div>
          <div className="ad-btn" style={copied ? { background: "#101828", boxShadow: "none" } : undefined}><I n={copied ? "check" : "copy"} s={12} w={2.2} />{copied ? "Copied" : "Copy"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div><div className="ad-lbl">Registrations</div><div className="ad-big" style={{ marginTop: 4 }}><Num v={regs} /></div></div>
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 3 }}>
            {[0, 1, 2, 3, 4].map(k => <div key={k} style={{ marginLeft: k ? -8 : 0 }}><Av k={k + who} s={26} /></div>)}
            <span style={{ marginLeft: -8, height: 26, minWidth: 26, padding: "0 7px", borderRadius: 99, background: "#eaf2ff", color: "#2e78ef", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", boxShadow: "0 0 0 2px #fff" }}>+<Num v={regs - 5} /></span>
          </div>
        </div>
        <div className="ad-track"><div style={{ width: `${Math.min(100, (regs / 80) * 100)}%` }} /></div>
        <div className="ad-tile ad-row" key={who}><Av k={who} s={20} ring={false} /><span><b>{NAMES[who]}</b> just registered</span><small>now</small></div>
      </div>
    </Card>
  );
}

/* ---------- Streak and goals ---------- */
export function StreakDemo() {
  const { ref, i } = useLoop(9, 1100, 5, 0);
  const pct = Math.min(68, 40 + i * 5);
  const posts = Math.min(5, 3 + Math.floor(i / 3));
  const amt = Math.round((pct / 100) * 10000);
  return (
    <Card rf={ref} icon="flame" title="Streak and goals" tag={i % 4 === 1 ? <Ev k={i} ic="flame" t="Streak extended" /> : <span className="ad-tag m">Best 21 days</span>}
      foot={<><span>Posts this week <b>{posts} of 5</b></span><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><I n="trend" s={11} />Creator score <b>84</b></span></>}>
      <div style={{ flex: 1, minHeight: 0, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#6aa6ff,#2e78ef)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 10px 18px -8px rgba(46,120,239,.8)" }}><I n="flame" s={20} f="#fff" /></span>
          <div><div className="ad-big" style={{ fontSize: 30 }}>12<span style={{ fontSize: 13, fontWeight: 600, color: "#667085", letterSpacing: 0, marginLeft: 6 }}>day streak</span></div></div>
        </div>
        <div className="ad-days">{Array.from({ length: 14 }).map((_, k) => <div key={k} className={`ad-day${k < 11 ? " on" : k === 11 ? " now" : ""}`}>{k < 11 && <I n="check" s={9} w={3.2} />}</div>)}</div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, fontSize: 10.5, color: "#667085" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><I n="target" s={12} />Income goal · ${amt.toLocaleString()} of $10,000</span><b style={{ color: "#101828", fontSize: 12 }}><Num v={pct} />%</b>
          </div>
          <div className="ad-track"><div style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="ad-tile ad-row"><span className="ad-ok" style={{ width: 20, height: 20, borderRadius: 7 }}><I n="bolt" s={11} w={2.4} /></span><span><b>Next up:</b> post today&apos;s reel</span><small>9:00 AM</small></div>
      </div>
    </Card>
  );
}
