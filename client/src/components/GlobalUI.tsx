import { useEffect, useRef } from "react";

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
      pts.current = pts.current.filter(p => now - p.t < 900);
    };

    const onDown = () => {
      if (dotRef.current) { dotRef.current.style.transform = "translate(-50%,-50%) scale(1.8)"; }
    };
    const onUp = () => {
      if (dotRef.current) { dotRef.current.style.transform = "translate(-50%,-50%) scale(1)"; }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const trail = pts.current.filter(p => now - p.t < 800);
      if (trail.length >= 2) {
        for (let i = 1; i < trail.length; i++) {
          const age = (now - trail[i].t) / 800;
          const opacity = (1 - age) * 0.5;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `rgba(212,180,97,${opacity})`;
          ctx.lineWidth = Math.max(0.4, 2 * (1 - age * 0.7));
          ctx.lineCap = "round";
          ctx.stroke();
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
      <canvas ref={trailRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9996 }} />
      <div ref={ringRef} style={{ position: "fixed", width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(212,180,97,0.35)", pointerEvents: "none", zIndex: 9997, transform: "translate(-50%,-50%)", opacity: 0, transition: "left 0.08s ease, top 0.08s ease, opacity 0.2s" }} />
      <div ref={dotRef} style={{ position: "fixed", width: 7, height: 7, borderRadius: "50%", background: "#d4b461", pointerEvents: "none", zIndex: 9999, transform: "translate(-50%,-50%) scale(1)", boxShadow: "0 0 10px rgba(212,180,97,0.8)", opacity: 0, transition: "transform 0.12s ease, opacity 0.2s" }} />
    </>
  );
}

export function GlobalBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -999, y: -999 });

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

    const N = 40;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1.0 + 0.2,
      o: Math.random() * 0.14 + 0.03,
    }));

    const onMouse = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouse);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my } = mouse.current;
      ps.forEach(p => {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 80) { p.vx += (dx / d) * 0.012; p.vy += (dy / d) * 0.012; }
        p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,180,97,${p.o})`;
        ctx.fill();
      });
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(212,180,97,${0.06 * (1 - d / 90)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
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
