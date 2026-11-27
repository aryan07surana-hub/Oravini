import { useEffect, useState } from "react";

const MEDIA = "https://oravini-media.pages.dev/";
const mediaFor = (id: string) => (["coach", "webinar", "ytlive"].includes(id) ? "https://oravini-media2.pages.dev/" : ["tracking", "documents", "competitor", "design", "analyser", "aivideo", "editor", "recorder", "projecttracker", "tools"].includes(id) ? "https://oravini-media3.pages.dev/" : MEDIA);
// Only the original five have vertical cuts (mp4 only). Newer videos are 16:9 and used on every screen size.
const VERTICAL = new Set(["dm", "web", "ideas", "sched", "hero"]);
const TITLES: Record<string, string> = {
  dm: "DM Automation in 30 seconds",
  web: "Webinars that sell while you present",
  ideas: "Never stare at a blank page again",
  sched: "Posting on autopilot",
  hero: "Your dashboard at a glance",
  dashboard: "Your dashboard at a glance",
  video: "Host and share your videos",
  community: "Learn and grow with the community",
  streaks: "Streaks and goals that keep you going",
  funnels: "Funnels and CRM in one place",
  live: "Inside the webinar live room",
  aisetter: "Your AI setter answers every DM",
  webstream: "Stream your webinar anywhere",
  aicrm: "Your AI CRM, every lead in one place",
  coach: "Meet your AI Content Coach",
  webinar: "The Oravini webinar platform",
  ytlive: "Run a webinar on YouTube Live",
};


// "Welcome to <tool>" copy shown above each tool's video.
const INTRO: Record<string, { name: string; sub: string; bullets: string[] }> = {
  dm: { name: "DM Automation", sub: "Watch this short walkthrough, then set up your first automation.", bullets: ["Reply to every comment with a DM", "Send your guide or link instantly", "Save each lead to your CRM", "Works on reels, posts and stories"] },
  aisetter: { name: "AI Setter", sub: "See how the AI handles your DMs, then switch it on.", bullets: ["Answers new DMs in seconds", "Asks the right qualifying questions", "Shares your booking link", "Hands hot leads to you"] },
  webinar: { name: "Webinars", sub: "A quick tour of building and running a webinar.", bullets: ["Registration page built for you", "Reminders sent automatically", "Offer pinned inside the room", "Replay and follow-up included"] },
  tracking: { name: "Tracking", sub: "See how your content, followers and competitors add up in one place.", bullets: ["Sync your recent Instagram posts with AI analysis", "Watch follower growth over time", "Import YouTube and plan on the calendar", "Follow competitors and your DM pipeline"] },
  ytlive: { name: "YouTube Live webinars", sub: "See how to go live on YouTube and still sell inside Oravini.", bullets: ["Stream to YouTube in one click", "Attendees register on your page", "Chat and offer in your own room", "Every attendee lands in your CRM"] },
  live: { name: "Webinar live room", sub: "A quick look at presenting from the live room.", bullets: ["Present slides and video", "Pin your offer at the right moment", "Watch sales land in the chat", "Invite panelists"] },
  webstream: { name: "Webinar streaming", sub: "Stream once and reach everyone.", bullets: ["Go live from the browser", "Stream to your audience", "Keep the replay ready to sell", "Track attendance"] },
  ideas: { name: "Content Ideas", sub: "Watch this short walkthrough, then start creating.", bullets: ["Hooks built around your niche", "Full scripts in seconds", "A 30-day content series", "Save your best ideas"] },
  sched: { name: "Content Scheduler", sub: "See how to queue a week of posts in minutes.", bullets: ["Queue reels, photos and carousels", "Publish on time, every time", "See your month on a calendar", "Reuse your best posts"] },
  dashboard: { name: "your dashboard", sub: "A quick tour of your home screen.", bullets: ["See credits, leads and registrations", "Check your next best step", "Track your goal and streak", "Jump into any tool"] },
  hero: { name: "Oravini", sub: "One place for ideas, posts, leads and webinars.", bullets: ["Everything shares the same data", "Nothing copied between apps", "AI built into every tool", "Made for creators and coaches"] },
  video: { name: "Video Hosting", sub: "Host videos that look like you.", bullets: ["Upload once, share a clean player", "Embed it anywhere", "See who watched and how long", "Add your offer at the right second"] },
  community: { name: "Community", sub: "Grow with creators on the same path.", bullets: ["Share wins and get feedback", "Ask questions, get real answers", "Learn from other creators", "Stay accountable"] },
  streaks: { name: "Streaks and goals", sub: "Stay consistent and hit your goal.", bullets: ["Set an income target", "Build a daily streak", "Watch your progress add up", "Earn your creator score"] },
  funnels: { name: "Pages and Funnels", sub: "From first click to paying client.", bullets: ["Build a page in minutes", "Capture the lead", "Follow up automatically", "Track every step"] },
  aicrm: { name: "AI CRM", sub: "Every lead in one clean pipeline.", bullets: ["Leads from DMs, forms and webinars", "Tagged and scored for you", "Next step always clear", "Nothing falls through"] },
  coach: { name: "AI Content Coach", sub: "A short walkthrough, then start creating.", bullets: ["Score your hook before posting", "Get caption, hashtags and story tease", "Learn from your own best reels", "Plan what to post next"] },
};

