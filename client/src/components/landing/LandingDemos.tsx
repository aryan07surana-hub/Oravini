// Looping, scroll-triggered activity cards for the landing bento. Every state is filled: nothing sits empty.
// Each card ticks only while it is on screen. Video card keeps the original CSS loop.
import { useEffect, useRef, useState, type ReactNode } from "react";

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

const CSS = `
.ad{width:100%;height:100%;border-radius:18px;background:#fff;border:1px solid #e3ebf7;box-shadow:0 18px 40px -22px rgba(46,120,239,.45),0 3px 8px -4px rgba(16,24,40,.08);display:flex;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif;text-align:left;position:relative}
.ad-bar{flex:none;height:34px;display:flex;align-items:center;gap:5px;padding:0 12px;border-bottom:1px solid #eef2f9;font-size:11px;font-weight:600;color:#101828}
.ad-bar i{width:6px;height:6px;border-radius:50%;background:#d5deee}
.ad-bar .t{margin-left:5px}.ad-bar .r{margin-left:auto;font-weight:600;color:#2e78ef;display:inline-flex;align-items:center;gap:5px}
.ad-live{width:6px;height:6px;border-radius:50%;background:#2e78ef;animation:ad-pulse 1.4s infinite}
.ad-body{flex:1;min-height:0;position:relative;padding:10px 12px;display:flex;flex-direction:column;gap:6px;justify-content:flex-end}
.ad-foot{flex:none;display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-top:1px solid #eef2f9;background:#f8fbff;font-size:10px;color:#5b6575}
.ad-foot b{color:#101828;font-weight:700}
.ad-m{max-width:78%;font-size:10.5px;line-height:1.35;padding:6px 10px;border-radius:14px;animation:ad-rise .35s ease both}
.ad-m small{display:block;font-size:8.5px;font-weight:700;color:#2e78ef;margin-bottom:1px}
.ad-in{align-self:flex-start;background:#f1f5fb;color:#101828;border-bottom-left-radius:4px}
.ad-out{align-self:flex-end;background:#2e78ef;color:#fff;border-bottom-right-radius:4px}
.ad-dots{display:inline-flex;gap:3px;padding:3px 0}.ad-dots i{width:5px;height:5px;border-radius:50%;background:#fff;opacity:.5;animation:ad-dot 1s infinite}
.ad-dots i:nth-child(2){animation-delay:.15s}.ad-dots i:nth-child(3){animation-delay:.3s}
.ad-lead{align-self:center;display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:600;color:#1d4ba8;background:#eaf2fe;border:1px solid #cfe0fb;border-radius:99px;padding:3px 10px;animation:ad-pop .4s ease both}
.ad-idea{display:flex;align-items:center;gap:8px;border-radius:10px;background:#f6f9fe;border:1px solid #e8eef8;padding:6px 9px;font-size:10.5px;color:#101828;font-weight:500;animation:ad-rise .35s ease both}
.ad-idea em{font-style:normal;flex:none;font-size:8.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#2e78ef;background:#e4eeff;border-radius:6px;padding:2px 6px}
.ad-idea span{margin-left:auto;flex:none;font-weight:700;color:#2e78ef;font-size:10px}
.ad-input{display:flex;gap:8px;align-items:center;margin-bottom:2px}
.ad-field{flex:1;border-radius:9px;background:#f4f7fc;border:1px solid #e6edf8;padding:6px 10px;font-size:10.5px;color:#475467}
.ad-btn{flex:none;border-radius:9px;background:#2e78ef;color:#fff;font-size:10px;font-weight:700;padding:7px 12px;display:inline-flex;align-items:center;gap:5px;transition:background .2s}
.ad-btn.busy{background:#4f93ff}
.ad-cal{flex:1;display:grid;grid-template-columns:26px repeat(7,1fr);grid-template-rows:14px repeat(3,1fr);gap:4px;padding:8px 12px 4px}
.ad-cal .h{font-size:8.5px;font-weight:700;color:#8a96aa;text-align:center;align-self:center}
.ad-cal .rl{font-size:8px;color:#8a96aa;align-self:center}
.ad-cal .c{position:relative;border-radius:7px;background:#f4f7fc;border:1px dashed #e1e9f6}
.ad-chip{position:absolute;inset:2px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;animation:ad-drop .5s cubic-bezier(.2,.9,.3,1.2) both}
.ad-pill{display:inline-flex;align-items:center;gap:5px;background:#1d4ba8;color:#fff;border-radius:99px;padding:4px 11px;font-size:9.5px;font-weight:600;animation:ad-pop .3s ease both}
.ad-av{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:8.5px;font-weight:700;color:#fff;border:2px solid #fff;flex:none;animation:ad-pop .35s ease both}
.ad-row{display:flex;align-items:center;gap:8px;border-radius:10px;background:#f6f9fe;border:1px solid #e8eef8;padding:5px 9px;font-size:10px;color:#101828;animation:ad-rise .35s ease both}
.ad-row small{margin-left:auto;color:#8a96aa;font-size:9px}
.ad-track{height:7px;border-radius:99px;background:#eaf0fa;overflow:hidden}.ad-track>div{height:100%;border-radius:99px;background:linear-gradient(90deg,#88b8ff,#2e78ef);transition:width .9s ease}
.ad-big{font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1;color:#101828}
.ad-dayd{width:100%;aspect-ratio:1;border-radius:6px;background:#eaf0fa;transition:background .3s,transform .3s}
.ad-dayd.on{background:#2e78ef}.ad-dayd.now{background:#2e78ef;animation:ad-pulse 1.4s infinite}
@keyframes ad-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes ad-pop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
@keyframes ad-drop{from{opacity:0;transform:translateY(-26px) scale(.8)}to{opacity:1;transform:none}}
@keyframes ad-dot{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
@keyframes ad-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.18)}}
`;

