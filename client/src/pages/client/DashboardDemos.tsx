import { MousePointer2, Sparkles, Check, Flame, Play } from "lucide-react";

/* Small looping product mini-demos. Pure CSS/SVG, no video files. Each loops every 6s. */

export const DEMO_CSS = `
@property --n{syntax:'<integer>';initial-value:0;inherits:false}
.dm{--loop:6s}
.dm *{box-sizing:border-box}
.demo{position:relative;height:100%;width:100%;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0px 0px 42.8px rgba(43,47,65,0.10)}
.cur{position:absolute;color:#141414;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}
.pill{border-radius:999px;font-size:11px;font-weight:600;padding:3px 10px}

/* 1. DM automation: comment -> DM */
@keyframes dmC{0%,6%{opacity:0;transform:translateY(8px)}12%,88%{opacity:1;transform:none}96%,100%{opacity:0}}
@keyframes dmArrow{0%,30%{opacity:0;transform:scaleX(0)}40%,88%{opacity:1;transform:scaleX(1)}96%,100%{opacity:0}}
@keyframes dmD{0%,44%{opacity:0;transform:translateY(8px) scale(.97)}52%,88%{opacity:1;transform:none}96%,100%{opacity:0}}
@keyframes dmCur{0%{left:78%;top:78%}20%{left:32%;top:30%}30%{left:32%;top:30%}60%{left:70%;top:80%}100%{left:78%;top:78%}}
.dm1-c{animation:dmC var(--loop) infinite cubic-bezier(.16,1,.3,1)}
.dm1-a{transform-origin:left;animation:dmArrow var(--loop) infinite cubic-bezier(.16,1,.3,1)}
.dm1-d{animation:dmD var(--loop) infinite cubic-bezier(.16,1,.3,1)}
.dm1-cur{animation:dmCur var(--loop) infinite ease-in-out}

/* 2. Webinar: registrations ticking up */
@keyframes cnt{0%,8%{--n:0}70%,100%{--n:37}}
@keyframes av{0%,10%{opacity:0;transform:scale(.6)}20%,90%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes bar{0%,8%{width:0}70%,100%{width:74%}}
.wb-n{animation:cnt var(--loop) infinite cubic-bezier(.16,1,.3,1);counter-reset:n var(--n)}
.wb-n::after{content:counter(n)}
.wb-bar{animation:bar var(--loop) infinite cubic-bezier(.16,1,.3,1)}
.wb-av{animation:av var(--loop) infinite cubic-bezier(.16,1,.3,1);opacity:0}

/* 3. Calendar: post gets scheduled */
@keyframes chip{0%,12%{opacity:0;transform:translate(-30px,-26px) scale(.9)}34%{opacity:1;transform:translate(0,0)}90%{opacity:1}98%,100%{opacity:0}}
@keyframes tag{0%,38%{opacity:0;transform:translateY(4px)}46%,90%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes calCur{0%{left:20%;top:18%}12%{left:34%;top:30%}34%{left:58%;top:56%}50%{left:62%;top:60%}100%{left:80%;top:84%}}
.cal-chip{animation:chip var(--loop) infinite cubic-bezier(.16,1,.3,1);opacity:0}
.cal-tag{animation:tag var(--loop) infinite cubic-bezier(.16,1,.3,1);opacity:0}
.cal-cur{animation:calCur var(--loop) infinite ease-in-out}

/* 4. Content ideas: hook generated */
@keyframes typ{0%,24%{width:0}60%,100%{width:100%}}
@keyframes press{0%,14%{transform:none}18%{transform:scale(.94)}24%,100%{transform:none}}
@keyframes ideaCur{0%{left:70%;top:75%}12%{left:74%;top:34%}22%{left:74%;top:34%}40%{left:86%;top:82%}100%{left:86%;top:82%}}
@keyframes spk{0%,18%{opacity:.3;transform:rotate(0)}24%{opacity:1;transform:rotate(90deg)}100%{opacity:1;transform:rotate(90deg)}}
@keyframes show{0%,22%{opacity:0}28%,100%{opacity:1}}
.id-t{overflow:hidden;white-space:nowrap;animation:typ var(--loop) infinite steps(34,end)}
.id-b{animation:press var(--loop) infinite ease-in-out}
.id-cur{animation:ideaCur var(--loop) infinite ease-in-out}
.id-s{animation:spk var(--loop) infinite ease-in-out}
.id-show{animation:show var(--loop) infinite}

/* 5. Video hosting: player progress */
@keyframes vp{0%{width:4%}18%{width:34%}50%{width:50%}70%{width:78%}100%{width:100%}}
@keyframes vpl{0%,6%{transform:scale(1);opacity:1}10%{transform:scale(.9)}16%,100%{transform:scale(1);opacity:0}}
.vp-bar{animation:vp var(--loop) infinite linear}
.vp-play{animation:vpl var(--loop) infinite ease-out}

/* 6. Streak + goal */
@keyframes gf{0%,6%{width:0}60%,100%{width:62%}}
@keyframes fl{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes dayp{0%,100%{opacity:.35}50%{opacity:1}}
.gl-f{animation:gf var(--loop) infinite cubic-bezier(.16,1,.3,1)}
.gl-fl{animation:fl 2.4s infinite ease-in-out;transform-origin:50% 70%}
.gl-d{animation:dayp 3s infinite ease-in-out}
@media (prefers-reduced-motion:reduce){.dm *{animation:none!important;opacity:1!important}}
/* frame capture mode: ?t=SECONDS freezes every demo at that time */
.dm.freeze *{animation-play-state:paused!important;animation-delay:calc(var(--t) * -1s)!important}
`;

