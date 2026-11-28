import { Radio, MessageCircle, Sparkles, CalendarDays, Video, Target, BarChart2, LayoutGrid, Scissors, Palette, Layers, Users, Bot, Film } from "lucide-react";

/* More platform content for the landing page. Blue and white only.
   Mini animated demos use the same 12s story loops as LandingDemos. */

const L = 12;
const EO = "cubic-bezier(.16,1,.3,1)", EM = "cubic-bezier(.65,0,.35,1)", SP = "cubic-bezier(.34,1.56,.64,1)";
type Step = [number, string, string?];
const kf = (n: string, steps: Step[]) =>
  `@keyframes ${n}{${steps.map(([s, css, e]) => `${(s / L * 100).toFixed(2)}%{${css}${e ? `;animation-timing-function:${e}` : ""}}`).join("")}}`;
const show = (n: string, a: number, b: number, from = "opacity:0;transform:translateY(10px) scale(.97)") =>
  kf(n, [[0, from, EO], [a, from, EO], [a + 0.7, "opacity:1;transform:none"], [b, "opacity:1;transform:none", "ease-in"], [b + 0.6, from], [L, from]]);
const grow = (n: string, a: number, w: string, b = 11) =>
  kf(n, [[0, "width:0", EM], [a, "width:0", EM], [a + 1.6, `width:${w}`], [b, `width:${w}`], [b + 0.6, "width:0"], [L, "width:0"]]);
const growH = (n: string, a: number, h: string, b = 11) =>
  kf(n, [[0, "height:6%", EM], [a, "height:6%", EM], [a + 1.4, `height:${h}`], [b, `height:${h}`], [b + 0.6, "height:6%"], [L, "height:6%"]]);
const cur = (n: string, pts: [number, number, number][]) =>
  kf(n, pts.map(([s, x, y]) => [s, `left:${x}%;top:${y}%;opacity:1`, EM] as Step));

