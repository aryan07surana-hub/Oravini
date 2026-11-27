import { MousePointer2, Sparkles, Check, Flame, Play, Link2, Mail, Clock, MousePointerClick } from "lucide-react";

/* Looping product mini-demos. Pure CSS, no video files. Each tells a ~12s story. */

const L = 12; // loop seconds
const EO = "cubic-bezier(.16,1,.3,1)";   // soft ease-out for entrances
const EM = "cubic-bezier(.65,0,.35,1)";  // ease-in-out for cursor moves
const SP = "cubic-bezier(.34,1.56,.64,1)"; // small spring overshoot
type Step = [number, string, string?];
/* keyframes from [seconds, css, easing-to-next] */
const kf = (name: string, steps: Step[]) =>
  `@keyframes ${name}{${steps.map(([s, css, e]) => `${(s / L * 100).toFixed(2)}%{${css}${e ? `;animation-timing-function:${e}` : ""}}`).join("")}}`;
const an = (name: string, extra = "") => `animation:${name} ${L}s infinite both ${extra}`;
const show = (name: string, a: number, b: number, from = "opacity:0;transform:translateY(10px) scale(.97)", e = EO) =>
  kf(name, [[0, from, e], [a, from, e], [a + 0.7, "opacity:1;transform:none"], [b, "opacity:1;transform:none", "ease-in"], [b + 0.6, from], [L, from]]);
const cur = (name: string, pts: [number, number, number][]) =>
  kf(name, pts.map(([s, x, y]) => [s, `left:${x}%;top:${y}%;opacity:1`, EM] as Step));

