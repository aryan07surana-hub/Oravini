import { useEffect, useRef } from "react";

/* Blue pointer for the landing page. Same arrow as the product demos. No trail, no ring.
   Only shown for fine pointers (mouse / trackpad). Touch devices keep their normal behaviour. */
export function LandingCursor({ all = false }: { all?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current!;
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0, down = false, hot = false, hidden = true;

    const paint = () => {
      x += (tx - x) * 0.55; y += (ty - y) * 0.55;
      const s = down ? 0.84 : hot ? 1.12 : 1;
      el.style.transform = `translate3d(${x - 5}px,${y - 3}px,0) scale(${s})`;
      el.style.opacity = hidden ? "0" : "1";
      raf = requestAnimationFrame(paint);
    };
    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY;
      if (hidden) { x = tx; y = ty; }
      const t = e.target as HTMLElement | null;
      hidden = !!t?.closest?.("input,textarea,select");
      hot = !!t?.closest?.("a,button,[role=button],summary,label");
    };
    const onDown = () => { down = true; };
    const onUp = () => { down = false; };
    const onLeave = () => { hidden = true; };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <style>{`@media (pointer:fine){${all ? "body,body *" : ".oravini-landing,.oravini-landing *"}{cursor:none!important}${all ? "body" : ".oravini-landing"} input,${all ? "body" : ".oravini-landing"} textarea,${all ? "body" : ".oravini-landing"} select{cursor:text!important}}
.lp-cursor{position:fixed;left:0;top:0;width:26px;height:26px;pointer-events:none;z-index:100000;opacity:0;will-change:transform;transition:opacity 160ms ease;filter:drop-shadow(0 0 1px #fff) drop-shadow(0 2px 3px rgba(46,120,239,.3))}
@media (pointer:coarse){.lp-cursor{display:none}}`}</style>
      <div ref={ref} className="lp-cursor" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#2e78ef" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
      </div>
    </>
  );
}