const CSS = `
${show("m1", .4, 11)}${show("m2", 1.0, 11)}${show("m3", 1.6, 11)}${show("m4", 4.2, 11)}${show("m5", 6.6, 11)}${show("m6", 8.4, 11)}
${grow("mg1", 1.0, "88%")}${grow("mg2", 1.5, "64%")}${grow("mg3", 2.0, "46%")}${grow("mg4", 2.5, "30%")}
${growH("mh1", 1.0, "46%")}${growH("mh2", 1.4, "70%")}${growH("mh3", 1.8, "38%")}${growH("mh4", 2.2, "86%")}${growH("mh5", 2.6, "58%")}${growH("mh6", 3.0, "100%")}
${kf("mtype", [[0, "width:0", "steps(24)"], [5.2, "width:0", "steps(24)"], [7.4, "width:100%"], [11, "width:100%"], [11.6, "width:0"], [L, "width:0"]])}
${cur("mc1", [[0, 86, 86], [1.2, 86, 86], [3.2, 62, 44], [3.6, 62, 44], [6.5, 80, 76], [10.5, 88, 90], [L, 86, 86]])}
${cur("mc2", [[0, 88, 88], [1.5, 88, 88], [3.0, 30, 48], [3.5, 30, 48], [5.2, 66, 30], [5.6, 66, 30], [8.0, 80, 84], [10.5, 88, 90], [L, 88, 88]])}
${cur("mc3", [[0, 88, 90], [3.0, 88, 90], [4.4, 70, 80], [5.0, 70, 80], [8.5, 84, 92], [L, 88, 90]])}
.oravini-landing .lm{position:relative;height:260px;border-radius:20px;background:#fff;border:1px solid var(--blue-border);box-shadow:0 18px 48px -18px rgba(46,120,239,.28);overflow:hidden;font-size:11px}
.oravini-landing .lm .bar{height:34px;display:flex;align-items:center;gap:6px;padding:0 14px;border-bottom:1px solid #eef2f8;font-size:11px;font-weight:600;color:var(--ink)}
.oravini-landing .lm .bar i{width:7px;height:7px;border-radius:50%;background:#dbe3ef}
.oravini-landing .lm .a{opacity:0}
.oravini-landing .lm .cursor{position:absolute;z-index:9;width:18px;height:18px;opacity:0;filter:drop-shadow(0 2px 3px rgba(46,120,239,.4))}
.oravini-landing .lm .pill{border-radius:999px;background:var(--blue-tint2);color:var(--blue);font-weight:600;font-size:10px;padding:4px 10px}
.oravini-landing .tools-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:48px}
.oravini-landing .tool{background:#fff;border:1px solid var(--blue-border);border-radius:18px;padding:22px 22px 24px;transition:transform .35s var(--ease),box-shadow .35s var(--ease),border-color .2s}
.oravini-landing .tool:hover{transform:translateY(-3px);border-color:rgba(46,120,239,.45);box-shadow:0 16px 36px -16px rgba(46,120,239,.35)}
.oravini-landing .tool .ti{width:40px;height:40px;border-radius:12px;background:var(--blue-tint2);color:var(--blue);display:grid;place-items:center;margin-bottom:16px}
.oravini-landing .tool h3{font-size:16px;font-weight:600;letter-spacing:-.01em;margin-bottom:6px}
.oravini-landing .tool p{font-size:13.5px;color:var(--sub);line-height:1.5}
.oravini-landing .frow{display:grid;grid-template-columns:1fr 1.05fr;gap:64px;align-items:center;margin-top:88px}
.oravini-landing .frow.rev .ftext{order:2}
.oravini-landing .ftext h3{font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-.03em;margin:14px 0 14px}
.oravini-landing .ftext p{color:var(--sub);font-size:16px;line-height:1.6;max-width:460px}
.oravini-landing .ftext ul{list-style:none;margin-top:20px;display:grid;gap:10px}
.oravini-landing .ftext li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink);font-weight:500}
.oravini-landing .ftext li:before{content:"";flex:none;width:18px;height:18px;border-radius:50%;margin-top:1px;background:var(--blue-tint2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232e78ef' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/11px no-repeat}
.oravini-landing .faq{max-width:760px;margin:44px auto 0;display:grid;gap:12px}
.oravini-landing .faq details{background:#fff;border:1px solid var(--blue-border);border-radius:16px;padding:0 22px;transition:border-color .2s,box-shadow .3s}
.oravini-landing .faq details[open]{border-color:rgba(46,120,239,.45);box-shadow:0 12px 30px -18px rgba(46,120,239,.4)}
.oravini-landing .faq summary{list-style:none;cursor:pointer;padding:18px 0;font-weight:600;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;gap:16px}
.oravini-landing .faq summary::-webkit-details-marker{display:none}
.oravini-landing .faq summary:after{content:"+";flex:none;width:26px;height:26px;border-radius:50%;background:var(--blue-tint2);color:var(--blue);display:grid;place-items:center;font-size:18px;font-weight:500;transition:transform .3s var(--ease)}
.oravini-landing .faq details[open] summary:after{transform:rotate(45deg)}
.oravini-landing .faq details p{padding:0 0 20px;color:var(--sub);font-size:14.5px;line-height:1.65}
@media(max-width:980px){.oravini-landing .tools-grid{grid-template-columns:repeat(2,1fr)}.oravini-landing .frow{grid-template-columns:1fr;gap:32px;margin-top:64px}.oravini-landing .frow.rev .ftext{order:0}}
@media(max-width:560px){.oravini-landing .tools-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.oravini-landing .lm *{animation:none!important;opacity:1!important}}
`;

const Cur = ({ a }: { a: string }) => (
  <svg className="cursor" viewBox="0 0 24 24" style={{ animation: `${a} ${L}s infinite both` }}><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
);
const an = (n: string) => ({ animation: `${n} ${L}s infinite both` });

const TOOLS = [
  { i: MessageCircle, t: "DM Automation", d: "Comments, story mentions and new followers get an instant reply, and every lead lands in your CRM." },
  { i: Radio, t: "Webinars", d: "Registration page, live room, reminders and replay in one flow. Sell inside the room." },
  { i: Sparkles, t: "Content Ideas", d: "Hooks, scripts and 30-day series built around your niche and what already works." },
  { i: CalendarDays, t: "Content Scheduler", d: "Queue reels, photos and carousels. Oravini posts for you at the right time." },
  { i: Video, t: "Video Hosting", d: "Share videos anywhere with a custom progress bar and offers that appear on cue." },
  { i: BarChart2, t: "Tracking", d: "Every post logged with views, saves, shares and followers gained, in one view." },
  { i: Target, t: "Competitor Study", d: "See what works for the accounts in your niche and where the gaps are." },
  { i: Bot, t: "Content Coach", d: "Ask what to post next. The answer comes from your own numbers." },
  { i: Layers, t: "Pages and Funnels", d: "Describe a funnel and get a page, a form and a follow-up that capture leads." },
  { i: Palette, t: "Design Studio", d: "Carousels and graphics that look like a designer made them, in your colors." },
  { i: Scissors, t: "Clip Finder", d: "AI scans your replay and cuts the moments worth posting." },
  { i: Film, t: "Video Editor", d: "Trim, caption and export short videos without leaving the platform." },
];