export const DEMO_CSS = `
@property --n{syntax:'<integer>';initial-value:0;inherits:false}
.dm *{box-sizing:border-box}
.demo{position:relative;height:100%;width:100%;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 0 42.8px rgba(43,47,65,.10);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.demo .bar{height:30px;display:flex;align-items:center;gap:6px;padding:0 12px;border-bottom:1px solid #f0efed;font-size:10px;font-weight:600;color:#141414}
.demo .bar i{width:6px;height:6px;border-radius:50%;background:#dedddb}
.cur{position:absolute;z-index:9;color:#141414;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25));opacity:0}
.a{opacity:0}

/* 1 DM automation */
${show("d1a", .5, 11)}${show("d1b", 3.9, 11)}${show("d1c", 5.4, 11)}${show("d1d", 7.9, 11)}
${kf("d1t", [[0, "opacity:0", "ease"], [2.9, "opacity:0"], [3.2, "opacity:1"], [3.8, "opacity:1"], [4.0, "opacity:0"], [L, "opacity:0"]])}
${kf("d1t2", [[0, "opacity:0"], [7.0, "opacity:0"], [7.2, "opacity:1"], [7.8, "opacity:1"], [8.0, "opacity:0"], [L, "opacity:0"]])}
${kf("d1chip", [[0, "opacity:0;transform:scale(.8)", SP], [2.3, "opacity:0;transform:scale(.8)", SP], [2.8, "opacity:1;transform:scale(1)"], [11, "opacity:1"], [11.6, "opacity:0"], [L, "opacity:0"]])}
${kf("d1cnt", [[0, "--n:0", EO], [8.6, "--n:0", EO], [9.2, "--n:2"], [L, "--n:2"]])}
${kf("d1dot", [[0, "opacity:1"], [1, "opacity:.3"], [2, "opacity:1"], [L, "opacity:1"]])}
${cur("d1cur", [[0, 88, 88], [1.2, 88, 88], [2.2, 36, 36], [2.5, 36, 36], [3.6, 70, 82], [5.2, 70, 82], [6.2, 42, 62], [6.5, 42, 62], [8.5, 80, 90], [10.5, 88, 92], [L, 88, 88]])}
${kf("d1click", [[0, "transform:scale(1)"], [2.3, "transform:scale(1)", "ease"], [2.5, "transform:scale(.8)"], [2.7, "transform:scale(1)"], [L, "transform:scale(1)"]])}

/* 2 Webinar */
${show("w1", .3, 11)}${show("w2", 4.0, 11)}${show("w3", 9.4, 11, "opacity:0;transform:translateX(24px)")}${show("w4", 10.3, 11, "opacity:0;transform:translateX(24px)")}
${kf("wtoast", [[0, "opacity:0;transform:translateY(8px)", EO], [2.6, "opacity:0;transform:translateY(8px)", EO], [3.0, "opacity:1;transform:none"], [3.9, "opacity:1;transform:none"], [4.3, "opacity:0;transform:translateY(-6px)"], [L, "opacity:0"]])}
${kf("wcnt", [[0, "--n:0", EM], [4.2, "--n:0", EM], [9.0, "--n:37"], [L, "--n:37"]])}
${kf("wbar", [[0, "width:0", EM], [4.2, "width:0", EM], [9.0, "width:74%"], [L, "width:74%"]])}
${kf("wav", [[0, "opacity:0;transform:scale(.4)", SP], [4.3, "opacity:0;transform:scale(.4)", SP], [5.0, "opacity:1;transform:none"], [11, "opacity:1"], [11.6, "opacity:0"], [L, "opacity:0"]])}
${kf("wbtn", [[0, "transform:scale(1)"], [2.4, "transform:scale(1)", "ease"], [2.6, "transform:scale(.93)"], [2.85, "transform:scale(1)"], [L, "transform:scale(1)"]])}
${cur("wcur", [[0, 90, 92], [1.0, 90, 92], [2.3, 70, 38], [2.8, 70, 38], [4.0, 88, 95], [L, 90, 92]])}

/* 3 Calendar */
${show("c1", .4, 11, "opacity:0;transform:scale(.8)", SP)}${show("c2", .8, 11, "opacity:0;transform:scale(.8)", SP)}${show("c3", 1.2, 11, "opacity:0;transform:scale(.8)", SP)}
${kf("cdrag", [[0, "opacity:0;left:6%;top:82%", EM], [2.0, "opacity:0;left:6%;top:82%"], [2.2, "opacity:1;left:6%;top:82%", EM], [4.0, "opacity:1;left:40%;top:30%", SP], [4.3, "opacity:1;left:40%;top:30%"], [11, "opacity:1;left:40%;top:30%"], [11.6, "opacity:0;left:40%;top:30%"], [L, "opacity:0"]])}
${kf("cdrag2", [[0, "opacity:0;left:6%;top:82%", EM], [5.4, "opacity:0;left:6%;top:82%"], [5.6, "opacity:1;left:6%;top:82%", EM], [7.4, "opacity:1;left:68%;top:30%", SP], [7.7, "opacity:1;left:68%;top:30%"], [11, "opacity:1;left:68%;top:30%"], [11.6, "opacity:0;left:68%;top:30%"], [L, "opacity:0"]])}
${show("ctag", 4.4, 11, "opacity:0;transform:translateY(4px)")}${show("ctag2", 7.8, 11, "opacity:0;transform:translateY(4px)")}
${kf("cpost", [[0, "background:#2e78ef", "ease"], [9.6, "background:#2e78ef"], [10.0, "background:#141414"], [L, "background:#141414"]])}
${show("cpill", 8.6, 11, "opacity:0;transform:translateY(10px)")}
${cur("ccur", [[0, 10, 88], [2.0, 10, 88], [2.2, 10, 88], [4.0, 44, 38], [4.6, 44, 38], [5.6, 10, 88], [7.4, 72, 38], [8.2, 72, 38], [10, 88, 88], [L, 10, 88]])}

/* 4 Ideas */
${kf("itype", [[0, "width:0", "steps(16,end)"], [.5, "width:0", "steps(16,end)"], [2.3, "width:100%"], [L, "width:100%"]])}
${kf("ibtn", [[0, "transform:scale(1)"], [2.9, "transform:scale(1)", "ease"], [3.1, "transform:scale(.93)"], [3.35, "transform:scale(1)"], [L, "transform:scale(1)"]])}
${kf("ispin", [[0, "opacity:0"], [3.2, "opacity:0"], [3.3, "opacity:1"], [4.3, "opacity:1"], [4.4, "opacity:0"], [L, "opacity:0"]])}
${show("i1", 4.4, 11)}${show("i2", 5.0, 11)}${show("i3", 5.6, 11)}
${kf("isel", [[0, "box-shadow:0 0 0 0 #2e78ef00;background:#f6f5f3", "ease"], [7.3, "box-shadow:0 0 0 0 #2e78ef00;background:#f6f5f3"], [7.6, "box-shadow:0 0 0 1.5px #2e78ef;background:#eff5fb"], [11, "box-shadow:0 0 0 1.5px #2e78ef;background:#eff5fb"], [11.6, "box-shadow:0 0 0 0 #2e78ef00;background:#f6f5f3"], [L, "background:#f6f5f3"]])}
${show("iscript", 8.6, 11, "opacity:0;transform:translateY(10px)")}
${kf("iline", [[0, "width:0", EO], [9.0, "width:0", EO], [10.4, "width:100%"], [L, "width:100%"]])}
${cur("icur", [[0, 90, 90], [1.0, 90, 90], [2.7, 76, 44], [3.5, 76, 44], [5.8, 90, 90], [7.0, 52, 62], [7.8, 52, 62], [9.5, 90, 92], [L, 90, 90]])}

/* 5 Video */
${kf("vplay", [[0, "transform:scale(1);opacity:1", "ease"], [1.0, "transform:scale(1);opacity:1"], [1.2, "transform:scale(.88)"], [1.6, "transform:scale(1.3);opacity:0"], [11.2, "transform:scale(1.3);opacity:0"], [11.6, "transform:scale(1);opacity:1"], [L, "opacity:1"]])}
${kf("vbar", [[0, "width:0", "linear"], [1.6, "width:0", "linear"], [10.6, "width:100%"], [L, "width:100%"]])}
${show("vcta", 5.5, 11, "opacity:0;transform:translateY(14px) scale(.96)")}
${show("vview", 2.0, 11, "opacity:0;transform:translateY(-6px)")}${show("vstat", 8.8, 11, "opacity:0;transform:translateY(-6px)")}
${kf("vview2", [[0, "--n:0", "ease"], [2.0, "--n:12", "ease"], [10.6, "--n:128"], [L, "--n:128"]])}
${kf("vclick", [[0, "transform:scale(1)"], [6.8, "transform:scale(1)", "ease"], [7.0, "transform:scale(.94)"], [7.25, "transform:scale(1)"], [L, "transform:scale(1)"]])}
${cur("vcur", [[0, 80, 90], [.6, 80, 90], [1.1, 50, 46], [1.7, 52, 48], [5.5, 70, 80], [6.8, 66, 62], [7.4, 66, 62], [9.0, 90, 94], [L, 80, 90]])}

/* 6 Streak and goal */
${[0, 1, 2, 3, 4, 5].map(i => kf("s" + i, [[0, "transform:scale(.3);background:#eff5fb", SP], [.6 + i * .6, "transform:scale(.3);background:#eff5fb", SP], [1.1 + i * .6, "transform:scale(1);background:#2e78ef"], [11, "transform:scale(1);background:#2e78ef"], [11.6, "transform:scale(.3);background:#eff5fb"], [L, "transform:scale(.3);background:#eff5fb"]])).join("")}
${kf("scnt", [[0, "--n:0", EM], [.6, "--n:0", EM], [4.0, "--n:6"], [L, "--n:6"]])}
${kf("sfl", [[0, "transform:scale(1)", "ease"], [3.5, "transform:scale(1)", "ease"], [3.9, "transform:scale(1.35) rotate(-8deg)", "ease"], [4.4, "transform:scale(1)"], [L, "transform:scale(1)"]])}
${kf("sgc", [[0, "--n:0", EM], [4.6, "--n:0", EM], [8.4, "--n:62"], [L, "--n:62"]])}
${kf("sgf", [[0, "width:0", EM], [4.6, "width:0", EM], [8.4, "width:62%"], [L, "width:62%"]])}
${show("schip", 8.8, 11, "opacity:0;transform:scale(.8)", SP)}

.cnt{counter-reset:n var(--n)}.cnt::after{content:counter(n)}
.cnt.pc::after{content:counter(n) "%"}
.spinner{width:14px;height:14px;border-radius:50%;border:2px solid #dbe8fb;border-top-color:#2e78ef;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.dm *{animation:none!important;opacity:1!important}}
/* frame capture mode: ?t=SECONDS freezes every demo at that time */
.dm.freeze *{animation-play-state:paused!important;animation-delay:calc(var(--t) * -1s)!important}
`;

