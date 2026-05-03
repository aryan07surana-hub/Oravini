import { useState, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toPng } from "html-to-image";
import { LayoutTemplate, Download, Wand2, Plus, X, Sparkles, RefreshCw } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
══════════════════════════════════════════════════════════ */

const GOLD = "#d4b461";

type NodeType = "title" | "header" | "step" | "result" | "problem" | "decision" | "insight" | "info";
type LayoutMode = "flow" | "sections" | "contrast" | "mindmap";

const TYPE_STYLE: Record<NodeType, { bg: string; fg: string; accent: string; emoji: string }> = {
  title:    { bg: "#1a1208", fg: "#d4b461", accent: "#d4b461", emoji: "🎯" },
  header:   { bg: "#1e1333", fg: "#c4b5fd", accent: "#8b5cf6", emoji: "📌" },
  step:     { bg: "#0d1f35", fg: "#93c5fd", accent: "#3b82f6", emoji: "▶" },
  result:   { bg: "#0c2218", fg: "#6ee7b7", accent: "#10b981", emoji: "✅" },
  problem:  { bg: "#2a0e0e", fg: "#fca5a5", accent: "#ef4444", emoji: "⚠️" },
  decision: { bg: "#1f1500", fg: "#fcd34d", accent: "#f59e0b", emoji: "❓" },
  insight:  { bg: "#2a0d20", fg: "#f9a8d4", accent: "#ec4899", emoji: "💡" },
  info:     { bg: "#151a26", fg: "#94a3b8", accent: "#64748b", emoji: "◆" },
};

const SECTION_COLORS = [
  { bg: "#0d1f35", fg: "#93c5fd", accent: "#3b82f6" },
  { bg: "#0c2218", fg: "#6ee7b7", accent: "#10b981" },
  { bg: "#1e1333", fg: "#c4b5fd", accent: "#8b5cf6" },
  { bg: "#1f1500", fg: "#fcd34d", accent: "#f59e0b" },
  { bg: "#2a0d20", fg: "#f9a8d4", accent: "#ec4899" },
  { bg: "#0e1f20", fg: "#67e8f9", accent: "#06b6d4" },
];

interface FlowNode {
  id: string;
  type: NodeType;
  title: string;
  body?: string;
  step?: number;
  image?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sectionColorIdx?: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface ParsedBlock {
  type: NodeType;
  title: string;
  body?: string;
  children?: string[];
  isSection?: boolean;
}

/* ═══════════════════════════════════════════════════════════
   SMART ANALYZER
══════════════════════════════════════════════════════════ */

function uid() { return Math.random().toString(36).slice(2, 9); }

function classifyLine(line: string): NodeType {
  const l = line.toLowerCase().trim();
  if (l.endsWith("?")) return "decision";
  if (/^(result|outcome|success|revenue|profit|growth|win|achieve|so |therefore|in the end|finally)/i.test(l))
    return "result";
  if (/^(problem|issue|mistake|wrong|fail|never|don't|avoid|trap|bad|struggle|most people)/i.test(l))
    return "problem";
  if (/^(key|insight|secret|truth|remember|the real|you need to know|hack|pro tip)/i.test(l))
    return "insight";
  if (/^(step|phase|stage|part|section|\d+[\.\)])/i.test(l)) return "step";
  return "info";
}

function analyzeStructure(raw: string): { blocks: ParsedBlock[]; layout: LayoutMode } {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const blocks: ParsedBlock[] = [];

  // ─── Pass 1: group lines into semantic blocks
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // TITLE — first non-list line that looks like a heading
    if (i === 0 && !/^[-•*\d]/.test(line)) {
      blocks.push({ type: "title", title: line });
      i++;
      continue;
    }

    // SECTION HEADER — short line followed immediately by list items
    const nextIsListItem = i + 1 < lines.length && /^[-•*\d]/.test(lines[i + 1]);
    if (nextIsListItem && line.length < 80 && !/^[-•*\d]/.test(line)) {
      const header = line.replace(/:$/, "").trim();
      const children: string[] = [];
      i++;
      while (i < lines.length && /^[-•*\d]/.test(lines[i])) {
        const child = lines[i].replace(/^[-•*]\s*|^\d+[\.\)]\s*/, "").trim();
        if (child) children.push(child);
        i++;
      }
      blocks.push({ type: "header", title: header, children, isSection: true });
      continue;
    }

    // NUMBERED LIST ITEM
    if (/^\d+[\.\)]/.test(line)) {
      const text = line.replace(/^\d+[\.\)]\s*/, "").trim();
      blocks.push({ type: "step", title: text });
      i++;
      continue;
    }

    // BULLET LIST ITEM
    if (/^[-•*]/.test(line)) {
      const text = line.replace(/^[-•*]\s*/, "").trim();
      blocks.push({ type: classifyLine(text), title: text });
      i++;
      continue;
    }

    // LONG PARAGRAPH — split into title + body if > 80 chars
    if (line.length > 80) {
      const period = line.indexOf(". ");
      if (period > 0 && period < 60) {
        blocks.push({ type: classifyLine(line), title: line.slice(0, period + 1), body: line.slice(period + 2) });
      } else {
        blocks.push({ type: classifyLine(line), title: line });
      }
      i++;
      continue;
    }

    // DEFAULT
    blocks.push({ type: classifyLine(line), title: line });
    i++;
  }

  // ─── Pass 2: detect layout mode
  const sectionCount = blocks.filter(b => b.isSection).length;
  const stepCount = blocks.filter(b => b.type === "step").length;
  const hasTitle = blocks[0]?.type === "title";
  const hasProblemAndResult = blocks.some(b => b.type === "problem") && blocks.some(b => b.type === "result");

  let layout: LayoutMode = "flow";
  if (sectionCount >= 2) layout = "sections";
  else if (hasProblemAndResult && sectionCount === 0) layout = "contrast";
  else if (stepCount >= 3 || (hasTitle && blocks.length >= 3)) layout = "flow";

  return { blocks, layout };
}