export function ToolGrid() {
  return (
    <section id="tools" style={{ background: "#f7fafe", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <style>{CSS}</style>
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow"><span className="dot"></span>The full toolkit</span>
          <h2>One login. Twelve tools that work together.</h2>
          <p>Your ideas, posts, leads and webinars all share the same data, so nothing gets copied between apps.</p>
        </div>
        <div className="tools-grid">
          {TOOLS.map(t => (
            <div className="tool" key={t.t}><div className="ti"><t.i size={20} strokeWidth={2} /></div><h3>{t.t}</h3><p>{t.d}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetitorMock() {
  const rows = [["@growthwithmia", "mg1", "88%"], ["@coachkarim", "mg2", "64%"], ["@thefitfounder", "mg3", "46%"], ["@you", "mg4", "30%"]];
  return (
    <div className="lm">
      <div className="bar"><i></i><i></i><i></i><span style={{ marginLeft: 4 }}>Competitor Study</span><span className="pill" style={{ marginLeft: "auto" }}>Fitness coaching</span></div>
      <div style={{ position: "absolute", left: 18, right: 18, top: 50, display: "grid", gap: 11 }}>
        {rows.map(([n, a, w], i) => (
          <div key={n} style={{ ...an(`m${i + 1}`), display: "grid", gridTemplateColumns: "104px 1fr 40px", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600, color: i === 3 ? "#2e78ef" : "#141414" }}>{n}</span>
            <span style={{ height: 9, borderRadius: 6, background: "#eaf1fb", overflow: "hidden", display: "block" }}><span style={{ display: "block", height: "100%", borderRadius: 6, background: i === 3 ? "#2e78ef" : "#9fc2f8", ...an(a) }} /></span>
            <span style={{ color: "#5b6675", fontWeight: 600, textAlign: "right" }}>{w}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, borderRadius: 14, background: "#eff5fb", padding: "10px 12px", ...an("m5") }}>
        <p style={{ fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "#2e78ef", fontWeight: 700, marginBottom: 4 }}>Content gap</p>
        <p style={{ fontWeight: 600, color: "#141414" }}>Nobody posts about meal prep for busy parents. Try it this week.</p>
      </div>
      <Cur a="mc1" />
    </div>
  );
}

function FunnelMock() {
  return (
    <div className="lm">
      <div className="bar"><i></i><i></i><i></i><span style={{ marginLeft: 4 }}>Pages and Funnels</span><span className="pill" style={{ marginLeft: "auto" }}>Draft</span></div>
      <div style={{ position: "absolute", left: 18, top: 48, right: 18, borderRadius: 12, background: "#f3f7fd", padding: "9px 12px", color: "#5b6675", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", ...an("mtype") }}>Free 5-day content challenge for coaches</span>
      </div>
      <div style={{ position: "absolute", left: 18, right: 18, top: 92, display: "grid", gap: 8 }}>
        <div style={{ ...an("m3"), borderRadius: 12, background: "linear-gradient(135deg,#3b82f0,#1d4ba8)", padding: "14px 14px", color: "#fff" }}><p style={{ fontWeight: 700, fontSize: 14 }}>Post every day without burning out</p><p style={{ opacity: .85, marginTop: 3 }}>Join the free 5-day challenge</p></div>
        <div style={{ ...an("m4"), display: "flex", gap: 8 }}>
          <span style={{ flex: 1, borderRadius: 9, background: "#f3f7fd", padding: "8px 10px", color: "#8a94a3" }}>you@email.com</span>
          <span style={{ borderRadius: 9, background: "#2e78ef", color: "#fff", fontWeight: 700, padding: "8px 14px" }}>Join free</span>
        </div>
        <div style={{ ...an("m5"), display: "flex", gap: 8 }}><span className="pill">Thank-you page</span><span className="pill">3 follow-up emails</span><span className="pill">CRM synced</span></div>
      </div>
      <Cur a="mc2" />
    </div>
  );
}

function CoachMock() {
  return (
    <div className="lm">
      <div className="bar"><i></i><i></i><i></i><span style={{ marginLeft: 4 }}>Content Coach</span><span className="pill" style={{ marginLeft: "auto" }}>Reads your numbers</span></div>
      <div style={{ position: "absolute", right: 18, top: 50, maxWidth: "70%", borderRadius: 14, background: "#2e78ef", color: "#fff", padding: "9px 12px", fontWeight: 500, ...an("m1") }}>What should I post this week?</div>
      <div style={{ position: "absolute", left: 18, top: 92, right: 18, borderRadius: 14, background: "#eff5fb", padding: "11px 13px", ...an("m3") }}>
        <p style={{ fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "#2e78ef", fontWeight: 700, marginBottom: 6 }}>Coach</p>
        <p style={{ fontWeight: 500, color: "#141414", lineHeight: 1.5 }}>Your 3 reels on pricing got 2.4x more saves than the rest. Post one more this week, then a carousel to turn those saves into DMs.</p>
      </div>
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, display: "flex", gap: 8, alignItems: "flex-end", height: 64 }}>
        {["mh1", "mh2", "mh3", "mh4", "mh5", "mh6"].map((h, i) => (
          <span key={h} style={{ flex: 1, borderRadius: "8px 8px 3px 3px", background: i === 5 ? "#2e78ef" : "#bcd5fa", ...an(h) }} />
        ))}
      </div>
      <Cur a="mc3" />
    </div>
  );
}

const ROWS = [
  { eyebrow: "Competitor Study", h: "See exactly what works in your niche.", p: "Pick the accounts you want to learn from. Oravini tracks their public posts and shows you the hooks, formats and topics that pull the most attention, and what nobody is covering yet.", li: ["Watch any public account", "Spot content gaps before you create", "Turn findings into ideas in one click"], M: CompetitorMock, rev: false },
  { eyebrow: "Pages and Funnels", h: "Describe a funnel. Get a funnel.", p: "Type what you are offering. Oravini builds the page, the form, the thank-you step and the follow-up emails. Every signup goes straight into your CRM with its source.", li: ["Pages built from a single sentence", "Edit anything by chatting with it", "Leads, sources and UTMs in one CRM"], M: FunnelMock, rev: true },
  { eyebrow: "Content Coach", h: "A coach that reads your numbers.", p: "Ask what to post, what to drop or why a reel worked. The Content Coach answers from your own tracked data, so the advice is about your account, not generic tips.", li: ["Answers based on your real results", "Weekly plan you can schedule right away", "Learns what your audience saves and shares"], M: CoachMock, rev: false },
];

export function FeatureRows() {
  return (
    <section id="deep">
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow"><span className="dot"></span>Go deeper</span>
          <h2>Built for the work behind the posts.</h2>
          <p>Strategy, pages and coaching sit next to your content tools, so you can act on what you learn.</p>
        </div>
        {ROWS.map(r => (
          <div className={`frow${r.rev ? " rev" : ""}`} key={r.eyebrow}>
            <div className="ftext">
              <span className="eyebrow"><span className="dot"></span>{r.eyebrow}</span>
              <h3>{r.h}</h3>
              <p>{r.p}</p>
              <ul>{r.li.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <r.M />
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQ = [
  ["Who is Oravini for?", "Coaches, creators and small brands who want to grow an audience and turn it into leads and sales without stitching together seven different apps."],
  ["Do I need to connect Instagram?", "Only for the tools that use it: DM automation, the scheduler and tracking. Content Ideas, Pages and Funnels, Webinars and Video Hosting work without it."],
  ["Is there a free plan?", "Yes. You can create a free account and try the tools before you decide on anything."],
  ["Can I run webinars and sell inside them?", "Yes. You get a registration page, a live room with your offer pinned inside it, reminders and a replay, all in one flow."],
  ["Where do my leads go?", "Every DM lead, webinar signup and funnel signup lands in one CRM with its source, so you always know where a lead came from."],
  ["Will Oravini post for me without asking?", "Only what you schedule. You queue the post and the time, and Oravini publishes it. You can edit or remove anything in the queue before it goes out."],
];

export function Faq() {
  return (
    <section id="faq" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow"><span className="dot"></span>Questions</span>
          <h2>Answers before you ask.</h2>
        </div>
        <div className="faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </div>
    </section>
  );
}
