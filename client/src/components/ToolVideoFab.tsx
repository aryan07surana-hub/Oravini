import { useEffect, useState } from "react";

const MEDIA = "https://oravini-media.pages.dev/";
const mediaFor = (id: string) => (id === "coach" ? "https://oravini-media2.pages.dev/" : MEDIA);
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
};

// Small blue "Watch how it works" button (bottom-right) that opens the matching promo video in a modal.
// It sits over the page, so it never changes a tool's own layout.
export function ToolVideoFab({ id: ids }: { id: keyof typeof TITLES | (keyof typeof TITLES)[] }) {
  const list = (Array.isArray(ids) ? ids : [ids]) as string[];
  const [cur, setCur] = useState(0);
  const id = list[Math.min(cur, list.length - 1)] as keyof typeof TITLES;
  const [open, setOpen] = useState(false);
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
        onClick={() => setOpen(true)}
        aria-label={`Watch: ${TITLES[id]}`}
        style={{ position: "fixed", right: 84, bottom: 22, zIndex: 60, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px 10px 12px", borderRadius: 999, border: "1px solid #d6e4f5", background: "#fff", color: "#2e78ef", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 28px -12px rgba(46,120,239,.55)" }}
      >
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#2e78ef", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z" /></svg>
        </span>
        How it works
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={TITLES[id]} onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(16,24,40,.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: tall ? "min(340px,100%)" : "min(960px,100%)", background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 90px -30px rgba(46,120,239,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e3e9f3" }}>
              <strong style={{ fontSize: 14, color: "#101828" }}>{TITLES[id]}</strong>
              {list.length > 1 && (
                <span style={{ display: "inline-flex", gap: 6, marginLeft: "auto", marginRight: 12 }}>
                  {list.map((x, i) => (
                    <button key={x} type="button" onClick={() => setCur(i)} style={{ border: "1px solid #d6e4f5", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: i === cur ? "#2e78ef" : "#fff", color: i === cur ? "#fff" : "#2e78ef" }}>{i + 1}</button>
                  ))}
                </span>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ border: 0, background: "#eff5fd", color: "#2e78ef", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <video key={shape} poster={`${mediaFor(id)}${id}.jpg`} autoPlay loop playsInline controls preload="metadata" style={{ display: "block", width: "100%", aspectRatio: tall ? "9/16" : "16/9", background: "#eff5fd", objectFit: "cover" }}>
              {!tall && <source src={`${mediaFor(id)}${id}_${shape}.webm`} type="video/webm" />}
              <source src={`${mediaFor(id)}${id}_${shape}.mp4`} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </>
  );
}

export function withToolVideo<P extends object>(Page: React.ComponentType<P>, id: keyof typeof TITLES | (keyof typeof TITLES)[]) {
  return function WithToolVideo(props: P) {
    return (<><Page {...props} /><ToolVideoFab id={id} /></>);
  };
}