/* ═══════════════════════════════════════════════════════════
   LAYOUT ENGINE
══════════════════════════════════════════════════════════ */

const NODE_W_LG = 340;
const NODE_W_MD = 240;
const NODE_W_SM = 200;
const ROW_GAP   = 30;
const COL_GAP   = 60;

function estimateHeight(node: { title: string; body?: string; image?: string; w: number }): number {
  const imgH = node.image ? 130 : 0;
  const titleLines = Math.ceil((node.title.length * 8) / node.w);
  const bodyLines = node.body ? Math.ceil((node.body.length * 7) / node.w) : 0;
  return imgH + 28 + titleLines * 22 + bodyLines * 18 + 24;
}

function buildLayout(blocks: ParsedBlock[], layout: LayoutMode): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let stepCounter = 0;

  // ─── FLOW LAYOUT (vertical spine)
  if (layout === "flow" || layout === "mindmap") {
    let y = 40;
    const cx = 300; // center x

    for (const block of blocks) {
      const w = block.type === "title" ? NODE_W_LG : block.isSection ? NODE_W_MD : NODE_W_SM;
      const x = cx - w / 2;
      const id = uid();
      if (block.type === "step") stepCounter++;

      const node: FlowNode = {
        id, type: block.type, title: block.title, body: block.body,
        step: block.type === "step" ? stepCounter : undefined,
        x, y, w, h: 0,
      };
      node.h = estimateHeight({ title: node.title, body: node.body, w: node.w });
      nodes.push(node);

      if (nodes.length > 1) edges.push({ from: nodes[nodes.length - 2].id, to: id });
      y += node.h + ROW_GAP;

      // Children of a section header — branch to the right
      if (block.isSection && block.children?.length) {
        const sectionIdx = nodes.filter(n => n.type === "header").length - 1;
        const col = SECTION_COLORS[sectionIdx % SECTION_COLORS.length];
        let cy = node.y;
        for (const child of block.children!) {
          const cid = uid();
          const cnode: FlowNode = {
            id: cid, type: "info", title: child,
            x: x + w + COL_GAP, y: cy, w: NODE_W_SM, h: 0,
            sectionColorIdx: sectionIdx,
          };
          cnode.h = estimateHeight({ title: cnode.title, w: cnode.w });
          nodes.push(cnode);
          edges.push({ from: id, to: cid });
          cy += cnode.h + 14;
        }
        y = Math.max(y, cy);
      }
    }
  }

  // ─── SECTIONS LAYOUT (parallel columns)
  else if (layout === "sections") {
    const titleBlock = blocks.find(b => b.type === "title");
    const sectionBlocks = blocks.filter(b => b.isSection);
    const others = blocks.filter(b => !b.isSection && b.type !== "title");

    // Title node at top center
    if (titleBlock) {
      const tid = uid();
      const w = NODE_W_LG;
      const totalSections = sectionBlocks.length;
      const totalW = totalSections * (NODE_W_MD + COL_GAP) - COL_GAP;
      const startX = 40;
      const centerX = startX + totalW / 2;
      const node: FlowNode = {
        id: tid, type: "title", title: titleBlock.title,
        x: centerX - w / 2, y: 40, w, h: 0,
      };
      node.h = estimateHeight({ title: node.title, w: node.w });
      nodes.push(node);
    }

    // Section columns
    const titleNode = nodes[0];
    let colX = 40;
    const sectionStartY = titleNode ? titleNode.y + titleNode.h + 50 : 40;

    sectionBlocks.forEach((section, si) => {
      const sid = uid();
      const col = SECTION_COLORS[si % SECTION_COLORS.length];
      const hNode: FlowNode = {
        id: sid, type: "header", title: section.title,
        x: colX, y: sectionStartY, w: NODE_W_MD, h: 0,
        sectionColorIdx: si,
      };
      hNode.h = estimateHeight({ title: hNode.title, w: hNode.w });
      nodes.push(hNode);
      if (titleNode) edges.push({ from: titleNode.id, to: sid });

      let childY = sectionStartY + hNode.h + 20;
      (section.children || []).forEach(child => {
        const cid = uid();
        const cnode: FlowNode = {
          id: cid, type: "info", title: child,
          x: colX, y: childY, w: NODE_W_MD, h: 0,
          sectionColorIdx: si,
        };
        cnode.h = estimateHeight({ title: cnode.title, w: cnode.w });
        nodes.push(cnode);
        edges.push({ from: cid === nodes[nodes.indexOf(cnode) - 1]?.id ? sid : nodes[nodes.indexOf(cnode) - 1]?.id ?? sid, to: cid });
        // simpler: chain children
        edges[edges.length - 1] = {
          from: nodes.length > 2 && nodes[nodes.indexOf(cnode) - 1]?.sectionColorIdx === si
            ? nodes[nodes.indexOf(cnode) - 1].id
            : sid,
          to: cid,
        };
        childY += cnode.h + 14;
      });

      colX += NODE_W_MD + COL_GAP;
    });

    // Other (non-section) blocks below all columns
    if (others.length) {
      const maxY = Math.max(...nodes.map(n => n.y + n.h)) + 50;
      let ox = 40; let oy = maxY;
      others.forEach(b => {
        const oid = uid();
        const on: FlowNode = {
          id: oid, type: b.type, title: b.title, body: b.body,
          x: ox, y: oy, w: NODE_W_SM, h: 0,
        };
        on.h = estimateHeight({ title: on.title, body: on.body, w: on.w });
        nodes.push(on);
        ox += NODE_W_SM + 30;
      });
    }
  }

  // ─── CONTRAST LAYOUT (problem vs result side by side)
  else if (layout === "contrast") {
    const titleBlock = blocks.find(b => b.type === "title");
    const problems = blocks.filter(b => b.type === "problem");
    const results = blocks.filter(b => b.type === "result");
    const insights = blocks.filter(b => b.type === "insight");
    const others = blocks.filter(b => !["title", "problem", "result", "insight"].includes(b.type));

    let y = 40;

    if (titleBlock) {
      const tid = uid();
      const tnode: FlowNode = {
        id: tid, type: "title", title: titleBlock.title,
        x: 300 - NODE_W_LG / 2, y, w: NODE_W_LG, h: 0,
      };
      tnode.h = estimateHeight({ title: tnode.title, w: tnode.w });
      nodes.push(tnode);
      y += tnode.h + 50;
    }

    // Problem column (left) & Result column (right)
    const allOther = [...others];
    const leftItems = problems.length ? problems : allOther.filter((_, i) => i % 2 === 0);
    const rightItems = results.length ? results : allOther.filter((_, i) => i % 2 === 1);

    const leftX = 40, rightX = 360;
    let ly = y, ry = y;

    leftItems.forEach(b => {
      const id = uid();
      const n: FlowNode = { id, type: b.type, title: b.title, x: leftX, y: ly, w: NODE_W_MD, h: 0 };
      n.h = estimateHeight({ title: n.title, w: n.w });
      nodes.push(n);
      if (nodes.length > 1 && nodes[nodes.length - 2].x === leftX)
        edges.push({ from: nodes[nodes.length - 2].id, to: id });
      else if (nodes[0]?.type === "title") edges.push({ from: nodes[0].id, to: id });
      ly += n.h + ROW_GAP;
    });

    rightItems.forEach(b => {
      const id = uid();
      const n: FlowNode = { id, type: b.type, title: b.title, x: rightX, y: ry, w: NODE_W_MD, h: 0 };
      n.h = estimateHeight({ title: n.title, w: n.w });
      nodes.push(n);
      if (nodes.filter(x => x.x === rightX).length > 1)
        edges.push({ from: nodes.filter(x => x.x === rightX)[nodes.filter(x => x.x === rightX).length - 2].id, to: id });
      else if (nodes[0]?.type === "title") edges.push({ from: nodes[0].id, to: id });
      ry += n.h + ROW_GAP;
    });

    // Insights at the bottom center
    insights.forEach(b => {
      const iy = Math.max(ly, ry) + 20;
      const id = uid();
      const n: FlowNode = { id, type: "insight", title: b.title, x: 300 - NODE_W_MD / 2, y: iy, w: NODE_W_MD, h: 0 };
      n.h = estimateHeight({ title: n.title, w: n.w });
      nodes.push(n);
    });
  }

  return { nodes, edges };
}

