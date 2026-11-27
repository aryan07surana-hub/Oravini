import { useEffect, useRef, useState } from "react";

// Scroll-driven product showcase for /new-home.
// To swap or add promo videos, edit PROMOS only.
export const MEDIA = "https://oravini-media.pages.dev/";
// The Coach walkthrough lives on a second Pages project.
const MEDIA2_IDS = new Set(["coach", "webinar", "ytlive", "launch"]);
export const mediaFor = (id: string) => (MEDIA2_IDS.has(id) ? "https://oravini-media2.pages.dev/" : MEDIA);
export const PROMOS = [
  { id: "dm", tag: "DM Automation", title: "Every comment gets a reply.", body: "Someone comments on your reel and Oravini sends the guide to their DMs, then saves the lead to your CRM. No manual work." },
  { id: "web", tag: "Webinars", title: "Webinars that sell while you present.", body: "Run it live. The offer sits inside the room, and every attendee lands in your CRM." },
  { id: "webinar", tag: "Webinar platform", title: "Your own webinar platform.", body: "Registration, live room, replay and follow-up in one place, with your offer built in." },
  { id: "ytlive", tag: "YouTube Live webinars", title: "Go live on YouTube, sell inside Oravini.", body: "Stream to YouTube while attendees register, chat and see your offer in your own room." },
  { id: "ideas", tag: "Content Ideas", title: "Never stare at a blank page again.", body: "Hooks, scripts and a 30-day series built around your niche, in seconds." },
  { id: "coach", tag: "AI Content Coach", title: "A coach that learns from your reels.", body: "It studies what already works for you, finds your winning hooks and plans what to post next." },
  { id: "sched", tag: "Content Scheduler", title: "Posting on autopilot.", body: "Queue reels, photos and carousels. Oravini publishes on time, every time." },
  { id: "dashboard", tag: "Your dashboard", title: "Your whole business at a glance.", body: "Credits, leads, registrations and your next step, all on one calm screen." },
  { id: "video", tag: "Video Hosting", title: "Host videos that look like you.", body: "Upload once, share a clean player link or embed it anywhere, with views tracked." },
  { id: "funnels", tag: "Funnels and CRM", title: "From first click to paying client.", body: "Build the page, capture the lead and follow up, all inside the same place." },
  { id: "aisetter", tag: "AI Setter", title: "An AI setter that never sleeps.", body: "It answers new DMs, qualifies the lead and books the call while you do the real work." },
  { id: "aicrm", tag: "AI CRM", title: "Every lead, one clean pipeline.", body: "Leads from DMs, forms and webinars land in one place with the next step already clear." },
  { id: "webstream", tag: "Webinar streaming", title: "Stream once, reach everyone.", body: "Go live from the browser, stream to your audience and keep the replay ready to sell." },
  { id: "live", tag: "Webinar live room", title: "A live room built to convert.", body: "Present, chat and show your offer at the right moment while attendees stay in the room." },
  { id: "community", tag: "Community", title: "Grow with people on the same path.", body: "Share wins, ask questions and learn from other creators inside the app." },
  { id: "streaks", tag: "Streaks and goals", title: "Stay consistent, hit the goal.", body: "Set an income target, build a daily streak and watch your progress add up." },
];

const VERTICAL = new Set(["dm", "web", "ideas", "sched", "hero"]);

function LaunchVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    const v = ref.current, b = box.current; if (!v || !b) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.35 });
    io.observe(b); return () => io.disconnect();
  }, []);
  const toggle = () => { const v = ref.current; if (!v) return; v.muted = sound; setSound(!sound); if (!sound) { v.currentTime = 0; v.play().catch(() => {}); } };
  const base = mediaFor("launch");
  return (
    <div ref={box} className="lp-frame">
      <video ref={ref} poster={`${base}launch.jpg`} muted loop playsInline preload="metadata">
        <source src={`${base}launch_16x9.webm`} type="video/webm" />
        <source src={`${base}launch_16x9.mp4`} type="video/mp4" />
      </video>
      <button type="button" className="lp-snd" onClick={toggle}>{sound ? "Sound on" : "Tap for sound"}</button>
    </div>
  );
}

