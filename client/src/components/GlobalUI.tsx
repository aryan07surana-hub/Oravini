import { useEffect, useRef } from "react";

const GOLD = "212,180,97";

declare global {
  interface Window { __atomicParticles?: { x: number; y: number }[]; }
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const pts = useRef<{ x: number; y: number; t: number }[]>([]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.body.style.cursor = "none";
    const canvas = trailRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let curX = -999, curY = -999;

    const onMove = (e: MouseEvent) => {
      curX = e.clientX; curY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top = e.clientY + "px";
        dotRef.current.style.opacity = "1";
      }
      if (ringRef.current) {
        ringRef.current.style.left = e.clientX + "px";
        ringRef.current.style.top = e.clientY + "px";
        ringRef.current.style.opacity = "1";
      }
      const now = Date.now();
      pts.current.push({ x: e.clientX, y: e.clientY, t: now });
      pts.current = pts.current.filter(p => now - p.t < 700);
    };

    const onDown = () => {
      if (dotRef.current) dotRef.current.style.transform = "translate(-50%,-50%) scale(2)";
      if (ringRef.current) { ringRef.current.style.transform = "translate(-50%,-50%) scale(1.5)"; ringRef.current.style.borderColor = `rgba(${GOLD},0.6)`; }
    };
    const onUp = () => {
      if (dotRef.current) dotRef.current.style.transform = "translate(-50%,-50%) scale(1)";
      if (ringRef.current) { ringRef.current.style.transform = "translate(-50%,-50%) scale(1)"; ringRef.current.style.borderColor = `rgba(${GOLD},0.35)`; }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const trail = pts.current.filter(p => now - p.t < 650);

      if (trail.length >= 2) {
        for (let i = 1; i < trail.length; i++) {
          const age = (now - trail[i].t) / 650;
          const opacity = (1 - age) * 0.65;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `rgba(${GOLD},${opacity})`;
          ctx.lineWidth = Math.max(0.3, 1.8 * (1 - age));
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      if (curX > 0) {
        const particles = window.__atomicParticles || [];
        const LINK_DIST = 130;
        for (const p of particles) {
          const dx = p.x - curX, dy = p.y - curY;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const alpha = 0.35 * (1 - d / LINK_DIST);
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${GOLD},${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.lineCap = "round";
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      document.body.style.cursor = "";
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      <canvas ref={trailRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10000 }} />
      <div ref={ringRef} style={{ position: "fixed", width: 30, height: 30, borderRadius: "50%", border: `1px solid rgba(${GOLD},0.35)`, pointerEvents: "none", zIndex: 10001, transform: "translate(-50%,-50%)", opacity: 0, transition: "left 0.07s ease, top 0.07s ease, opacity 0.2s, transform 0.15s ease, border-color 0.15s ease" }} />
      <div ref={dotRef} style={{ position: "fixed", width: 6, height: 6, borderRadius: "50%", background: `#d4b461`, pointerEvents: "none", zIndex: 10002, transform: "translate(-50%,-50%) scale(1)", boxShadow: `0 0 10px rgba(${GOLD},0.9)`, opacity: 0, transition: "transform 0.1s ease, opacity 0.2s" }} />
    </>
  );
}

export function GlobalBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const active = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 55;
    const CONNECT = 120;
    const CURSOR_ATTRACT = 150;
    const CURSOR_PUSH = 50;

    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 0.9 + 0.2,
      o: Math.random() * 0.18 + 0.04,
    }));

    const onMouse = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      active.current = true;
    };
    window.addEventListener("mousemove", onMouse);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x, my = mouse.current.y;

      ps.forEach(p => {
        if (active.current) {
          const dx = p.x - mx, dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CURSOR_PUSH && d > 0) {
            const force = (CURSOR_PUSH - d) / CURSOR_PUSH;
            p.vx += (dx / d) * force * 0.4;
            p.vy += (dy / d) * force * 0.4;
          } else if (d < CURSOR_ATTRACT && d > 0) {
            const pull = (1 - d / CURSOR_ATTRACT) * 0.012;
            p.vx -= (dx / d) * pull;
            p.vy -= (dy / d) * pull;
          }
        }
        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${GOLD},${p.o})`;
        ctx.fill();
      });

      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT) {
            const alpha = 0.1 * (1 - d / CONNECT);
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(${GOLD},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      window.__atomicParticles = ps.map(p => ({ x: p.x, y: p.y }));

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", display: "block" }} />;
}