const A = (n: string, extra = "") => ({ animation: `${n} ${L}s infinite both ${extra}` } as const);
const Cursor = ({ n }: { n: string }) => <MousePointer2 className="cur w-4 h-4 fill-white" style={A(n)} />;
const Bar = ({ t, right }: { t: string; right?: React.ReactNode }) => (
  <div className="bar"><i /><i /><i /><span className="ml-1">{t}</span><span className="ml-auto">{right}</span></div>
);
const bub = "absolute rounded-2xl px-2.5 py-1.5 text-[10.5px] leading-tight";

export function DmDemo() {
  return (
    <div className="demo">
      <Bar t="DM Automation" right={<span className="inline-flex items-center gap-1 text-[#2e78ef]"><span className="w-1.5 h-1.5 rounded-full bg-[#2e78ef]" style={A("d1dot")} />Live · <b className="cnt font-semibold" style={A("d1cnt")} />&nbsp;leads</span>} />
      <div className={`${bub} left-3 top-[40px] bg-[#f6f5f3] text-[#141414]`} style={A("d1a")}><span className="text-black/40 text-[9px]">@priya.fit</span><br />Send me the link</div>
      <div className="absolute left-[46%] top-[44px] rounded-full bg-[#e6f0f9] text-[#2e78ef] text-[9px] font-semibold px-2 py-1 inline-flex items-center gap-1" style={A("d1chip")}><span style={A("d1click")}><Check className="w-2.5 h-2.5" /></span>Auto-reply</div>
      <div className={`${bub} right-3 top-[78px] bg-[#e6f0f9]`} style={A("d1t")}>
        <span className="flex gap-1">{[0, 1, 2].map(i => <i key={i} className="w-1.5 h-1.5 rounded-full bg-[#2e78ef]/60" style={{ animation: `d1dot 1s ${i * .15}s infinite` }} />)}</span>
      </div>
      <div className={`${bub} right-3 top-[78px] bg-[#2e78ef] text-[#ffffff] max-w-[62%]`} style={A("d1b")}>Hey Priya! Here is the guide you asked for.</div>
      <div className={`${bub} left-3 top-[118px] bg-[#f6f5f3] text-[#141414]`} style={A("d1c")}><span className="text-black/40 text-[9px]">@marcus.coach</span><br />guide pls</div>
      <div className={`${bub} right-3 top-[150px] bg-[#e6f0f9]`} style={A("d1t2")}><span className="flex gap-1">{[0, 1, 2].map(i => <i key={i} className="w-1.5 h-1.5 rounded-full bg-[#2e78ef]/60" style={{ animation: `d1dot 1s ${i * .15}s infinite` }} />)}</span></div>
      <div className={`${bub} right-3 top-[150px] bg-[#2e78ef] text-[#ffffff] max-w-[62%]`} style={A("d1d")}>Hi Marcus, sending it over now.</div>
      <Cursor n="d1cur" />
    </div>
  );
}