export function LandingShowcase() {
  return (
    <section className="lp-show" id="see-how" aria-label="See how it works">
      <style>{`
.lp-show{background:linear-gradient(180deg,#fff 0,#f4f8fe 100%);padding:56px 24px 40px}
.lp-show .in{max-width:1040px;margin:0 auto}
.lp-show .head{text-align:center;max-width:640px;margin:0 auto 28px}
.lp-show .tag{display:inline-flex;align-items:center;gap:7px;color:#2e78ef;background:#eaf2fe;border-radius:99px;padding:6px 13px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.lp-show .tag:before{content:"";width:6px;height:6px;border-radius:50%;background:#2e78ef}
.lp-show h2{font-size:clamp(30px,4.2vw,46px);font-weight:800;letter-spacing:-.03em;line-height:1.08;margin:16px 0 10px;color:#101828}
.lp-show .sub{font-size:16px;line-height:1.6;color:#5b6575;margin:0}
.lp-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:22px;overflow:hidden;background:#eef4fe;box-shadow:0 0 0 1px rgba(46,120,239,.14),0 36px 70px -32px rgba(46,120,239,.45),0 10px 26px -12px rgba(16,24,40,.12)}
.lp-frame video{display:block;width:100%;height:100%;object-fit:cover}
.lp-snd{position:absolute;right:14px;bottom:14px;border:0;cursor:pointer;background:rgba(255,255,255,.94);color:#2e78ef;font:600 12px Inter,system-ui,sans-serif;padding:8px 14px;border-radius:99px;box-shadow:0 4px 14px rgba(16,24,40,.15)}
.lp-show h3{font-size:20px;font-weight:700;letter-spacing:-.02em;color:#101828;text-align:center;margin:64px 0 6px}
.lp-show .sub2{text-align:center;color:#6b7686;font-size:14px;margin:0 0 22px}
.lp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.lp-card{position:relative;text-align:left;border:1px solid #e3e9f3;border-radius:16px;background:#fff;padding:0;cursor:pointer;overflow:hidden;transition:transform .2s,box-shadow .2s,border-color .2s;font-family:inherit}
.lp-card:hover{transform:translateY(-3px);border-color:#bcd3fb;box-shadow:0 18px 34px -20px rgba(46,120,239,.5)}
.lp-th{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#eaf2fe,#dbe8fb);overflow:hidden}
.lp-th img{width:100%;height:100%;object-fit:cover;display:block}
.lp-play{position:absolute;right:10px;bottom:10px;width:30px;height:30px;border-radius:50%;background:#2e78ef;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -4px rgba(46,120,239,.7)}
.lp-play:after{content:"";border-left:9px solid #fff;border-top:5.5px solid transparent;border-bottom:5.5px solid transparent;margin-left:2px}
.lp-ct{padding:12px 14px 14px}
.lp-ct small{display:block;color:#2e78ef;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.lp-ct b{display:block;margin-top:4px;font-size:13.5px;line-height:1.3;color:#101828;font-weight:650}
.lp-modal{position:fixed;inset:0;z-index:1000;background:rgba(16,24,40,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}
.lp-mbox{width:min(920px,100%);background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(16,24,40,.6)}
.lp-mbox.t{width:min(360px,100%)}
.lp-mhead{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font:700 13px Inter,system-ui,sans-serif;color:#2e78ef}
.lp-mhead button{border:0;background:#eaf2fe;color:#2e78ef;width:30px;height:30px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer}
.lp-mbox video{display:block;width:100%;background:#eef4fe;max-height:70vh}
.lp-mcap{padding:14px 18px 18px;display:flex;flex-direction:column;gap:4px;font-family:Inter,system-ui,sans-serif}
.lp-mcap b{color:#101828;font-size:16px}.lp-mcap span{color:#5b6575;font-size:13.5px;line-height:1.5}
@media(max-width:900px){.lp-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.lp-show{padding:36px 16px 56px}.lp-grid{grid-template-columns:repeat(2,1fr);gap:10px}.lp-show .sub{font-size:14px}.lp-show h3{margin-top:44px}}
      `}</style>
      <div className="in">
        <div className="head">
          <span className="tag">Watch the tour</span>
          <h2>See how it works</h2>
          <p className="sub">One minute on what Oravini does for your brand, then pick any tool below to watch it in action.</p>
        </div>
        <LaunchVideo />
      </div>
    </section>
  );
}