function Shell({ title, right, children, foot, rf }: { title: string; right?: ReactNode; children: ReactNode; foot?: ReactNode; rf: React.Ref<HTMLDivElement> }) {
  return (
    <div className="ad" ref={rf}>
      <style>{CSS}</style>
      <div className="ad-bar"><i /><i /><i /><span className="t">{title}</span>{right && <span className="r">{right}</span>}</div>
      {children}
      {foot && <div className="ad-foot">{foot}</div>}
    </div>
  );
}

type DM = { k: "in" | "out" | "typing" | "lead"; h?: string; t: string };
const DM_SCRIPT: DM[] = [
  { k: "in", h: "@priya.fit", t: "Send me the link" },
  { k: "typing", t: "" },
  { k: "out", t: "Hey Priya! Here is the free hook guide. Tap to open it." },
  { k: "lead", t: "Priya saved to your CRM" },
  { k: "in", h: "@marcus.k", t: "GUIDE" },
  { k: "typing", t: "" },
  { k: "out", t: "Sent! What do you sell, Marcus?" },
  { k: "lead", t: "Marcus tagged as warm lead" },
  { k: "in", h: "@jess.coach", t: "how much is it?" },
  { k: "typing", t: "" },
  { k: "out", t: "Plans start free. Want the link?" },
  { k: "lead", t: "Jess saved to your CRM" },
];
export function DMDemo() {
  const { ref, i } = useLoop(DM_SCRIPT.length + 2, 1100, 7, 4);
  const vis = DM_SCRIPT.slice(0, i + 1).filter((m, idx, a) => m.k !== "typing" || idx === a.length - 1).slice(-4);
  const leads = 24 + DM_SCRIPT.slice(0, i + 1).filter(m => m.k === "lead").length;
  const sent = 118 + Math.min(i, DM_SCRIPT.length) * 2;
  return (
    <Shell rf={ref} title="DM Automation" right={<><span className="ad-live" />Live</>}
      foot={<><span>Replies sent <b>{sent}</b></span><span>Leads today <b>{leads}</b></span></>}>
      <div className="ad-body">
        {vis.map((m, idx) => {
          const key = DM_SCRIPT.indexOf(m);
          if (m.k === "typing") return <div key={key} className="ad-m ad-out"><span className="ad-dots"><i /><i /><i /></span></div>;
          if (m.k === "lead") return <div key={key} className="ad-lead"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2e78ef" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>{m.t}</div>;
          return <div key={key} className={`ad-m ${m.k === "in" ? "ad-in" : "ad-out"}`}>{m.h && <small>{m.h}</small>}{m.t}</div>;
        })}
      </div>
    </Shell>
  );
}

