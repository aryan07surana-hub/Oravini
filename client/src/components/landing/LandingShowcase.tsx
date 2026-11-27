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

export function LaunchVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [wait, setWait] = useState(false);
  const [vol, setVol] = useState(1);
  const base = mediaFor("launch");
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
  const start = () => {
    const v = ref.current; if (!v) return;
    v.loop = false; v.currentTime = 0; v.muted = false; v.volume = vol;
    setStarted(true); setWait(v.readyState < 3);
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    // Watchdog: if nothing moves after 4s, reload the source and try again once.
    window.setTimeout(() => { const x = ref.current; if (x && !x.paused && x.currentTime === 0) { x.load(); x.muted = false; x.play().catch(() => { x.muted = true; x.play().catch(() => {}); }); } }, 4000);
  };
  const startedRef = useRef(false); startedRef.current = started;
  // Muted looping preview that plays whenever the video is on screen.
  useEffect(() => {
    const v = ref.current; if (!v) return;
    v.muted = true; v.loop = true;
    const io = new IntersectionObserver(([e]) => {
      if (startedRef.current) return;
      if (e.isIntersecting) { v.muted = true; v.loop = true; v.play().catch(() => {}); } else v.pause();
    }, { threshold: 0.35 });
    io.observe(v); return () => io.disconnect();
  }, []);
  const backToPreview = () => { const v = ref.current; setStarted(false); if (!v) return; v.muted = true; v.loop = true; v.currentTime = 0; v.play().catch(() => {}); };
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const full = () => { const f = ref.current?.parentElement as any; if (!f) return; if (document.fullscreenElement) document.exitFullscreen(); else (f.requestFullscreen || f.webkitRequestFullscreen)?.call(f); };
  return (
    <div className="lp-frame">
     <div className="lp-stage">
      <video ref={ref} poster={`${base}launch.jpg`} playsInline muted loop preload="auto"
        onClick={() => started && toggle()}
        onPlay={() => setPlaying(true)} onLoadStart={() => {}} onWaiting={() => setWait(true)} onPlaying={() => setWait(false)} onCanPlay={() => setWait(false)} onSeeked={() => setWait(false)} onPause={() => setPlaying(false)}
        onEnded={backToPreview}
        onTimeUpdate={e => { setT(e.currentTarget.currentTime); if (e.currentTarget.currentTime > 0) setWait(false); }}
        onLoadedMetadata={e => setDur(e.currentTarget.duration)} onDurationChange={e => setDur(e.currentTarget.duration)}>
        <source src={`${base}launch_16x9.mp4`} type="video/mp4" />
        <source src={`${base}launch_16x9.webm`} type="video/webm" />
      </video>
      {!started && (
        <button type="button" className="lp-bigplay" onClick={start} aria-label="Play the Oravini video">
          <span className="lp-bigplay-btn"><i /></span>
        </button>
      )}
      {started && wait && <div className="lp-spin" aria-label="Loading" />}
     </div>
      {started && (
        <div className="lp-ctl">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="lp-cb">{playing ? <b className="lp-pause" /> : <b className="lp-tri" />}</button>
          <span className="lp-time">{fmt(t)}</span>
          <input className="lp-seek" type="range" min={0} max={dur || 1} step={0.1} value={t}
            style={{ ["--p" as any]: `${dur ? (t / dur) * 100 : 0}%` }}
            onChange={e => { const v = ref.current; if (v) v.currentTime = Number(e.target.value); }} aria-label="Seek" />
          <input className="lp-vol" type="range" min={0} max={1} step={0.05} value={vol}
            onChange={e => { const x = Number(e.target.value); setVol(x); if (ref.current) { ref.current.volume = x; ref.current.muted = x === 0; } }} aria-label="Volume" />
          <button type="button" onClick={full} aria-label="Fullscreen" className="lp-cb"><b className="lp-fs" /></button>
        </div>
      )}
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
.lp-frame{position:relative;width:100%;border-radius:22px;overflow:hidden;background:#eef4fe;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(46,120,239,.14),0 36px 70px -32px rgba(46,120,239,.45),0 10px 26px -12px rgba(16,24,40,.12)}
.lp-stage{position:relative;width:100%;aspect-ratio:16/9;background:#eef4fe}
.lp-frame:fullscreen{border-radius:0;justify-content:center;background:#000}
.lp-frame video{display:block;width:100%;height:100%;object-fit:contain;background:#eef4fe}
.lp-spin{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:4px solid rgba(46,120,239,.25);border-top-color:#2e78ef;animation:lpspin .8s linear infinite;pointer-events:none}
@keyframes lpspin{to{transform:rotate(360deg)}}
.lp-bigplay{position:absolute;inset:0;border:0;background:transparent;cursor:pointer;display:grid;place-items:center;padding:0}
.lp-bigplay-btn{width:96px;height:68px;border-radius:16px;background:#2e78ef;display:grid;place-items:center;box-shadow:0 18px 36px -10px rgba(46,120,239,.7);transition:transform .2s,background .2s}
.lp-bigplay:hover .lp-bigplay-btn{transform:scale(1.08);background:#2468d8}
.lp-bigplay-btn i{border-left:24px solid #fff;border-top:14px solid transparent;border-bottom:14px solid transparent;margin-left:6px}
.lp-ctl{position:relative;flex:none;height:44px;background:#2e78ef;display:flex;align-items:center;gap:12px;padding:0 14px;color:#fff;font:600 13px Inter,system-ui,sans-serif}
.lp-cb{border:0;background:transparent;cursor:pointer;width:28px;height:28px;display:grid;place-items:center;padding:0}
.lp-tri{border-left:11px solid #fff;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px}
.lp-pause{width:11px;height:13px;border-left:4px solid #fff;border-right:4px solid #fff}
.lp-fs{width:14px;height:14px;border:2px solid #fff;border-radius:2px}
.lp-time{min-width:34px}
.lp-seek,.lp-vol{-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;background:rgba(255,255,255,.35);outline:none;cursor:pointer}
.lp-seek{flex:1;background:linear-gradient(90deg,#fff var(--p),rgba(255,255,255,.35) var(--p))}
.lp-vol{width:72px}
.lp-seek::-webkit-slider-thumb,.lp-vol::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#fff}
.lp-seek::-moz-range-thumb,.lp-vol::-moz-range-thumb{width:12px;height:12px;border:0;border-radius:50%;background:#fff}
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
@media(max-width:640px){.lp-frame{border-radius:14px}.lp-ctl{height:40px;gap:8px;padding:0 10px}.lp-vol{display:none}.lp-bigplay-btn{width:72px;height:52px}.lp-bigplay-btn i{border-left-width:18px;border-top-width:11px;border-bottom-width:11px}.lp-show{padding:36px 16px 56px}.lp-grid{grid-template-columns:repeat(2,1fr);gap:10px}.lp-show .sub{font-size:14px}.lp-show h3{margin-top:44px}}
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