export function WebinarDemo() {
  return (
    <div className="demo">
      <Bar t="Webinars" right={<span className="text-black/40">Thu 7:00 PM</span>} />
      <div className="absolute left-4 right-4 top-[40px]" style={A("w1")}>
        <p className="text-[12px] font-semibold text-[#141414] leading-tight">How to sell high-ticket offers live</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 rounded-lg bg-[#f7f7f8] px-2 py-1.5 text-[10px] text-black/45 inline-flex items-center gap-1 truncate"><Link2 className="w-3 h-3" />oravini.com/w/high-ticket</span>
          <span className="rounded-lg bg-[#2e78ef] text-[#ffffff] text-[10px] font-semibold px-2.5 py-1.5" style={A("wbtn")}>Copy</span>
        </div>
      </div>
      <div className="absolute right-4 top-[40px] rounded-full bg-[#141414] text-[#ffffff] text-[10px] px-2.5 py-1" style={A("wtoast")}>Link copied</div>
      <div className="absolute left-4 right-4 top-[96px]" style={A("w2")}>
        <p className="text-[9px] uppercase tracking-wider text-black/40">Registrations</p>
        <p className="cnt text-[34px] font-medium tracking-tight leading-none text-[#141414] mt-0.5" style={A("wcnt")} />
        <div className="mt-2 h-1.5 rounded-full bg-[#eff5fb] overflow-hidden"><div className="h-full rounded-full bg-[#2e78ef]" style={A("wbar")} /></div>
        <div className="flex mt-2.5">{["#cfd8e6", "#b7c9e8", "#9fbbe9", "#88c0fd", "#2e78ef"].map((c, i) => <span key={i} className="w-6 h-6 rounded-full border-2 border-white -ml-1.5 first:ml-0" style={{ background: c, ...A("wav", `${i * .25}s`) }} />)}</div>
      </div>
      <div className="absolute right-3 top-[100px] rounded-lg bg-[#e6f0f9] text-[#2e78ef] text-[9.5px] font-semibold px-2 py-1 inline-flex items-center gap-1" style={A("w3")}><Mail className="w-3 h-3" />Reminder sent</div>
      <div className="absolute right-3 top-[126px] rounded-lg bg-[#e6f0f9] text-[#2e78ef] text-[9.5px] font-semibold px-2 py-1 inline-flex items-center gap-1" style={A("w4")}><Clock className="w-3 h-3" />Follow-up queued</div>
      <Cursor n="wcur" />
    </div>
  );
}

export function CalendarDemo() {
  const d = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const chip = "absolute rounded-md text-[#ffffff] text-[8.5px] font-medium px-1.5 py-1 text-center";
  return (
    <div className="demo">
      <Bar t="Content Scheduler" right={<span className="text-black/40">This week</span>} />
      <div className="absolute left-3 right-3 top-[40px] bottom-[34px] grid grid-cols-7 gap-1">
        {d.map((x, i) => (
          <div key={i} className="rounded-lg bg-[#f6f5f3] relative px-1 pt-1"><p className="text-[8.5px] text-black/40">{x}</p>
            {i === 0 && <div className={`${chip} left-1 right-1 top-[18px] bg-[#88c0fd]`} style={A("c1")}>Tip</div>}
            {i === 1 && <div className={`${chip} left-1 right-1 top-[36px] bg-[#88c0fd]`} style={A("c2")}>Story</div>}
            {i === 3 && <div className={`${chip} left-1 right-1 top-[18px] bg-[#88c0fd]`} style={A("c3")}>Reel</div>}
            {i === 2 && <div className="absolute left-0 right-0 bottom-1 text-center text-[8px] font-semibold text-[#2e78ef]" style={A("ctag")}>7:00 PM</div>}
            {i === 4 && <div className="absolute left-0 right-0 bottom-1 text-center text-[8px] font-semibold text-[#2e78ef]" style={A("ctag2")}>9:00 AM</div>}
          </div>
        ))}
      </div>
      <div className="absolute w-[11%] z-[5] rounded-md text-[#ffffff] text-[8.5px] font-medium px-1 py-1 text-center bg-[#2e78ef]" style={{ ...A("cdrag"), marginLeft: 0, ["--x" as any]: 0 }}><span style={A("cpost")} className="absolute inset-0 rounded-md" /><span className="relative">Reel</span></div>
      <div className="absolute w-[11%] z-[5] rounded-md text-[#ffffff] text-[8.5px] font-medium px-1 py-1 text-center bg-[#2e78ef]" style={A("cdrag2")}>Post</div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 rounded-full bg-[#141414] text-[#ffffff] text-[9.5px] font-medium px-3 py-1 inline-flex items-center gap-1" style={A("cpill")}><Check className="w-3 h-3" />2 posts queued</div>
      <Cursor n="ccur" />
    </div>
  );
}

export function IdeasDemo() {
  const card = "relative rounded-lg bg-[#f6f5f3] px-2.5 py-1.5 text-[10.5px] text-[#141414] font-medium";
  return (
    <div className="demo">
      <Bar t="Content Ideas" />
      <div className="absolute left-3 right-3 top-[40px] flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-[#f7f7f8] px-2.5 py-1.5 text-[10.5px] text-black/60 overflow-hidden whitespace-nowrap"><div className="overflow-hidden whitespace-nowrap" style={A("itype")}>Fitness coaching</div></div>
        <span className="rounded-lg bg-[#141414] text-[#ffffff] text-[10px] font-semibold px-2.5 py-1.5 inline-flex items-center gap-1" style={A("ibtn")}><Sparkles className="w-3 h-3" />Generate</span>
      </div>
      <div className="absolute right-4 top-[76px]" style={A("ispin")}><div className="spinner" /></div>
      <div className="absolute left-3 right-3 top-[74px] space-y-1.5">
        <div className={card} style={{ ...A("i1"), ...A("i1"), }}><span style={A("isel")} className="absolute inset-0 rounded-lg" /><span className="relative">Stop doing 100 crunches. Do this.</span></div>
        <div className={card} style={A("i2")}>3 mistakes killing your reach</div>
        <div className={card} style={A("i3")}>Why your hook fails in 2 seconds</div>
      </div>
      <div className="absolute left-3 right-3 bottom-3 rounded-lg bg-[#eff5fb] p-2" style={A("iscript")}>
        <p className="text-[8.5px] uppercase tracking-wider text-[#2e78ef] font-semibold mb-1.5">Script ready</p>
        <div className="h-1.5 rounded bg-[#2e78ef]/40 mb-1" style={A("iline")} /><div className="h-1.5 rounded bg-[#2e78ef]/25 w-3/4" />
      </div>
      <Cursor n="icur" />
    </div>
  );
}

export function VideoDemo() {
  return (
    <div className="demo" style={{ background: "linear-gradient(160deg,#2a3a5e,#141414)" }}>
      <div className="absolute left-3 top-3 rounded-full bg-white/15 text-[#ffffff] text-[9.5px] px-2 py-1" style={A("vview")}><span className="cnt" style={A("vview2")} /> watching</div>
      <div className="absolute right-3 top-3 rounded-full bg-[#2e78ef] text-[#ffffff] text-[9.5px] font-semibold px-2 py-1" style={A("vstat")}>42 clicks</div>
      <div className="absolute inset-0 flex items-center justify-center"><span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center" style={A("vplay")}><Play className="w-5 h-5 text-[#141414] fill-[#141414] ml-0.5" /></span></div>
      <div className="absolute left-4 right-4 bottom-[64px] rounded-xl bg-white p-2 flex items-center justify-between gap-2" style={A("vcta")}>
        <span className="text-[10.5px] font-semibold text-[#141414]">Ready to start?</span>
        <span className="rounded-lg bg-[#2e78ef] text-[#ffffff] text-[10px] font-semibold px-2.5 py-1.5" style={A("vclick")}>Book a call</span>
      </div>
      <div className="absolute left-4 right-4 bottom-4">
        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-[#2e78ef]" style={A("vbar")} /></div>
        <div className="flex justify-between mt-2 text-[9.5px] text-[rgba(255,255,255,0.6)]"><span>Your VSL</span><span>Plays everywhere</span></div>
      </div>
      <Cursor n="vcur" />
    </div>
  );
}

export function StreakDemo() {
  return (
    <div className="demo">
      <Bar t="Streak and goals" />
      <div className="absolute left-4 right-4 top-[42px]">
        <div className="flex items-center gap-2"><Flame className="w-6 h-6 text-[#2e78ef]" style={{ ...A("sfl"), transformOrigin: "50% 70%" }} /><span className="cnt text-[30px] font-medium tracking-tight leading-none text-[#141414]" style={A("scnt")} /><span className="text-[11px] text-black/50">day streak</span></div>
        <div className="flex gap-1.5 mt-3">{[0, 1, 2, 3, 4, 5, 6].map(i => <span key={i} className="h-2 flex-1 rounded-full bg-[#eff5fb]" style={i < 6 ? A("s" + i) : undefined} />)}</div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-black/50 mb-1"><span>Income goal</span><span className="cnt pc font-medium text-[#141414]" style={A("sgc")} /></div>
          <div className="h-2 rounded-full bg-[#eff5fb] overflow-hidden"><div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#88c0fd,#2e78ef)", ...A("sgf") }} /></div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#e6f0f9] text-[#2e78ef] text-[10px] font-semibold px-2.5 py-1" style={A("schip")}><Check className="w-3 h-3" />On track</div>
      </div>
    </div>
  );
}
