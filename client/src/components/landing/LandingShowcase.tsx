import { useEffect, useRef, useState } from "react";

// Scroll-driven product showcase for /new-home.
// To swap or add promo videos, edit PROMOS only.
export const MEDIA = "https://oravini-media.pages.dev/";
export const PROMOS = [
  { id: "dm", tag: "DM Automation", title: "Every comment gets a reply.", body: "Someone comments on your reel and Oravini sends the guide to their DMs, then saves the lead to your CRM. No manual work." },
  { id: "web", tag: "Webinars", title: "Webinars that sell while you present.", body: "Run it live. The offer sits inside the room, and every attendee lands in your CRM." },
  { id: "ideas", tag: "Content Ideas", title: "Never stare at a blank page again.", body: "Hooks, scripts and a 30-day series built around your niche, in seconds." },
  { id: "sched", tag: "Content Scheduler", title: "Posting on autopilot.", body: "Queue reels, photos and carousels. Oravini publishes on time, every time." },
  { id: "hero", tag: "Your dashboard", title: "One place for everything.", body: "Ideas, posts, leads and webinars share the same data, so nothing gets copied between apps." },
];

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function Reveal({ promo }: { promo: (typeof PROMOS)[number] }) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => { const m = window.matchMedia("(max-width: 640px)"); const f = () => setMobile(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const shape = mobile ? "9x16" : "16x9";
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setP(1); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the block's top edge enters the bottom of the screen, 1 when it sits in the middle
      setP(clamp((vh - r.top) / (vh * 0.62)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  if (bad) return null; // video file missing: hide the block instead of showing an empty frame
  const e = ease(p);
  const copy = ease(clamp(p / 0.6));
  return (
    <div ref={ref} className="blk">
      <div className="copy" style={{ opacity: copy, transform: `translateY(${(1 - copy) * 26}px)` }}>
        <span className="tag">{promo.tag}</span>
        <h2>{promo.title}</h2>
        <p className="body">{promo.body}</p>
      </div>
      <div className={"frame" + (mobile ? " m" : "")} style={{ opacity: 0.2 + 0.8 * e, transform: `translateY(${(1 - e) * 40}px) scale(${0.84 + 0.16 * e})`, borderRadius: 28 - 10 * e }}>
        <video key={shape} poster={`${MEDIA}${promo.id}.jpg`} autoPlay muted loop playsInline preload="metadata" onError={(e) => { if ((e.target as HTMLElement).tagName === "SOURCE") return; setBad(true); }}>
          <source src={`${MEDIA}${promo.id}_${shape}.webm`} type="video/webm" />
          <source src={`${MEDIA}${promo.id}_${shape}.mp4`} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}

export function LandingShowcase() {
  return (
    <section className="lp-show" aria-label="Product showcase">
      <style>{`
.lp-show{position:relative;background:linear-gradient(180deg,#fff 0,#f4f8fe 55%,#fff 100%);padding:40px 24px 90px;overflow:hidden}
.lp-show .blk{position:relative;max-width:1040px;margin:0 auto;padding:40px 0}
.lp-show .blk:before{content:"";position:absolute;width:820px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(46,120,239,.13),transparent 65%);left:50%;top:60%;transform:translate(-50%,-50%);pointer-events:none}
.lp-show .copy{position:relative;text-align:center;max-width:680px;margin:0 auto 40px;will-change:transform,opacity}
.lp-show .tag{display:inline-flex;align-items:center;gap:7px;color:#2e78ef;background:#eaf2fe;border-radius:99px;padding:6px 13px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.lp-show .tag:before{content:"";width:6px;height:6px;border-radius:50%;background:#2e78ef}
.lp-show h2{font-size:clamp(30px,4.2vw,48px);font-weight:800;letter-spacing:-.03em;line-height:1.08;margin:16px 0 12px;color:#101828}
.lp-show p.body{font-size:16px;line-height:1.65;color:#5b6575;margin:0 auto;max-width:560px}
.lp-show .frame{position:relative;width:100%;aspect-ratio:16/9;background:#fff;box-shadow:0 0 0 1px rgba(46,120,239,.14),0 40px 80px -30px rgba(46,120,239,.45),0 12px 30px -12px rgba(16,24,40,.12);overflow:hidden;will-change:transform,opacity}
.lp-show .frame.m{aspect-ratio:9/16;max-width:340px;margin:0 auto}
.lp-show video{display:block;width:100%;height:100%;object-fit:cover}
@media(max-width:640px){.lp-show{padding:20px 16px 56px}.lp-show .copy{margin-bottom:26px}.lp-show p.body{font-size:14px}}
      `}</style>
      {PROMOS.map((p) => <Reveal key={p.id} promo={p} />)}
    </section>
  );
}