const IDEAS = [
  { g: "Hook", t: "3 mistakes every new coach makes", s: 92 },
  { g: "Reel", t: "Day in my life as a fitness coach", s: 88 },
  { g: "Carousel", t: "5 meals under 400 calories", s: 85 },
  { g: "Story", t: "Poll: gym or home workouts?", s: 81 },
  { g: "Hook", t: "Why you plateau at week 6", s: 79 },
];
export function IdeasDemo() {
  const { ref, i } = useLoop(9, 1000, 5, 0);
  const n = Math.min(i + 1, IDEAS.length);
  const busy = i < IDEAS.length - 1;
  return (
    <Shell rf={ref} title="Content Ideas" right={<>{n} of 30 ideas</>}
      foot={<><span>Niche <b>Fitness coaching</b></span><span>Saved <b>{Math.max(0, n - 1)}</b></span></>}>
      <div className="ad-body" style={{ justifyContent: "flex-start" }}>
        <div className="ad-input"><div className="ad-field">Fitness coaching</div><div className={`ad-btn${busy ? " busy" : ""}`}>{busy ? "Generating..." : "Generate"}</div></div>
        {IDEAS.slice(0, n).slice(-4).map(d => <div className="ad-idea" key={d.t}><em>{d.g}</em>{d.t}<span>{d.s}</span></div>)}
      </div>
    </Shell>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["9 AM", "12 PM", "7 PM"];
const POSTS = [
  { d: 0, r: 0, k: "Reel", c: "#2e78ef" }, { d: 2, r: 2, k: "Story", c: "#6aa6ff" }, { d: 1, r: 1, k: "Carousel", c: "#1d4ba8" },
  { d: 3, r: 0, k: "Reel", c: "#2e78ef" }, { d: 4, r: 1, k: "Photo", c: "#4f93ff" }, { d: 5, r: 2, k: "Reel", c: "#2e78ef" }, { d: 6, r: 0, k: "Story", c: "#6aa6ff" },
];
export function SchedulerDemo() {
  const { ref, i } = useLoop(POSTS.length + 3, 1000, 5, 1);
  const n = Math.min(i + 1, POSTS.length);
  const cells = [];
  DAYS.forEach((d, c) => cells.push(<div className="h" key={"h" + c} style={{ gridColumn: c + 2, gridRow: 1 }}>{d}</div>));
  SLOTS.forEach((s, r) => cells.push(<div className="rl" key={"r" + r} style={{ gridColumn: 1, gridRow: r + 2 }}>{s}</div>));
  SLOTS.forEach((_, r) => DAYS.forEach((_, c) => {
    const pi = POSTS.slice(0, n).findIndex(p => p.d === c && p.r === r);
    const p = pi >= 0 ? POSTS[pi] : null;
    cells.push(<div className="c" key={`c${r}${c}`} style={{ gridColumn: c + 2, gridRow: r + 2 }}>{p && <div className="ad-chip" style={{ background: p.c }}>{p.k}</div>}</div>);
  }));
  return (
    <Shell rf={ref} title="Content Scheduler" right={<span style={{ color: "#8a96aa" }}>This week</span>}
      foot={<><span className="ad-pill" key={n}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>{n} posts queued</span><span>Next post <b>{SLOTS[POSTS[Math.max(0, n - 1)].r]}</b></span></>}>
      <div className="ad-cal">{cells}</div>
    </Shell>
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


const PEOPLE = [
  { n: "Aria", c: "#2e78ef" }, { n: "Noah", c: "#4f93ff" }, { n: "Mia", c: "#1d4ba8" }, { n: "Leo", c: "#6aa6ff" },
  { n: "Zoe", c: "#2e78ef" }, { n: "Kai", c: "#1d4ba8" }, { n: "Eva", c: "#4f93ff" }, { n: "Sam", c: "#2e78ef" },
];
export function WebinarDemo() {
  const { ref, i } = useLoop(11, 1000, 6, 1);
  const regs = 37 + i * 2;
  const joined = PEOPLE.slice(0, Math.min(PEOPLE.length, i + 2));
  const feed = joined.slice(-1);
  const copied = i % 5 === 2;
  return (
    <Shell rf={ref} title="Webinars" right={<span style={{ color: "#8a96aa" }}>Thu 7:00 PM</span>}
      foot={<><span>Show-up rate <b>{Math.min(64, 41 + i * 2)}%</b></span><span>Starts in <b>2d 4h</b></span></>}>
      <div className="ad-body" style={{ justifyContent: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#101828" }}>How to sell high-ticket offers live</div>
        <div className="ad-input" style={{ margin: 0 }}><div className="ad-field">oravini.com/w/high-ticket</div><div className="ad-btn" style={copied ? { background: "#1d4ba8" } : undefined}>{copied ? "Copied" : "Copy"}</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div><div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".08em", color: "#8a96aa" }}>REGISTRATIONS</div><div className="ad-big">{regs}</div></div>
          <div style={{ display: "flex", marginLeft: "auto" }}>
            {joined.slice(-5).map((p, k) => <span className="ad-av" key={p.n} style={{ background: p.c, marginLeft: k ? -7 : 0 }}>{p.n[0]}</span>)}
            <span className="ad-av" style={{ background: "#eaf2fe", color: "#2e78ef", marginLeft: -7 }}>+{regs - 5}</span>
          </div>
        </div>
        <div className="ad-track"><div style={{ width: `${Math.min(100, (regs / 70) * 100)}%` }} /></div>
        {feed.map(p => <div className="ad-row" key={p.n}><span className="ad-av" style={{ background: p.c, width: 18, height: 18, fontSize: 8, animation: "none" }}>{p.n[0]}</span>{p.n} just registered<small>now</small></div>)}
      </div>
    </Shell>
  );
}

export function StreakDemo() {
  const { ref, i } = useLoop(9, 1000, 5, 0);
  const pct = Math.min(68, 44 + i * 4);
  const posts = Math.min(5, 3 + Math.floor(i / 3));
  return (
    <Shell rf={ref} title="Streak and goals" right={<>Best 21 days</>}
      foot={<><span>Posts this week <b>{posts} / 5</b></span><span>Creator score <b>84</b></span></>}>
      <div className="ad-body" style={{ justifyContent: "flex-start", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" style={{ animation: "ad-pulse 1.6s infinite" }}><path d="M12 2c1.2 3.2-1.8 4.6-1.8 7 0 1.4 1 2.4 2.3 2.4 1.8 0 2.6-1.6 2.2-3.4 2.4 1.6 3.6 4 3.6 6.4A6.3 6.3 0 0 1 12 20.8 6.3 6.3 0 0 1 5.7 14.4C5.7 9 10.5 7.4 12 2z" fill="#2e78ef" /></svg>
          <span className="ad-big">12</span><span style={{ fontSize: 11, color: "#5b6575" }}>day streak</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(14,1fr)", gap: 4 }}>
          {Array.from({ length: 14 }).map((_, k) => <div key={k} className={`ad-dayd${k < 11 ? " on" : k === 11 ? " now" : ""}`} />)}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5b6575", marginBottom: 4 }}><span>Income goal</span><b style={{ color: "#101828" }}>{pct}%</b></div>
          <div className="ad-track" style={{ height: 8 }}><div style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="ad-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2e78ef" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>Next up: post today's reel to keep the streak<small>9 AM</small></div>
      </div>
    </Shell>
  );
}