const ink = "text-[#141414]";

export function DmDemo() {
  return (
    <div className="demo">
      <div className="absolute left-5 top-5 dm1-c flex items-center gap-2 rounded-2xl bg-[#f6f5f3] px-3 py-2">
        <span className="w-6 h-6 rounded-full bg-[#cfd8e6]" />
        <div><p className="text-[10px] text-black/40 leading-none">@priya.fit commented</p><p className={`text-xs font-medium ${ink} mt-1`}>Send me the link</p></div>
      </div>
      <div className="absolute left-[46%] top-[42%] h-[2px] w-12 bg-[#2e78ef] dm1-a rounded" />
      <div className="absolute right-5 bottom-5 dm1-d max-w-[60%] rounded-2xl rounded-br-md bg-[#2e78ef] px-3 py-2">
        <p className="text-[10px] text-[rgba(255,255,255,0.7)] leading-none">Auto DM sent</p>
        <p className="text-xs text-[#ffffff] mt-1">Hey Priya! Here is the guide you asked for.</p>
      </div>
      <MousePointer2 className="cur dm1-cur w-4 h-4 fill-white" />
    </div>
  );
}

export function WebinarDemo() {
  return (
    <div className="demo p-5 flex flex-col justify-center">
      <p className="text-[10px] uppercase tracking-wider text-black/40">Registrations</p>
      <p className={`wb-n text-[40px] font-medium tracking-tight leading-none mt-1 ${ink}`} />
      <div className="mt-4 h-2 rounded-full bg-[#eff5fb] overflow-hidden"><div className="wb-bar h-full rounded-full bg-[#2e78ef]" /></div>
      <div className="flex mt-4">
        {["#cfd8e6", "#b7c9e8", "#9fbbe9", "#88c0fd", "#2e78ef"].map((c, i) => (
          <span key={i} className="wb-av w-7 h-7 rounded-full border-2 border-white -ml-2 first:ml-0" style={{ background: c, animationDelay: `${i * 0.35}s` }} />
        ))}
        <span className="ml-3 text-[11px] text-black/50 self-center">+ new signups</span>
      </div>
    </div>
  );
}

export function CalendarDemo() {
  const d = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="demo p-4">
      <div className="grid grid-cols-7 gap-1.5 h-full">
        {d.map((x, i) => (
          <div key={i} className="rounded-lg bg-[#f6f5f3] relative px-1.5 pt-1.5">
            <p className="text-[9px] text-black/40">{x}</p>
            {i === 2 && (<>
              <div className="cal-chip absolute left-1 right-1 top-6 rounded-md bg-[#2e78ef] text-[#ffffff] text-[9px] font-medium px-1.5 py-1 text-center">Reel</div>
              <div className="cal-tag absolute left-1 right-1 bottom-2 text-center text-[9px] font-semibold text-[#2e78ef] flex items-center justify-center gap-0.5"><Check className="w-2.5 h-2.5" />Set</div>
            </>)}
          </div>
        ))}
      </div>
      <MousePointer2 className="cur cal-cur w-4 h-4 fill-white" />
    </div>
  );
}

export function IdeasDemo() {
  return (
    <div className="demo p-5 flex flex-col justify-center gap-3">
      <div className="rounded-xl bg-[#f6f5f3] px-3 py-2.5 text-xs text-black/50">Niche: fitness coaching</div>
      <button className="id-b self-start inline-flex items-center gap-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-medium px-4 py-2"><Sparkles className="id-s w-3.5 h-3.5" />Generate</button>
      <div className="id-show rounded-xl bg-[#eff5fb] px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-wider text-[#2e78ef] font-semibold mb-1">Hook</p>
        <div className="id-t text-xs font-medium text-[#141414]">Stop doing 100 crunches. Do this instead.</div>
      </div>
      <MousePointer2 className="cur id-cur w-4 h-4 fill-white" />
    </div>
  );
}

export function VideoDemo() {
  return (
    <div className="demo bg-[#141414]" style={{ background: "linear-gradient(160deg,#1f2a44,#141414)" }}>
      <div className="absolute inset-0 flex items-center justify-center"><span className="vp-play w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-5 h-5 text-[#141414] fill-[#141414] ml-0.5" /></span></div>
      <div className="absolute left-4 right-4 bottom-4">
        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden"><div className="vp-bar h-full rounded-full bg-[#2e78ef]" /></div>
        <div className="flex justify-between mt-2 text-[10px] text-[rgba(255,255,255,0.6)]"><span>Your VSL</span><span>Plays everywhere</span></div>
      </div>
    </div>
  );
}

export function StreakDemo() {
  return (
    <div className="demo p-5 flex flex-col justify-center gap-3">
      <div className="flex items-center gap-2"><Flame className="gl-fl w-6 h-6 text-[#2e78ef]" /><span className={`text-[28px] font-medium tracking-tight leading-none ${ink}`}>6</span><span className="text-xs text-black/50">day streak</span></div>
      <div className="flex gap-1.5">{[0,1,2,3,4,5,6].map(i => <span key={i} className={`h-2 flex-1 rounded-full ${i < 6 ? "bg-[#2e78ef] gl-d" : "bg-[#eff5fb]"}`} style={{ animationDelay: `${i * 0.25}s` }} />)}</div>
      <div><div className="flex justify-between text-[10px] text-black/50 mb-1"><span>Income goal</span><span>62%</span></div>
        <div className="h-2 rounded-full bg-[#eff5fb] overflow-hidden"><div className="gl-f h-full rounded-full bg-[#2e78ef]" /></div></div>
    </div>
  );
}
