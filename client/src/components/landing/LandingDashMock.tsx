// Live, looping dashboard mock for the landing hero. Pure HTML/CSS/JS: no video.
// The sidebar is clickable. Each view loops its own animation while the mock is on screen.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { OraviniMark } from "@/components/OraviniLogo";

const BLUE = "#2e78ef";
const P: Record<string, string> = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  ideas: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  comp: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  dm: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  web: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
  vid: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  up: '<path d="M7 17L17 7M9 7h8v8"/>',
  flame: '<path d="M12 2c1.2 3.2-1.8 4.6-1.8 7 0 1.4 1 2.4 2.3 2.4 1.8 0 3-1.5 2.6-3.6 2 1.7 3.4 4 3.4 6.4A6.5 6.5 0 0 1 12 20.7 6.5 6.5 0 0 1 5.5 14C5.5 9.5 10 8 12 2z"/>',
};
function Ic({ n, s = 14, c = "currentColor", w = 1.8 }: { n: string; s?: number; c?: string; w?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: P[n] }} style={{ flex: "none" }} />;
}

function useTween(target: number, ms = 900) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const a = from.current, b = target; if (a === b) return;
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      const x = a + (b - a) * e; from.current = x; setV(x);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return Math.round(v);
}
const fmt = (n: number) => n.toLocaleString("en-US");

const Fade = ({ on, children, style }: { on: boolean; children: ReactNode; style?: React.CSSProperties }) => (
  <div style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(8px)", transition: "opacity .5s ease, transform .5s cubic-bezier(.2,.7,.2,1)", ...style }}>{children}</div>
);
const Card = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => <div className="mini" style={style}>{children}</div>;
const Lbl = ({ children }: { children: ReactNode }) => <span className="lbl">{children}</span>;

/* ---------- views (p advances every 900ms) ---------- */
function DashView({ p, t }: { p: number; t: number }) {
  // Everything here is a continuous function of time t (seconds): no resets, no seams.
  const followers = Math.round(60000 + 31000 * (1 - Math.exp(-t / 70)) + 90 * Math.sin(t * 1.3));
  const goal = Math.round(58 + 10 * Math.sin(t / 7));
  const seq = [0, 0, 1, 2, 3, 3, 3, 3, 2, 1, 0, 0];
  const done = seq[Math.floor(t / 0.9) % seq.length];
  const score = Math.round(810 + 22 * Math.sin(t / 3.1));
  const N = 28;
  const ys = Array.from({ length: N }, (_, i) => {
    const x = i / (N - 1);
    return 40 - 22 * x + 7 * Math.sin(t * 0.7 + i * 0.5) + 4 * Math.sin(t * 0.43 + i * 1.3);
  });
  const path = ys.map((y, i) => `${i ? "L" : "M"}${(i / (N - 1)) * 300},${y.toFixed(1)}`).join(" ");
  const delta = (3.4 + 0.9 * Math.sin(t / 2.4)).toFixed(1);
  return (
    <>
      <div className="app-grid">
        <Card>
          <Lbl>Followers</Lbl>
          <div className="big" style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(followers)}<span className="delta">+{delta}%</span></div>
          <svg width="100%" height="72" viewBox="0 0 300 72" preserveAspectRatio="none" style={{ marginTop: 10 }}>
            <defs><linearGradient id="dmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BLUE} stopOpacity=".28" /><stop offset="1" stopColor={BLUE} stopOpacity="0" /></linearGradient></defs>
            <path d={`${path} L300,72 L0,72 Z`} fill="url(#dmg)" />
            <path d={path} fill="none" stroke={BLUE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Card>
        <Card>
          <Lbl>Income goal</Lbl>
          <div className="ring-wrap">
            <svg width="52" height="52" viewBox="0 0 52 52"><circle className="ring-bg" cx="26" cy="26" r="21" fill="none" strokeWidth="6" /><circle className="ring-fg" cx="26" cy="26" r="21" fill="none" strokeWidth="6" strokeDasharray="132" strokeDashoffset={132 - (132 * goal) / 100} style={{ transition: "none" }} /></svg>
            <div><div className="big" style={{ fontSize: 19 }}>{goal}%</div><div style={{ fontSize: 11, color: "#8a94a3" }}>of $100K in 6 months</div></div>
          </div>
        </Card>
      </div>
      <div className="app-row">
        <Card>
          <Lbl>My big 3 today</Lbl>
          {["Post 3 reels", "Record webinar", "Reply to DMs"].map((x, i) => (
            <div key={x} className={"todo" + (done > i ? " done" : "")} style={{ transition: "color .5s ease, opacity .5s ease" }}><span className="box" style={{ transition: "all .5s ease" }}></span>{x}</div>
          ))}
        </Card>
        <Card><Lbl>Creator score</Lbl><div className="big" style={{ fontVariantNumeric: "tabular-nums" }}>{score}</div><div style={{ fontSize: 11, color: "#8a94a3" }}>Elite · top tier</div></Card>
        <Card><Lbl>Streak</Lbl><div className="big">21 <Ic n="flame" s={18} c={BLUE} /></div><div style={{ fontSize: 11, color: "#8a94a3" }}>days posting</div></Card>
      </div>
    </>
  );
}

