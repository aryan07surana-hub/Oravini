import { useRef, useCallback, useEffect, type ReactNode, useState } from "react";

interface Props {
  viewX: number;
  viewY: number;
  zoom: number;
  onPan: (dx: number, dy: number) => void;
  onZoom: (dz: number, cx: number, cy: number) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  children?: ReactNode;
  width?: number;
  height?: number;
  mode: string;
}

export default function Canvas({
  viewX, viewY, zoom,
  onPan, onZoom, onCanvasClick,
  onMouseDown: onCanvasMouseDown,
  onMouseMove: onCanvasMouseMove,
  onMouseUp: onCanvasMouseUp,
  children, width, height, mode,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panning = useRef(false);
  const holdingSpace = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  const isHand = mode === "hand";

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onCanvasMouseDown?.(e);
    if (e.defaultPrevented) return;
    if (e.button === 1 || e.button === 0 && (isHand || (e.target as HTMLElement).dataset?.canvas === "bg")) {
      panning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, [onCanvasMouseDown, isHand]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    onCanvasMouseMove?.(e);
    if (panning.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onPan(dx, dy);
    }
  }, [onPan, onCanvasMouseMove]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    onCanvasMouseUp?.(e);
    panning.current = false;
  }, [onCanvasMouseUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dz = -e.deltaY * 0.001 * (e.metaKey || e.ctrlKey ? 4 : 1);
    onZoom(dz, cx, cy);
  }, [onZoom]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!panning.current && (e.target as HTMLElement).dataset?.canvas === "bg" && onCanvasClick) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = (e.clientX - rect.left - viewX) / zoom;
      const sy = (e.clientY - rect.top - viewY) / zoom;
      onCanvasClick(sx, sy);
    }
  }, [viewX, viewY, zoom, onCanvasClick]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") { holdingSpace.current = true; }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.code === "Space") { holdingSpace.current = false; }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", upHandler);
    return () => { window.removeEventListener("keydown", handler); window.removeEventListener("keyup", upHandler); };
  }, []);

  const gridSize = 40 * zoom;
  const dotSize = Math.max(0.5, zoom * 1.5);
  const dotOpacity = Math.min(0.25, zoom * 0.15);

  return (
    <div
      ref={containerRef}
      style={{
        width: width ?? "100%", height: height ?? "100%",
        position: "relative", overflow: "hidden",
        cursor: panning.current ? "grabbing" : isHand ? "grab" : "default",
        background: "#0a0a0f",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { panning.current = false; setHover(false); }}
      onWheel={handleWheel}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
    >
      {/* Dot grid */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <defs>
          <pattern id="board-grid" patternUnits="userSpaceOnUse"
            width={gridSize} height={gridSize}
            patternTransform={`translate(${viewX % gridSize},${viewY % gridSize})`}
          >
            <circle cx={0} cy={0} r={dotSize} fill="rgba(212,180,97,0.15)" opacity={dotOpacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#board-grid)" />
      </svg>

      {/* Content layer */}
      <div
        data-canvas="bg"
        style={{
          position: "absolute", inset: 0,
          transform: `translate(${viewX}px, ${viewY}px) scale(${zoom})`,
          transformOrigin: "0 0",
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>

      {/* Zoom badge */}
      {hover && (
        <div style={{
          position: "absolute", bottom: 12, right: 12,
          background: "rgba(15,23,42,0.85)", border: "1px solid rgba(212,180,97,0.3)",
          borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#d4b461",
          pointerEvents: "none",
          fontVariantNumeric: "tabular-nums",
        }}>
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}

export function MiniMap({ viewX, viewY, zoom, nodes, w = 160, h = 100 }: {
  viewX: number; viewY: number; zoom: number;
  nodes: { x: number; y: number; w: number; h: number }[];
  w?: number; h?: number;
}) {
  const allX = nodes.length ? nodes.map(n => n.x) : [0];
  const allY = nodes.length ? nodes.map(n => n.y) : [0];
  const minX = Math.min(...allX) - 100;
  const minY = Math.min(...allY) - 100;
  const maxX = Math.max(...allX) + Math.max(...nodes.map(n => n.w)) + 100;
  const maxY = Math.max(...allY) + Math.max(...nodes.map(n => n.h)) + 100;
  const rangeX = Math.max(maxX - minX, 600);
  const rangeY = Math.max(maxY - minY, 400);
  const scaleX = w / rangeX;
  const scaleY = h / rangeY;
  const s = Math.min(scaleX, scaleY);

  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12, width: w, height: h,
      background: "rgba(10,10,15,0.9)", borderRadius: 10,
      border: "1px solid rgba(212,180,97,0.25)", overflow: "hidden",
      backdropFilter: "blur(12px)", zIndex: 50,
    }}>
      <svg viewBox={`${minX} ${minY} ${rangeX} ${rangeY}`} width={w} height={h}>
        <rect x={minX} y={minY} width={rangeX} height={rangeY} fill="rgba(15,23,42,0.5)" rx={2} />
        {nodes.map((n, i) => (
          <rect key={i} x={n.x} y={n.y} width={Math.max(n.w, 4)} height={Math.max(n.h, 4)} fill="#d4b461" opacity={0.6} rx={1} />
        ))}
        <rect
          x={-viewX / zoom + minX} y={-viewY / zoom + minY}
          width={w / s * zoom} height={h / s * zoom}
          fill="none" stroke="#d4b461" strokeWidth={2 / s} rx={2}
        />
      </svg>
    </div>
  );
}
