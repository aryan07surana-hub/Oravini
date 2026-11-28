import { useEffect, useRef, useState } from "react";

type Step = { t: string; s?: string };
type Flow = { tag: string; title: string; body: string; steps: Step[]; result: string };

const FLOWS: Flow[] = [
  { tag: "DM Automation", title: "Set up once, reply forever", body: "Pick a reel, choose a keyword, write the reply. Oravini does the rest.",
    steps: [{ t: "Pick a reel", s: "Any post or story" }, { t: "Choose a keyword", s: "\"GUIDE\"" }, { t: "Write your reply", s: "With your link" }, { t: "Go live", s: "Replies in seconds" }], result: "Lead saved to your CRM" },
  { tag: "AI Setter", title: "A setter that never sleeps", body: "It answers new DMs, asks the right questions and books the call.",
    steps: [{ t: "New DM arrives", s: "\"How much is coaching?\"" }, { t: "AI qualifies", s: "Goal, budget, timing" }, { t: "Shares your link", s: "Calendar opens" }, { t: "Call booked", s: "Tue, 4:30 PM" }], result: "Booked while you slept" },
  { tag: "Webinars", title: "Register, present, sell", body: "A registration page, live room and offer, all in one flow.",
    steps: [{ t: "Page is built", s: "Pick a template" }, { t: "Attendees register", s: "Reminders sent" }, { t: "Go live", s: "Offer pinned in room" }, { t: "Replay sent", s: "To everyone who missed" }], result: "+$297 sale in the chat" },
  { tag: "Content Coach", title: "Learn what works for you", body: "The coach reads your reels, finds your winners and plans what to post next.",
    steps: [{ t: "Reels come in", s: "From Instagram or paste" }, { t: "Winners found", s: "Hooks that save and share" }, { t: "Formula built", s: "Your own, not generic" }, { t: "Next posts planned", s: "A calendar you can use" }], result: "Posting from real data" },
  { tag: "Content Ideas", title: "Never stare at a blank page", body: "Hooks, scripts and a 30-day series built around your niche.",
    steps: [{ t: "Tell it your niche", s: "One sentence" }, { t: "Hooks appear", s: "10 in seconds" }, { t: "Pick a script", s: "Talking head or voiceover" }, { t: "Schedule it", s: "Posts on time" }], result: "30 days planned" },
  { tag: "AI CRM", title: "Every lead, one pipeline", body: "DMs, forms and webinars land in one board with the next step clear.",
    steps: [{ t: "Lead arrives", s: "From any source" }, { t: "Tagged and scored", s: "Hot, warm, cold" }, { t: "Follow-up queued", s: "Right message, right day" }, { t: "Deal closed", s: "Moved to won" }], result: "Nothing falls through" },
];

function FlowCard({ f, i }: { f: Flow; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(f.steps.length + 1); return; }
    let timers: any[] = [];
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { timers.forEach(clearTimeout); timers = []; setN(0); for (let k = 1; k <= f.steps.length + 1; k++) timers.push(setTimeout(() => setN(k), 350 + k * 650)); }
      else { timers.forEach(clearTimeout); }
    }, { threshold: 0.5 });
    io.observe(el); return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, [f.steps.length]);
  return (
    <div ref={ref} className="fl-card" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
      <span className="fl-tag">{f.tag}</span>
      <h3>{f.title}</h3>
      <p>{f.body}</p>
      <div className="fl-steps">
        {f.steps.map((s, k) => (
          <div key={k} className={"fl-step" + (n > k ? " on" : "") + (n === k + 1 ? " now" : "")}>
            <span className="fl-dot">{n > k + 1 || (n > k && k === f.steps.length - 1 && n > f.steps.length) ? "✓" : k + 1}</span>
            <div><b>{s.t}</b>{s.s && <small>{s.s}</small>}</div>
          </div>
        ))}
      </div>
      <div className={"fl-res" + (n > f.steps.length ? " on" : "")}>{f.result}</div>
    </div>
  );
}

export function LandingFlows() {
  return (
    <section className="fl-sec" id="flows" aria-label="How each tool works">
      <style>{`
.fl-sec{background:#fff;padding:56px 24px 84px}
.fl-in{max-width:1100px;margin:0 auto}
.fl-head{text-align:center;max-width:620px;margin:0 auto 34px}
.fl-head .tg{display:inline-flex;align-items:center;gap:7px;color:#2e78ef;background:#eaf2fe;border-radius:99px;padding:6px 13px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.fl-head h2{font-size:clamp(28px,3.8vw,42px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:14px 0 10px;color:#101828}
.fl-head p{font-size:16px;line-height:1.6;color:#5b6575;margin:0}
.fl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.fl-card{background:#fff;border:1px solid #e3e9f3;border-radius:20px;padding:20px;box-shadow:0 18px 40px -30px rgba(46,120,239,.45);display:flex;flex-direction:column}
.fl-tag{align-self:flex-start;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#2e78ef;background:#eaf2fe;border-radius:99px;padding:4px 10px}
.fl-card h3{font-size:18px;font-weight:700;letter-spacing:-.02em;color:#101828;margin:12px 0 4px}
.fl-card p{font-size:13.5px;line-height:1.5;color:#5b6575;margin:0 0 14px;min-height:40px}
.fl-steps{display:flex;flex-direction:column;gap:8px;position:relative}
.fl-step{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;border:1px solid #edf1f7;background:#f8fafd;opacity:.45;transform:translateY(4px);transition:all .45s ease}
.fl-step.on{opacity:1;transform:none;background:#fff;border-color:#cfe0fb}
.fl-step.now{box-shadow:0 0 0 3px rgba(46,120,239,.14)}
.fl-dot{flex:none;width:22px;height:22px;border-radius:50%;background:#e3e9f3;color:#6b7686;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .35s}
.fl-step.on .fl-dot{background:#2e78ef;color:#fff}
.fl-step b{display:block;font-size:13px;color:#101828;font-weight:650}
.fl-step small{display:block;font-size:11.5px;color:#7a8494;margin-top:1px}
.fl-res{margin-top:12px;font-size:12.5px;font-weight:650;color:#157f3d;background:#e6f6ec;border-radius:10px;padding:9px 12px;opacity:0;transform:translateY(6px);transition:all .5s ease}
.fl-res.on{opacity:1;transform:none}
@media(max-width:960px){.fl-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.fl-sec{padding:36px 16px 56px}.fl-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="fl-in">
        <div className="fl-head">
          <span className="tg">Tool by tool</span>
          <h2>Simple to set up. Easy to see working.</h2>
          <p>Here is what happens inside each tool, step by step.</p>
        </div>
        <div className="fl-grid">{FLOWS.map((f, i) => <FlowCard key={f.tag} f={f} i={i} />)}</div>
      </div>
    </section>
  );
}