function IdeasView({ p }: { p: number }) {
  const niches = ["Fitness coaching", "Personal finance", "Skincare brand"];
  const ideas: string[][] = [
    ["3 mistakes every new coach makes", "A day in my life as a trainer", "5 meals under 400 calories", "Why you plateau at week 6"],
    ["Why saving 20% is not enough", "I tracked every dollar for 30 days", "3 money rules I wish I knew at 20", "Stop buying this, invest instead"],
    ["The 3 step night routine", "Stop using this with retinol", "What I would buy on a budget", "Why your SPF is not working"],
  ];
  const k = Math.floor(p / 9) % 3, q = p % 9;
  const typed = niches[k].slice(0, q === 0 ? 0 : Math.min(niches[k].length, q * 6));
  const show = Math.max(0, q - 2);
  const scores = [92, 88, 85, 81];
  return (
    <Card style={{ minHeight: 262 }}>
      <Lbl>Content Ideas · 30 ideas per niche</Lbl>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <div style={{ flex: 1, border: "1px solid #e3e9f3", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, color: "#101828" }}>{typed}<span style={{ color: BLUE }}>{q < 3 ? "|" : ""}</span></div>
        <div className="app-pillbtn" style={{ display: "inline-flex", alignItems: "center", gap: 6, transform: q === 2 ? "scale(.94)" : "none", transition: "transform .2s" }}><Ic n="ideas" s={12} c="#fff" />Generate</div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {ideas[k].map((t, i) => (
          <Fade key={t} on={show > i}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e9edf3", borderRadius: 10, padding: "9px 12px", background: "#fff" }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: "#eaf1fd", display: "grid", placeItems: "center" }}><Ic n="ideas" s={12} c={BLUE} /></span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#101828" }}>{t}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, background: "#eaf1fd", padding: "3px 9px", borderRadius: 999 }}>{scores[i]} score</span>
            </div>
          </Fade>
        ))}
      </div>
    </Card>
  );
}

