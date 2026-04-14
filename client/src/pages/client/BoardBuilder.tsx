import { useState, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toPng } from "html-to-image";
import { LayoutTemplate, Download, Wand2, Plus, Trash2, X } from "lucide-react";

/* ─── Palette ─────────────────────────────────────────────── */
const PALETTE = [
  { bg: "#f59e0b", fg: "#000" },
  { bg: "#8b5cf6", fg: "#fff" },
  { bg: "#ec4899", fg: "#fff" },
  { bg: "#10b981", fg: "#fff" },
  { bg: "#3b82f6", fg: "#fff" },
  { bg: "#f97316", fg: "#fff" },
  { bg: "#06b6d4", fg: "#fff" },
  { bg: "#ef4444", fg: "#fff" },
  { bg: "#a855f7", fg: "#fff" },
  { bg: "#14b8a6", fg: "#fff" },
  { bg: "#84cc16", fg: "#000" },
  { bg: "#d4b461", fg: "#000" },
];

const NODE_W = 210;
const COL_GAP = 280;
const ROW_GAP = 180;
const NODE_H_TEXT = 110;
const NODE_H_IMG  = 230;

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─── Types ────────────────────────────────────────────────── */
interface Node {
  id: string;
  text: string;
  image?: string;
  colorIdx: number;
  x: number;
  y: number;
}
interface Edge { from: string; to: string; }

/* ─── Parser ───────────────────────────────────────────────── */
function parse(raw: string): { nodes: Node[]; edges: Edge[] } {
  if (!raw.trim()) return { nodes: [], edges: [] };
  const items: string[] = [];
  const blocks = raw.split(/\n[ \t]*\n/).map(b => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const isList = lines.length > 1 && lines.every(l => /^[\d\-\•\*]/.test(l));
    if (isList) {
      lines.forEach(l => {
        const clean = l.replace(/^\d+[\.\)]\s*|^[-•*]\s*/, "").trim();
        if (clean) items.push(clean);
      });
    } else {
      items.push(block);
    }
  }
  const nodes: Node[] = items.map((text, i) => ({
    id: uid(), text,
    colorIdx: i % PALETTE.length,
    x: 40 + (i % 2) * COL_GAP,
    y: 40 + Math.floor(i / 2) * ROW_GAP,
  }));
  const edges: Edge[] = nodes.slice(0, -1).map((n, i) => ({ from: n.id, to: nodes[i + 1].id }));
  return { nodes, edges };
}

/* ─── Arrow ────────────────────────────────────────────────── */
function Arrow({ from, to, nodes }: { from: string; to: string; nodes: Node[] }) {
  const s = nodes.find(n => n.id === from);
  const t = nodes.find(n => n.id === to);
  if (!s || !t) return null;
  const sh = s.image ? NODE_H_IMG : NODE_H_TEXT;
  const th = t.image ? NODE_H_IMG : NODE_H_TEXT;
  const sx = s.x + NODE_W / 2, sy = s.y + sh;
  const tx = t.x + NODE_W / 2, ty = t.y;
  const mid = (ty - sy) / 2;
  const d = `M${sx},${sy} C${sx},${sy + mid} ${tx},${ty - mid} ${tx},${ty}`;
  const angle = Math.atan2(ty - (ty - mid), tx - tx);
  const al = 11;
  const a1x = tx - al * Math.cos(angle - 0.45), a1y = ty - al * Math.sin(angle - 0.45);
  const a2x = tx - al * Math.cos(angle + 0.45), a2y = ty - al * Math.sin(angle + 0.45);
  return (
    <g>
      <path d={d} fill="none" stroke="#d4b461" strokeWidth={2.5} strokeDasharray="7 4" opacity={0.75} />
      <polygon points={`${tx},${ty} ${a1x},${a1y} ${a2x},${a2y}`} fill="#d4b461" opacity={0.9} />
    </g>
  );
}