/* ═══════════════════════════════════════════════════════════
   ARROW RENDERER
══════════════════════════════════════════════════════════ */

function Arrow({ from, to, label, nodes }: { from: string; to: string; label?: string; nodes: FlowNode[] }) {
  const s = nodes.find(n => n.id === from);
  const t = nodes.find(n => n.id === to);
  if (!s || !t) return null;

  // Determine best connection points
  const sx = s.x + s.w / 2, sy = s.y + s.h;
  const tx = t.x + t.w / 2, ty = t.y;

  // If target is to the right (section children), connect right→left
  let px1 = sx, py1 = sy, px2 = tx, py2 = ty;
  if (Math.abs(t.x - s.x) > 100 && Math.abs(t.y - s.y) < 60) {
    px1 = s.x + s.w; py1 = s.y + s.h / 2;
    px2 = t.x;       py2 = t.y + t.h / 2;
  }

  const dy = py2 - py1;
  const dx = px2 - px1;
  const ctrl = Math.min(Math.abs(dy), Math.abs(dx)) * 0.5 + 30;
  const cp1x = px1, cp1y = py1 + (dy > 0 ? ctrl : -ctrl);
  const cp2x = px2, cp2y = py2 - (dy > 0 ? ctrl : -ctrl);

  const d = `M${px1},${py1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${px2},${py2}`;

  const angle = Math.atan2(py2 - cp2y, px2 - cp2x);
  const al = 10;
  const a1x = px2 - al * Math.cos(angle - 0.4), a1y = py2 - al * Math.sin(angle - 0.4);
  const a2x = px2 - al * Math.cos(angle + 0.4), a2y = py2 - al * Math.sin(angle + 0.4);

  const midX = (px1 + px2) / 2 + (cp1x - px1) * 0.3;
  const midY = (py1 + py2) / 2;

  return (
    <g>
      <path d={d} fill="none" stroke={GOLD} strokeWidth={1.8} strokeDasharray="6 4" opacity={0.6} />
      <polygon points={`${px2},${py2} ${a1x},${a1y} ${a2x},${a2y}`} fill={GOLD} opacity={0.8} />
      {label && (
        <text x={midX} y={midY} fill={GOLD} fontSize={10} fontWeight="600" textAnchor="middle" opacity={0.9}>
          {label}
        </text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   NODE CARD RENDERER
══════════════════════════════════════════════════════════ */

function NodeCard({
  node, selected, onSelect, onDelete, onImageUpload, onTextEdit, onColorCycle, onRemoveImage,
}: {
  node: FlowNode; selected: boolean;
  onSelect: () => void; onDelete: () => void;
  onImageUpload: (url: string) => void; onTextEdit: (t: string) => void;
  onColorCycle: () => void; onRemoveImage: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);

  const style = node.sectionColorIdx !== undefined
    ? SECTION_COLORS[node.sectionColorIdx % SECTION_COLORS.length]
    : TYPE_STYLE[node.type];

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  function pickImage() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = e => onImageUpload(e.target?.result as string);
      r.readAsDataURL(f);
    };
    inp.click();
  }

  const isTitle = node.type === "title";
  const accent = node.sectionColorIdx !== undefined
    ? SECTION_COLORS[node.sectionColorIdx % SECTION_COLORS.length].accent
    : TYPE_STYLE[node.type].accent;

  return (
    <div
      onClick={onSelect}
      style={{
        width: node.w,
        minHeight: node.h,
        background: (style as any).bg,
        border: selected
          ? `2px solid #fff`
          : `1px solid ${accent}55`,
        borderRadius: 16,
        overflow: "visible",
        position: "relative",
        boxShadow: selected
          ? `0 0 0 3px ${accent}80, 0 12px 40px ${accent}40`
          : `0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 ${accent}20`,
        cursor: "pointer",
        userSelect: "none",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: 4, background: accent, borderRadius: "14px 14px 0 0" }} />

      {/* Image */}
      {node.image && (
        <div style={{ width: "100%", height: 130, overflow: "hidden", position: "relative" }}>
          <img src={node.image} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
          {selected && (
            <button
              onClick={e => { stop(e); onRemoveImage(); }}
              onMouseDown={stop}
              style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X style={{ width: 11, height: 11, color: "#fff" }} />
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: isTitle ? "16px 20px" : "12px 16px" }}>
        {/* Step badge */}
        {node.step && (
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: "50%", background: accent,
            color: "#000", fontSize: 11, fontWeight: 800, marginBottom: 8,
          }}>
            {node.step}
          </div>
        )}

        {/* Title */}
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onTextEdit(draft); setEditing(false); }}
            onKeyDown={e => { if (e.key === "Escape") { setDraft(node.title); setEditing(false); } }}
            onClick={stop}
            onMouseDown={stop}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              color: (style as any).fg, fontSize: isTitle ? 17 : 13,
              fontWeight: isTitle ? 800 : 700, fontFamily: "inherit",
              resize: "none", lineHeight: 1.4, minHeight: 40,
            }}
          />
        ) : (
          <p
            onDoubleClick={e => { stop(e); setEditing(true); setDraft(node.title); }}
            style={{
              color: (style as any).fg, fontSize: isTitle ? 17 : 13,
              fontWeight: isTitle ? 800 : 700, lineHeight: 1.4, margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {node.title}
          </p>
        )}

        {/* Body text */}
        {node.body && (
          <p style={{ color: `${(style as any).fg}99`, fontSize: 11, lineHeight: 1.5, marginTop: 6, margin: "6px 0 0" }}>
            {node.body}
          </p>
        )}
      </div>

      {/* Toolbar */}
      {selected && !editing && (
        <div
          style={{
            position: "absolute", top: -42, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4, background: "#18181b", border: "1px solid #3f3f46",
            borderRadius: 12, padding: "5px 8px", zIndex: 50, whiteSpace: "nowrap",
          }}
          onClick={stop} onMouseDown={stop}
        >
          {[
            { emoji: "📷", title: "Add photo", fn: pickImage },
            { emoji: "🎨", title: "Cycle color", fn: onColorCycle },
            { emoji: "🗑️", title: "Delete", fn: onDelete },
          ].map(({ emoji, title, fn }) => (
            <button
              key={emoji}
              onClick={fn}
              title={title}
              style={{
                background: "transparent", border: "none", borderRadius: 7,
                padding: "2px 6px", cursor: "pointer", fontSize: 14, lineHeight: 1,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */

const BG_OPTS = [
  { label: "Dark",  v: "#0d0d0d" },
  { label: "Black", v: "#000000" },
  { label: "Slate", v: "#0f172a" },
  { label: "White", v: "#f8fafc" },
];

const TYPE_CYCLE: NodeType[] = ["title", "header", "step", "result", "problem", "decision", "insight", "info"];

export default function BoardBuilder() {
  const [script, setScript] = useState("");
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [bg, setBg] = useState("#0d0d0d");
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const canvasW = nodes.length ? Math.max(...nodes.map(n => n.x + n.w + 80), 700) : 700;
  const canvasH = nodes.length ? Math.max(...nodes.map(n => n.y + n.h + 80), 540) : 540;

  /* ── generate ── */
  async function generate() {
    if (!script.trim()) return;
    setAnalyzing(true);
    setSelected(null);
    // Give UI time to show loader, then analyze
    await new Promise(r => setTimeout(r, 900));
    const { blocks, layout } = analyzeStructure(script);
    const { nodes: n, edges: e } = buildLayout(blocks, layout);
    setNodes(n);
    setEdges(e);
    setLayoutMode(layout);
    setAnalyzing(false);
  }

  /* ── add blank node ── */
  function addNode() {
    const id = uid();
    const count = nodes.length;
    const lastId = count > 0 ? nodes[count - 1].id : null;
    const newNode: FlowNode = {
      id, type: "info", title: "New idea",
      x: 40 + (count % 2) * 280,
      y: 40 + Math.floor(count / 2) * 160,
      w: NODE_W_SM, h: 80,
    };
    setNodes(ns => [...ns, newNode]);
    if (lastId) setEdges(es => [...es, { from: lastId, to: id }]);
  }

  /* ── update / delete ── */
  function updateNode(id: string, patch: Partial<FlowNode>) {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n));
  }
  function deleteNode(id: string) {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.from !== id && e.to !== id));
    if (selected === id) setSelected(null);
  }
  function cycleType(id: string) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const cur = TYPE_CYCLE.indexOf(node.type);
    updateNode(id, { type: TYPE_CYCLE[(cur + 1) % TYPE_CYCLE.length] });
  }

  /* ── drag ── */
  function onNodeMouseDown(nodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragging(nodeId);
    setSelected(nodeId);
    setDragOff({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOff.x);
    const y = Math.max(0, e.clientY - rect.top - dragOff.y);
    setNodes(ns => ns.map(n => n.id === dragging ? { ...n, x, y } : n));
  }
  function onMouseUp() { setDragging(null); }

  /* ── export ── */
  async function doExport() {
    if (!canvasRef.current || !nodes.length) return;
    const prev = selected; setSelected(null); setExporting(true);
    await new Promise(r => setTimeout(r, 120));
    try {
      const url = await toPng(canvasRef.current, { pixelRatio: 2, backgroundColor: bg });
      const a = document.createElement("a"); a.href = url;
      a.download = "oravini-board.png"; a.click();
    } finally { setExporting(false); setSelected(prev); }
  }

  const LAYOUT_LABELS: Record<LayoutMode, string> = {
    flow: "Vertical Flow", sections: "Grouped Sections",
    contrast: "Contrast View", mindmap: "Mind Map",
  };

  return (
    <ClientLayout>
      <div className="flex flex-col bg-background" style={{ height: "100vh" }}>

        {/* Header */}
        <div data-tour="board-builder-main" className="border-b border-zinc-800 px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
            <LayoutTemplate className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white flex items-center gap-2">
              Board Builder
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${GOLD}20`, color: GOLD }}>
                <Sparkles className="w-2.5 h-2.5 inline mr-1" />Smart
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500">
              Paste any script → AI designs the flowchart for you
              {layoutMode && <span className="ml-2 text-zinc-600">· {LAYOUT_LABELS[layoutMode]} detected</span>}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {BG_OPTS.map(opt => (
                <button key={opt.v} onClick={() => setBg(opt.v)}
                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: bg === opt.v ? GOLD : "transparent", color: bg === opt.v ? "#000" : "#52525b" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button onClick={doExport} disabled={!nodes.length || exporting} size="sm"
              className="gap-1.5 font-bold text-xs" style={{ background: GOLD, color: "#000" }}
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? "Saving…" : "Export PNG"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-60 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Your Script</p>
              <Textarea
                data-testid="input-script"
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder={"Paste any raw text, script, or outline here — the smarter it reads, the better the chart.\n\nExamples that work great:\n\n• YouTube video scripts\n• \"How I did X\" stories\n• Step-by-step processes\n• Frameworks with headers + bullet points\n• Comparisons and contrasts"}
                className="min-h-[240px] text-xs bg-zinc-900 border-zinc-700 text-zinc-300 resize-none font-mono leading-relaxed"
              />
              <Button
                data-testid="button-generate"
                onClick={generate}
                disabled={analyzing || !script.trim()}
                className="w-full gap-2 font-bold"
                style={{ background: GOLD, color: "#000" }}
              >
                {analyzing
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</>
                  : <><Wand2 className="w-4 h-4" /> Build Flowchart</>
                }
              </Button>
              <button
                data-testid="button-add-node"
                onClick={addNode}
                className="flex items-center justify-center gap-2 py-2 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add blank node
              </button>

              <div className="border-t border-zinc-800 pt-3 space-y-1.5 text-[11px] text-zinc-500 leading-relaxed">
                <p className="font-semibold text-zinc-400 mb-1.5">What it detects automatically:</p>
                {[
                  ["🎯", "Titles & headings"],
                  ["▶", "Steps & processes"],
                  ["✅", "Results & outcomes"],
                  ["⚠️", "Problems & mistakes"],
                  ["❓", "Questions & decisions"],
                  ["💡", "Insights & key points"],
                ].map(([e, l]) => (
                  <p key={l as string}><span className="mr-1.5">{e}</span>{l}</p>
                ))}
                <p className="pt-1.5 text-zinc-600">• Drag nodes to rearrange<br />• Double-click text to edit<br />• Select → 📷 to add photo</p>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto">
            <div
              ref={canvasRef}
              data-testid="board-canvas"
              style={{ position: "relative", width: canvasW, height: canvasH, background: bg, cursor: dragging ? "grabbing" : "default", minWidth: 660, minHeight: 540 }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onClick={() => setSelected(null)}
            >
              {/* Empty / Analyzing state */}
              {!nodes.length && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, pointerEvents: "none" }}>
                  {analyzing ? (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: 18, background: `${GOLD}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sparkles style={{ width: 28, height: 28, color: GOLD }} />
                      </div>
                      <p style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Analyzing your script…</p>
                      <p style={{ color: "#52525b", fontSize: 12 }}>Detecting structure, types, and layout</p>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: 18, background: `${GOLD}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LayoutTemplate style={{ width: 28, height: 28, color: GOLD }} />
                      </div>
                      <p style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Your flowchart appears here</p>
                      <p style={{ color: "#52525b", fontSize: 12, textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
                        Paste your script and click <strong style={{ color: "#a1a1aa" }}>Build Flowchart</strong>
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Analyzing overlay (when rebuilding with existing nodes) */}
              {analyzing && nodes.length > 0 && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, borderRadius: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <Sparkles style={{ width: 32, height: 32, color: GOLD, margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                    <p style={{ color: "#fff", fontWeight: 700 }}>Rebuilding flowchart…</p>
                  </div>
                </div>
              )}

              {/* SVG arrows */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                {edges.map((edge, i) => (
                  <Arrow key={i} from={edge.from} to={edge.to} label={edge.label} nodes={nodes} />
                ))}
              </svg>

              {/* Nodes */}
              {nodes.map(node => (
                <div
                  key={node.id}
                  style={{ position: "absolute", left: node.x, top: node.y, zIndex: selected === node.id ? 20 : 1 }}
                  onMouseDown={e => onNodeMouseDown(node.id, e)}
                >
                  <NodeCard
                    node={node}
                    selected={selected === node.id}
                    onSelect={() => setSelected(node.id)}
                    onDelete={() => deleteNode(node.id)}
                    onImageUpload={url => updateNode(node.id, { image: url })}
                    onTextEdit={t => updateNode(node.id, { title: t })}
                    onColorCycle={() => cycleType(node.id)}
                    onRemoveImage={() => updateNode(node.id, { image: undefined })}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </ClientLayout>
  );
}