function CompView({ p }: { p: number }) {
  const q = p % 14;
  const rows: [string, number][] = [["@growthwithmia", 88], ["@coachkarim", 64], ["@thefitfounder", 46], ["@you", 30 + (p % 12) * 3]];
  const hooks = ["Stop doing this at the gym", "I tried it for 30 days", "3 things nobody tells you", "Do this before you post"];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}><Lbl>Competitor Study</Lbl><span style={{ fontSize: 10.5, fontWeight: 700, color: BLUE, background: "#eaf1fd", padding: "2px 9px", borderRadius: 999 }}>Fitness coaching</span></div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {rows.map(([n, w], i) => (
            <div key={n} style={{ display: "grid", gridTemplateColumns: "112px 1fr 40px", alignItems: "center", gap: 10, fontSize: 12 }}>
              <b style={{ color: i === 3 ? BLUE : "#101828" }}>{n}</b>
              <span style={{ height: 9, borderRadius: 6, background: "#eaf1fb", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: q > i ? `${w}%` : "0%", borderRadius: 6, background: i === 3 ? BLUE : "#9fc2f8", transition: "width .9s cubic-bezier(.2,.7,.2,1)" }} /></span>
              <span style={{ textAlign: "right", color: "#5b6675", fontWeight: 600 }}>{q > i ? w : 0}%</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="app-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <Lbl>Top hooks this week</Lbl>
          {hooks.map((h, i) => (
            <Fade key={h} on={q > 3 + i} style={{ marginTop: 8 }}><div style={{ fontSize: 12, fontWeight: 600, color: "#101828", display: "flex", gap: 8 }}><span style={{ color: BLUE }}>{i + 1}</span>{h}</div></Fade>
          ))}
        </Card>
        <Card style={{ background: "#eff5fb" }}>
          <Lbl>Content gap</Lbl>
          <Fade on={q > 7}><div style={{ fontSize: 12.5, fontWeight: 600, color: "#101828", marginTop: 8, lineHeight: 1.45 }}>Nobody posts about meal prep for busy parents. Try it this week.</div>
            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#fff", background: BLUE, borderRadius: 999, padding: "6px 12px" }}>Turn into an idea <Ic n="up" s={11} c="#fff" /></div></Fade>
        </Card>
      </div>
    </div>
  );
}

function DMView({ p }: { p: number }) {
  const q = p % 14;
  const replies = useTween(112 + p * 3), leads = useTween(22 + Math.floor(p / 2));
  const msgs: [string, string, boolean][] = [["@marcus.k", "GUIDE", false], ["Auto reply", "Sent! What do you sell, Marcus?", true], ["@marcus.k", "Online coaching, $297 a month", false], ["Auto reply", "Great fit. Here is a link to book a call.", true]];
  return (
    <div className="app-grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
      <Card style={{ minHeight: 246 }}>
        <Lbl>Instagram DMs · automation live</Lbl>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {msgs.map(([who, t, me], i) => (
            <Fade key={t} on={q > i * 2} style={{ justifySelf: me ? "end" : "start", maxWidth: "82%" }}>
              <div style={{ fontSize: 9.5, color: "#9aa4b2", margin: "0 4px 2px" }}>{who}</div>
              <div style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: 14, background: me ? BLUE : "#f0f3f8", color: me ? "#fff" : "#101828" }}>{t}</div>
            </Fade>
          ))}
          <Fade on={q > 9} style={{ justifySelf: "center" }}><div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #dbe6f7", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, boxShadow: "0 6px 16px rgba(46,120,239,.12)" }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: BLUE, display: "grid", placeItems: "center" }}><Ic n="check" s={10} c="#fff" w={3} /></span><b>Marcus</b> saved to your CRM</div></Fade>
        </div>
      </Card>
      <div style={{ display: "grid", gap: 12 }}>
        <Card><Lbl>Replies today</Lbl><div className="big">{replies}</div></Card>
        <Card><Lbl>New leads</Lbl><div className="big">{leads}</div></Card>
      </div>
    </div>
  );
}

