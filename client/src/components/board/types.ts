export const GOLD = "#d4b461";

export type NodeKind =
  // Sticky notes
  | "sticky-yellow" | "sticky-green" | "sticky-blue" | "sticky-pink"
  | "sticky-purple" | "sticky-orange" | "sticky-red" | "sticky-teal"
  // Basic shapes
  | "rectangle" | "rounded-rect" | "circle" | "diamond"
  // Flowchart
  | "process" | "decision" | "terminator" | "data" | "document" | "predefined-process"
  // Tech/architecture
  | "database" | "cloud" | "server" | "component" | "mobile" | "browser"
  // People
  | "person" | "actor" | "group"
  // Special canvas elements
  | "text" | "image" | "frame" | "section"
  // Rich interactive nodes
  | "kanban-card" | "code" | "checklist" | "ai-node" | "embed-card"
  // Other
  | "star" | "arrow-right" | "arrow-both";

export type ToolMode =
  | "select" | "sticky" | "shape" | "connector" | "text" | "image" | "hand" | "frame" | "section";

export type ConnectorStyle = "curved" | "straight" | "orthogonal" | "elbow";
export type ShapeStyle = "rectangle" | "rounded-rect" | "circle" | "diamond";
export type ArrowStyle = "arrow" | "dot" | "none";

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
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  rotation?: number;
  zIndex: number;
  shape?: ShapeStyle;
  opacity?: number;
  locked?: boolean;
  emoji?: string;
  tags?: string[];
  // Kanban card fields
  status?: "todo" | "inprogress" | "review" | "done" | "blocked";
  priority?: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  // Checklist fields
  items?: string[];
  checked?: boolean[];
  // Code block
  language?: string;
  // AI node
  modelName?: string;
  promptText?: string;
}

export interface BoardConnector {
  id: string;
  fromId: string;
  toId: string;
  fromPort?: "top" | "right" | "bottom" | "left" | "center";
  toPort?: "top" | "right" | "bottom" | "left" | "center";
  label?: string;
  color?: string;
  style?: ConnectorStyle;
  startArrow?: ArrowStyle;
  endArrow?: ArrowStyle;
  thickness?: number;
  animated?: boolean;
}

export interface HistoryEntry {
  nodes: BoardNode[];
  connectors: BoardConnector[];
}

export const STICKY_COLORS: { kind: NodeKind; bg: string; fg: string; name: string }[] = [
  { kind: "sticky-yellow", bg: "#fef3c7", fg: "#1a1a1a", name: "Yellow" },
  { kind: "sticky-green",  bg: "#dcfce7", fg: "#1a1a1a", name: "Green" },
  { kind: "sticky-blue",   bg: "#dbeafe", fg: "#1a1a1a", name: "Blue" },
  { kind: "sticky-pink",   bg: "#fce7f3", fg: "#1a1a1a", name: "Pink" },
  { kind: "sticky-purple", bg: "#ede9fe", fg: "#1a1a1a", name: "Purple" },
  { kind: "sticky-orange", bg: "#fed7aa", fg: "#1a1a1a", name: "Orange" },
  { kind: "sticky-red",    bg: "#fee2e2", fg: "#1a1a1a", name: "Red" },
  { kind: "sticky-teal",   bg: "#ccfbf1", fg: "#1a1a1a", name: "Teal" },
];

export const SHAPE_PRESETS: { kind: NodeKind; shape?: ShapeStyle; label: string; icon: string }[] = [
  { kind: "rectangle",    shape: "rectangle",    label: "Rectangle",  icon: "▭" },
  { kind: "rounded-rect", shape: "rounded-rect", label: "Rounded",    icon: "▢" },
  { kind: "circle",       shape: "circle",       label: "Circle",     icon: "○" },
  { kind: "diamond",      shape: "diamond",      label: "Diamond",    icon: "◇" },
  { kind: "process",                             label: "Process",    icon: "⬜" },
  { kind: "decision",                            label: "Decision",   icon: "◈" },
  { kind: "terminator",                          label: "Terminal",   icon: "⬬" },
  { kind: "database",                            label: "Database",   icon: "🗄" },
  { kind: "cloud",                               label: "Cloud",      icon: "☁" },
  { kind: "server",                              label: "Server",     icon: "🖥" },
  { kind: "person",                              label: "Person",     icon: "👤" },
  { kind: "document",                            label: "Document",   icon: "📄" },
  { kind: "kanban-card",                         label: "Kanban",     icon: "🃏" },
  { kind: "checklist",                           label: "Checklist",  icon: "✅" },
  { kind: "code",                                label: "Code",       icon: "{ }" },
  { kind: "ai-node",                             label: "AI Node",    icon: "✦" },
  { kind: "section",                             label: "Section",    icon: "⬚" },
];

export const CONNECTOR_COLORS = [
  "#d4b461", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6",
  "#f59e0b", "#ec4899", "#06b6d4", "#64748b", "#22c55e",
];

export const NODE_COLORS = [
  "#d4b461", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6",
  "#f59e0b", "#ec4899", "#06b6d4", "#1e293b", "#ffffff",
];

let _id = 0;
export function uid() { return `n${++_id}_${Math.random().toString(36).slice(2, 6)}`; }
export function cid() { return `c${++_id}_${Math.random().toString(36).slice(2, 6)}`; }
