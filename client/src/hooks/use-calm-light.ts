import { useEffect } from "react";

const RGB = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g;
const BLUE = [46, 120, 239];

function isDark(r: number, g: number, b: number, a: number) {
  return a >= 1 && Math.max(r, g, b) <= 48;
}
function isGold(r: number, g: number, b: number) {
  return r >= 150 && g >= 115 && g <= 220 && b <= 145 && r > g && g > b + 25;
}

/** Rewrites inline dark and gold colours to white and brand blue. */
function fixInline(el: Element) {
  const css = el.getAttribute("style");
  if (!css || !/rgb/.test(css)) return;
  const out = css.split(";").map((decl) => {
    const i = decl.indexOf(":");
    if (i < 0) return decl;
    const name = decl.slice(0, i).trim().toLowerCase();
    const isBg = name.startsWith("background");
    const isShadow = name === "box-shadow" || name === "text-shadow";
    return decl.slice(0, i + 1) + decl.slice(i + 1).replace(RGB, (m, r, g, b, a) => {
      const R = +r, G = +g, B = +b, A = a === undefined ? 1 : +a;
      if (isGold(R, G, B)) return `rgba(${BLUE[0]}, ${BLUE[1]}, ${BLUE[2]}, ${A})`;
      if (isBg && isDark(R, G, B, A)) return "rgb(255, 255, 255)";
      if (isShadow && Math.max(R, G, B) <= 20 && A > 0.2) return `rgba(20, 30, 60, ${Math.min(A, 0.12)})`;
      return m;
    });
  }).join(";");
  if (out !== css) el.setAttribute("style", out);
}

/** White/blue light theme for every signed-in screen. Restored on leave. */
export function useCalmLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const had = root.classList.contains("calm-light");
    root.classList.remove("dark");
    root.classList.add("calm-light");
    if (!document.getElementById("calm-inter")) {
      const link = document.createElement("link");
      link.id = "calm-inter"; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(link);
    }
    const pending = new Set<Element>();
    let raf = 0;
    const flush = () => { raf = 0; pending.forEach(fixInline); pending.clear(); };
    const queue = (el: Element) => { pending.add(el); if (!raf) raf = requestAnimationFrame(flush); };
    const scan = (n: Element) => { if (n.hasAttribute("style")) queue(n); n.querySelectorAll("[style]").forEach(queue); };
    scan(document.body);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes") queue(m.target as Element);
        else m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n as Element); });
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
    return () => {
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (!had) root.classList.remove("calm-light");
      if (wasDark) root.classList.add("dark");
    };
  }, []);
}