/* ─── Node card ────────────────────────────────────────────── */
function NodeCard({
  node, selected, onSelect, onDelete, onImageUpload, onTextSave, onColorChange, onRemoveImage,
}: {
  node: Node; selected: boolean;
  onSelect: () => void; onDelete: () => void;
  onImageUpload: (url: string) => void; onTextSave: (t: string) => void;
  onColorChange: (i: number) => void; onRemoveImage: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.text);
  const [showColors, setShowColors] = useState(false);
  const { bg, fg } = PALETTE[node.colorIdx];

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

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      onClick={onSelect}
      style={{
        width: NODE_W,
        minHeight: node.image ? NODE_H_IMG : NODE_H_TEXT,
        background: bg,
        borderRadius: 18,
        overflow: "visible",
        position: "relative",
        boxShadow: selected
          ? `0 0 0 3px #fff, 0 0 0 6px ${bg}99, 0 12px 40px ${bg}60`
          : `0 6px 24px ${bg}55`,
        border: selected ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
        cursor: "pointer",
        transition: "box-shadow 0.18s",
        userSelect: "none",
      }}
    >
      {/* Image */}
      {node.image && (
        <div style={{ width: "100%", height: 130, borderRadius: "16px 16px 0 0", overflow: "hidden", position: "relative" }}>
          <img src={node.image} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
          {selected && (
            <button
              onClick={e => { stop(e); onRemoveImage(); }}
              onMouseDown={stop}
              style={{
                position: "absolute", top: 6, right: 6,
                background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
                width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X style={{ width: 12, height: 12, color: "#fff" }} />
            </button>
          )}
        </div>
      )}

      {/* Text */}
      <div style={{ padding: "14px 16px", minHeight: 82 }}>
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onTextSave(draft); setEditing(false); }}
            onKeyDown={e => { if (e.key === "Escape") { setDraft(node.text); setEditing(false); } }}
            onClick={stop}
            onMouseDown={stop}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              color: fg, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              resize: "none", lineHeight: 1.45, minHeight: 70,
            }}
          />
        ) : (
          <p
            onDoubleClick={e => { stop(e); setEditing(true); setDraft(node.text); }}
            style={{ color: fg, fontSize: 13, fontWeight: 700, lineHeight: 1.45, margin: 0, whiteSpace: "pre-wrap" }}
          >
            {node.text}
          </p>
        )}
      </div>

      {/* Toolbar (selected) */}
      {selected && !editing && (
        <div
          style={{
            position: "absolute", top: -44, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 5, background: "#1c1c1c", border: "1px solid #333",
            borderRadius: 12, padding: "5px 8px", zIndex: 50, whiteSpace: "nowrap",
          }}
          onClick={stop}
          onMouseDown={stop}
        >
          <ToolBtn onClick={pickImage} title="Add photo">📷</ToolBtn>
          {node.image && <ToolBtn onClick={onRemoveImage} title="Remove photo">🖼️</ToolBtn>}
          <ToolBtn onClick={() => setShowColors(c => !c)} title="Color">🎨</ToolBtn>
          <ToolBtn onClick={onDelete} title="Delete" danger>🗑️</ToolBtn>
        </div>
      )}

      {/* Color palette */}
      {showColors && selected && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 10px)", left: 0,
            background: "#1c1c1c", border: "1px solid #333", borderRadius: 14,
            padding: 10, display: "flex", flexWrap: "wrap", gap: 7,
            width: NODE_W, zIndex: 60,
          }}
          onClick={stop}
          onMouseDown={stop}
        >
          {PALETTE.map((p, i) => (
            <button
              key={i}
              title={p.bg}
              onClick={() => { onColorChange(i); setShowColors(false); }}
              style={{
                width: 26, height: 26, borderRadius: 7, background: p.bg, cursor: "pointer",
                border: node.colorIdx === i ? "2.5px solid #fff" : "2.5px solid transparent",
                boxShadow: node.colorIdx === i ? `0 0 0 1px ${p.bg}` : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, children, title, danger }: { onClick: () => void; children: React.ReactNode; title?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: danger ? "#ef444420" : "transparent",
        border: danger ? "1px solid #ef444460" : "none",
        borderRadius: 7, padding: "2px 6px", cursor: "pointer", fontSize: 14, lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
const BG_OPTS = [
  { label: "Dark", v: "#111" },
  { label: "Black", v: "#000" },
  { label: "White", v: "#fff" },
  { label: "Navy", v: "#0f172a" },
];

export default function BoardBuilder() {
  const [script, setScript] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [bg, setBg] = useState("#111");
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const canvasW = nodes.length ? Math.max(...nodes.map(n => n.x + NODE_W + 60), 660) : 660;
  const canvasH = nodes.length ? Math.max(...nodes.map(n => n.y + (n.image ? NODE_H_IMG : NODE_H_TEXT) + 80), 520) : 520;

  /* generate */
  function generate() {
    const result = parse(script);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedId(null);
  }

  /* add blank node */
  function addNode() {
    const id = uid();
    const count = nodes.length;
    const lastId = count > 0 ? nodes[count - 1].id : null;
    const newNode: Node = {
      id, text: "New idea",
      colorIdx: count % PALETTE.length,
      x: 40 + (count % 2) * COL_GAP,
      y: 40 + Math.floor(count / 2) * ROW_GAP,
    };
    setNodes(ns => [...ns, newNode]);
    if (lastId) setEdges(es => [...es, { from: lastId, to: id }]);
  }

  /* delete node */
  function deleteNode(id: string) {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.from !== id && e.to !== id));
    if (selectedId === id) setSelectedId(null);
  }

  /* update node */
  function updateNode(id: string, patch: Partial<Node>) {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n));
  }

  /* drag */
  function onNodeMouseDown(nodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragging(nodeId);
    setSelectedId(nodeId);
    setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
    setNodes(ns => ns.map(n => n.id === dragging ? { ...n, x, y } : n));
  }

  function onMouseUp() { setDragging(null); }

  /* export */
  async function doExport() {
    if (!canvasRef.current || !nodes.length) return;
    const prev = selectedId;
    setSelectedId(null);
    setExporting(true);
    await new Promise(r => setTimeout(r, 120));
    try {
      const url = await toPng(canvasRef.current, { pixelRatio: 2, backgroundColor: bg });
      const a = document.createElement("a");
      a.href = url; a.download = "oravini-board.png"; a.click();
    } finally {
      setExporting(false);
      setSelectedId(prev);
    }
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background flex flex-col" style={{ height: "100vh" }}>

        {/* Header */}
        <div className="border-b border-zinc-800 px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#d4b46115" }}>
            <LayoutTemplate className="w-4 h-4" style={{ color: "#d4b461" }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Board Builder</h1>
            <p className="text-[11px] text-zinc-500">Paste any script → colorful flowchart → record your YouTube video</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {BG_OPTS.map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setBg(opt.v)}
                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{
                    background: bg === opt.v ? "#d4b461" : "transparent",
                    color: bg === opt.v ? "#000" : "#71717a",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              onClick={doExport}
              disabled={!nodes.length || exporting}
              size="sm"
              className="gap-1.5 font-bold text-xs"
              style={{ background: "#d4b461", color: "#000" }}
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? "Exporting…" : "Export PNG"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-60 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Your script</p>
              <Textarea
                data-testid="input-script"
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder={"Paste any text here…\n\nTip: separate each idea with a blank line.\n\nOr use a bullet list:\n- Point 1\n- Point 2\n- Point 3\n\nEach item becomes its own coloured node."}
                className="flex-1 min-h-[260px] text-xs bg-zinc-900 border-zinc-700 text-zinc-300 resize-none font-mono leading-relaxed"
              />
              <Button
                data-testid="button-generate"
                onClick={generate}
                className="w-full gap-2 font-bold"
                style={{ background: "#d4b461", color: "#000" }}
              >
                <Wand2 className="w-4 h-4" />
                Build Flowchart
              </Button>
              <button
                data-testid="button-add-node"
                onClick={addNode}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add blank node
              </button>

              <div className="border-t border-zinc-800 pt-3 space-y-1.5 text-[11px] text-zinc-500 leading-relaxed">
                <p className="font-semibold text-zinc-400 mb-1">Tips</p>
                <p>• Drag nodes to rearrange</p>
                <p>• Double-click text to edit it</p>
                <p>• Select → 📷 to add a photo</p>
                <p>• Select → 🎨 to change color</p>
                <p>• Blank line = separate node</p>
              </div>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-auto">
            <div
              ref={canvasRef}
              data-testid="board-canvas"
              style={{
                position: "relative",
                width: canvasW,
                height: canvasH,
                background: bg,
                cursor: dragging ? "grabbing" : "default",
                flexShrink: 0,
              }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onClick={() => setSelectedId(null)}
            >
              {/* Empty state */}
              {!nodes.length && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, pointerEvents: "none" }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: "#d4b46112", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LayoutTemplate style={{ width: 30, height: 30, color: "#d4b461" }} />
                  </div>
                  <p style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>Flowchart appears here</p>
                  <p style={{ color: "#52525b", fontSize: 12, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
                    Paste your script on the left and click <strong style={{ color: "#a1a1aa" }}>Build Flowchart</strong>
                  </p>
                </div>
              )}

              {/* SVG arrows */}
              <svg
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
              >
                {edges.map((edge, i) => (
                  <Arrow key={i} from={edge.from} to={edge.to} nodes={nodes} />
                ))}
              </svg>

              {/* Nodes */}
              {nodes.map(node => (
                <div
                  key={node.id}
                  style={{ position: "absolute", left: node.x, top: node.y, zIndex: selectedId === node.id ? 20 : 1 }}
                  onMouseDown={e => onNodeMouseDown(node.id, e)}
                >
                  <NodeCard
                    node={node}
                    selected={selectedId === node.id}
                    onSelect={() => setSelectedId(node.id)}
                    onDelete={() => deleteNode(node.id)}
                    onImageUpload={url => updateNode(node.id, { image: url })}
                    onTextSave={text => updateNode(node.id, { text })}
                    onColorChange={idx => updateNode(node.id, { colorIdx: idx })}
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
