import { useMemo } from "react";
import type { BoardConnector, BoardNode } from "./types";
import { CONNECTOR_COLORS } from "./types";

interface Props {
  connectors: BoardConnector[];
  nodes: BoardNode[];
  zoom: number;
}

export default function ConnectorRenderer({ connectors, nodes, zoom }: Props) {
  const paths = useMemo(() => {
    return connectors.map(c => {
      const from = nodes.find(n => n.id === c.fromId);
      const to = nodes.find(n => n.id === c.toId);
      if (!from || !to) return null;

      const x1 = from.x + from.w / 2;
      const y1 = from.y + from.h / 2;
      const x2 = to.x + to.w / 2;
      const y2 = to.y + to.h / 2;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const offset = Math.max(40, dist * 0.35);
      const cp1 = { x: x1 + dx * 0.25 - dy * 0.15, y: y1 + dy * 0.25 + dx * 0.15 };
      const cp2 = { x: x2 - dx * 0.25 + dy * 0.15, y: y2 - dy * 0.25 - dx * 0.15 };

      const d = `M ${x1} ${y1} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${x2} ${y2}`;
      const color = c.color ?? CONNECTOR_COLORS[0];

      const angle = Math.atan2(y2 - cp2.y, x2 - cp2.x);
      const aSize = 10 / zoom;
      const ax1 = x2 - aSize * Math.cos(angle - 0.4);
      const ay1 = y2 - aSize * Math.sin(angle - 0.4);
      const ax2 = x2 - aSize * Math.cos(angle + 0.4);
      const ay2 = y2 - aSize * Math.sin(angle + 0.4);

      return { id: c.id, d, color, label: c.label, midX, midY, ax1, ay1, ax2, ay2, x2, y2 };
    }).filter(Boolean);
  }, [connectors, nodes, zoom]);

  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {paths.map(p => p && (
        <g key={p.id}>
          <path d={p.d} fill="none" stroke={p.color} strokeWidth={4 / zoom} opacity={0.15} />
          <path d={p.d} fill="none" stroke={p.color} strokeWidth={2 / zoom} />
          <polygon
            points={`${p.x2},${p.y2} ${p.ax1},${p.ay1} ${p.ax2},${p.ay2}`}
            fill={p.color}
          />
          {p.label && (
            <foreignObject x={p.midX - 50} y={p.midY - 12} width={100} height={24}>
              <div style={{
                background: "rgba(10,10,15,0.85)", color: "#d4b461",
                textAlign: "center", fontSize: 11, borderRadius: 6,
                padding: "2px 6px", border: "1px solid rgba(212,180,97,0.25)",
                backdropFilter: "blur(8px)",
              }}>
                {p.label}
              </div>
            </foreignObject>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ── Single bezier path (for active/rubber-band connector) ── */
export function ConnectorPath({ from, to, color = "#d4b461", zoom = 1, dashed = false }: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  zoom?: number;
  dashed?: boolean;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.max(40, dist * 0.35);
  const cp1 = { x: from.x + dx * 0.25 - dy * 0.15, y: from.y + dy * 0.25 + dx * 0.15 };
  const cp2 = { x: to.x - dx * 0.25 + dy * 0.15, y: to.y - dy * 0.25 - dx * 0.15 };
  const d = `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;

  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: dashed ? 9999 : 2 }}>
      <path d={d} fill="none" stroke={color}
        strokeWidth={2 / zoom}
        strokeDasharray={dashed ? "6,4" : "none"}
        opacity={dashed ? 0.8 : 1} />
    </svg>
  );
}

/* ─── Rubber band connector being drawn ──────────── */
export function RubberBand({ from, to, zoom }: { from: { x: number; y: number } | null; to: { x: number; y: number }; zoom: number }) {
  if (!from) return null;
  return <ConnectorPath from={from} to={to} zoom={zoom} dashed />;
}