// Small blue "Watch how it works" button (bottom-right) that opens the matching promo video in a modal.
// It sits over the page, so it never changes a tool's own layout.
export function ToolVideoFab({ id: ids }: { id: keyof typeof TITLES | (keyof typeof TITLES)[] }) {
  const list = (Array.isArray(ids) ? ids : [ids]) as string[];
  const [cur, setCur] = useState(0);
  const id = list[Math.min(cur, list.length - 1)] as keyof typeof TITLES;
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(false);
  const [never, setNever] = useState(false);
  const key = `oravini_toolvideo_seen:${list[0]}`;
  // First visit to a tool: show its intro once. "Don't show again" is remembered per tool, plain Skip for this session.
  useEffect(() => {
    if (list[0] === "coach") return; // Content Coach has its own intro popup
    try { if (localStorage.getItem(key) || sessionStorage.getItem(key)) return; } catch { return; }
    const t = setTimeout(() => { setAuto(true); setOpen(true); }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const close = () => {
    setOpen(false);
    try { if (never) localStorage.setItem(key, "1"); else sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
  };
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    const f = () => setMobile(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const tall = mobile && VERTICAL.has(id);
  const shape = tall ? "9x16" : "16x9";
  return (
    <>
      <button
        type="button"
        onClick={() => { setAuto(false); setOpen(true); }}
        aria-label={`Watch: ${TITLES[id]}`}
        style={{ position: "fixed", right: 84, bottom: 22, zIndex: 60, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px 10px 12px", borderRadius: 999, border: "1px solid #d6e4f5", background: "#fff", color: "#2e78ef", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 28px -12px rgba(46,120,239,.55)" }}
      >
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#2e78ef", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>
        </span>
        How it works
      </button>
      {open && (() => {
        const info = INTRO[list[0]] || INTRO[id];
        return (
        <div role="dialog" aria-modal="true" aria-label={TITLES[id]} onClick={close} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(16,24,40,.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: tall ? "min(380px,100%)" : "min(640px,100%)", background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid #e3e9f3", boxShadow: "0 40px 90px -30px rgba(46,120,239,.55)", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 14px", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: "#eaf2fe", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2e78ef"><path d="M6 4l14 8-14 8z" /></svg>
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#101828", lineHeight: 1.2 }}>Welcome to {info?.name || TITLES[id]}</div>
                  <div style={{ fontSize: 12, color: "#6b7686", marginTop: 3 }}>{info?.sub || "A short walkthrough, then start creating."}</div>
                </div>
              </div>
              <button type="button" onClick={close} aria-label="Close" style={{ border: 0, background: "#eff5fd", color: "#2e78ef", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16, lineHeight: 1, flex: "none" }}>×</button>
            </div>
            {list.length > 1 && (
              <div style={{ display: "flex", gap: 6, padding: "0 24px 10px", flexWrap: "wrap" }}>
                {list.map((x, i) => (
                  <button key={x} type="button" onClick={() => setCur(i)} style={{ border: "1px solid #d6e4f5", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: i === cur ? "#2e78ef" : "#fff", color: i === cur ? "#fff" : "#2e78ef" }}>{INTRO[x]?.name || TITLES[x as keyof typeof TITLES] || x}</button>
                ))}
              </div>
            )}
            <div style={{ padding: "0 24px" }}>
              <video key={shape + id} poster={`${mediaFor(id)}${id}.jpg`} autoPlay muted={auto} loop playsInline controls preload="metadata" style={{ display: "block", width: "100%", aspectRatio: tall ? "9/16" : "16/9", background: "#eef4fe", objectFit: "cover", borderRadius: 12, border: "1px solid #e3e9f3" }}>
                {!tall && <source src={`${mediaFor(id)}${id}_${shape}.webm`} type="video/webm" />}
                <source src={`${mediaFor(id)}${id}_${shape}.mp4`} type="video/mp4" />
              </video>
            </div>
            {info && (
              <div style={{ display: "grid", gridTemplateColumns: tall ? "1fr" : "1fr 1fr", gap: "8px 16px", padding: "16px 24px 6px" }}>
                {info.bullets.map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#414a58" }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#eaf2fe", color: "#2e78ef", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>✓</span>{b}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 24px 20px", marginTop: 10, borderTop: "1px solid #e3e9f3", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#5b6675", cursor: "pointer" }}>
                <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} style={{ accentColor: "#2e78ef", width: 16, height: 16 }} />
                Don't show this again
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={close} style={{ border: "1px solid #d6e4f5", background: "#fff", color: "#2e78ef", borderRadius: 10, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Skip</button>
                <button type="button" onClick={close} style={{ border: 0, background: "#2e78ef", color: "#fff", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 20px -10px rgba(46,120,239,.7)" }}>Let's go</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}

export function withToolVideo<P extends object>(Page: React.ComponentType<P>, id: keyof typeof TITLES | (keyof typeof TITLES)[]) {
  return function WithToolVideo(props: P) {
    return (<><Page {...props} /><ToolVideoFab id={id} /></>);
  };
}
