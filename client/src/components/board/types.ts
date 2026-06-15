export const GOLD = "#d4b461";

export type NodeKind =
  | "sticky-yellow" | "sticky-green" | "sticky-blue" | "sticky-pink"
  | "sticky-purple" | "sticky-orange"
  | "rectangle" | "rounded-rect" | "circle" | "diamond"
  | "text" | "image" | "frame"
  | "process" | "decision" | "terminator" | "star" | "database" | "cloud"
  | "person" | "document";

export type ToolMode =
  | "select" | "sticky" | "shape" | "connector" | "text" | "image" | "hand";

export type ConnectorStyle = "curved" | "straight" | "orthogonal";
export type ShapeStyle = "rectangle" | "rounded-rect" | "circle" | "diamond";

export interface BoardNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  body?: string;
  imageUrl?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  rotation?: number;
  zIndex: number;
  shape?: ShapeStyle;
  opacity?: number;
}

export interface BoardConnector {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
  style?: ConnectorStyle;
}

export interface HistoryEntry {
  nodes: BoardNode[];
  connectors: BoardConnector[];
}

export const STICKY_COLORS: { kind: NodeKind; bg: string; fg: string }[] = [
  { kind: "sticky-yellow", bg: "#fff3c4", fg: "#1a1a1a" },
  { kind: "sticky-green",  bg: "#c8e6c9", fg: "#1a1a1a" },
  { kind: "sticky-blue",   bg: "#bbdefb", fg: "#1a1a1a" },
  { kind: "sticky-pink",   bg: "#f8bbd0", fg: "#1a1a1a" },
  { kind: "sticky-purple", bg: "#e1bee7", fg: "#1a1a1a" },
  { kind: "sticky-orange", bg: "#ffe0b2", fg: "#1a1a1a" },
];

export const SHAPE_PRESETS: { kind: NodeKind; shape: ShapeStyle; label: string }[] = [
  { kind: "rectangle",    shape: "rectangle",    label: "Rectangle" },
  { kind: "rounded-rect", shape: "rounded-rect", label: "Rounded" },
  { kind: "circle",       shape: "circle",       label: "Circle" },
  { kind: "diamond",      shape: "diamond",      label: "Diamond" },
];

export const CONNECTOR_COLORS = ["#d4b461", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"];
export const NODE_COLORS = ["#d4b461", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#64748b", "#ffffff"];

let _id = 0;
export function uid() { return `n${++_id}_${Math.random().toString(36).slice(2, 6)}`; }
export function cid() { return `c${++_id}_${Math.random().toString(36).slice(2, 6)}`; }