function WebView({ p }: { p: number }) {
  const q = p % 14;
  const reg = useTween(184 + p * 7), live = useTween(76 + Math.round(12 * Math.sin(p / 2)));
  const chat = ["Joined from Instagram", "Can you share the slides?", "Offer is pinned in the room", "Just bought, thank you!"];
  return (
    <div className="app-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
      <Card style={{ minHeight: 246 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Lbl>Live room</Lbl><span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 9px", borderRadius: 999 }}>LIVE</span></div>
        <div style={{ margin: "12px 0", height: 92, borderRadius: 12, background: "linear-gradient(135deg,#dbe9ff,#f3f8ff)", display: "grid", placeItems: "center", color: BLUE, fontWeight: 700, fontSize: 14 }}>Scale to 10K with webinars</div>
        <Fade on={q > 5}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#eaf1fd", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600 }}><span>Offer pinned: Coaching program</span><span style={{ color: BLUE }}>$297</span></div></Fade>
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {chat.map((t, i) => <Fade key={t} on={q > 1 + i * 2}><div style={{ fontSize: 11.5, color: "#414a58" }}><b style={{ color: "#101828" }}>{["Ava", "Leo", "Host", "Priya"][i]}</b> {t}</div></Fade>)}
        </div>
      </Card>
      <div style={{ display: "grid", gap: 12 }}>
        <Card><Lbl>Registered</Lbl><div className="big">{reg}</div></Card>
        <Card><Lbl>In the room now</Lbl><div className="big">{live}</div></Card>
      </div>
    </div>
  );
}

function VidView({ p }: { p: number }) {
  const q = p % 14;
  const v0 = useTween(12400 + p * 180), v1 = useTween(8920 + p * 120), v2 = useTween(5310 + p * 90);
  const views = [v0, v1, v2];
  const rows = ["Launch walkthrough", "Offer explainer", "Client story"];
  const up = Math.min(100, q * 9);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <Lbl>Video Hosting</Lbl>
        <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
          {rows.map((r, i) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e9edf3", borderRadius: 10, padding: "8px 10px" }}>
              <span style={{ width: 44, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#cfe0fb,#eef4fe)", display: "grid", placeItems: "center" }}><Ic n="vid" s={13} c={BLUE} /></span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{r}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#5b6675" }}><Ic n="eye" s={12} />{fmt(views[i])}</span>
              <span style={{ width: 60, height: 6, borderRadius: 4, background: "#eaf1fb", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${[78, 64, 52][i]}%`, background: BLUE, borderRadius: 4 }} /></span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}><span>Uploading "Webinar replay"</span><span style={{ color: BLUE }}>{up}%</span></div>
        <div style={{ height: 8, borderRadius: 6, background: "#eaf1fb", marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${up}%`, background: BLUE, borderRadius: 6, transition: "width .8s ease" }} /></div>
      </Card>
    </div>
  );
}

const TABS = [
  { id: "dash", label: "Dashboard", ic: "dash", sub: "Friday · your brand is moving", V: DashView as any },
  { id: "ideas", label: "AI Ideas", ic: "ideas", sub: "Hooks and scripts for your niche", V: IdeasView },
  { id: "comp", label: "Competitor Study", ic: "comp", sub: "What works in your niche", V: CompView },
  { id: "dm", label: "DM Automation", ic: "dm", sub: "Replies that send themselves", V: DMView },
  { id: "web", label: "Webinars", ic: "web", sub: "Register, present, sell", V: WebView },
  { id: "vid", label: "Video Hosting", ic: "vid", sub: "Share and track every video", V: VidView },
] as const;

const sideBtn = (on: boolean): React.CSSProperties => ({ border: 0, background: on ? undefined : "transparent", textAlign: "left", width: "100%", font: "inherit", cursor: "pointer" });

export function DashMock() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const [tab, setTab] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const [manual, setManual] = useState(0);
  const t0 = useRef(0);
  const tabAt = useRef(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.2 });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!vis) return;
    let raf = 0; const base = performance.now() - t0.current * 1000;
    const loop = (n: number) => { t0.current = (n - base) / 1000; setT(t0.current); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [vis]);
  const go = (i: number) => { setPrev(tab); setTab(i); tabAt.current = t0.current; window.setTimeout(() => setPrev(null), 450); };
  useEffect(() => {
    if (!vis || manual) return;
    const id = setInterval(() => go((tab + 1) % TABS.length), 12000);
    return () => clearInterval(id);
  }, [vis, manual, tab]);
  const pick = (i: number) => { if (i === tab) return; setManual(m => m + 1); go(i); };
  const T = TABS[tab];
  const p = Math.floor((t - tabAt.current) / 0.9);
  const render = (i: number, pp: number, out: boolean) => {
    const V = TABS[i].V as any;
    return <div key={TABS[i].id + (out ? "o" : "i")} style={{ position: out ? "absolute" : "relative", inset: out ? "0 0 auto 0" : undefined, animation: (out ? "mockOut" : "mockIn") + " .45s ease both", pointerEvents: out ? "none" : undefined }}><V p={pp} t={t} /></div>;
  };
  return (
    <div className="app" ref={ref}>
      <div className="app-side">
        <div className="brand"><OraviniMark size={16} />oravini</div>
        {TABS.slice(0, 3).map((x, i) => (
          <button key={x.id} type="button" onClick={() => pick(i)} className={"side-item" + (tab === i ? " active" : "")} style={sideBtn(tab === i)}><Ic n={x.ic} s={15} c={tab === i ? BLUE : "#8a94a3"} />{x.label}</button>
        ))}
        <div className="side-label">Grow</div>
        {TABS.slice(3).map((x, i) => (
          <button key={x.id} type="button" onClick={() => pick(i + 3)} className={"side-item" + (tab === i + 3 ? " active" : "")} style={sideBtn(tab === i + 3)}><Ic n={x.ic} s={15} c={tab === i + 3 ? BLUE : "#8a94a3"} />{x.label}</button>
        ))}
      </div>
      <div className="app-main">
        <div className="app-top">
          <div className="app-greet">{tab === 0 ? "Good afternoon, Aryan" : T.label}<span>{T.sub}</span></div>
          <div className="app-pillbtn">+ Create</div>
        </div>
        <div className="mock-tabs">
          {TABS.map((x, i) => <button key={x.id} type="button" onClick={() => pick(i)} className={tab === i ? "on" : ""}>{x.label}</button>)}
        </div>
        <div style={{ position: "relative", minHeight: 330, paddingBottom: 22 }}>
          {prev !== null && render(prev, p + 1, true)}
          {render(tab, p, false)}
        </div>
      </div>
    </div>
  );
}
