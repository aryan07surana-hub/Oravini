import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Canvas, { MiniMap } from "@/components/board/Canvas";
import BoardToolbar from "@/components/board/Toolbar";
import NodeRenderer from "@/components/board/Nodes";
import ConnectorRenderer, { ConnectorPath, RubberBand } from "@/components/board/Connectors";
import AIPanel from "@/components/board/AIPanel";
import { TEMPLATES, applyTemplate, TemplateGalleryModal, type BoardTemplate } from "@/components/board/TemplatesGallery";
import { autoLayout } from "@/components/board/layoutGraph";
import { uid, cid, GOLD, STICKY_COLORS, SHAPE_PRESETS, NODE_COLORS, type BoardNode, type BoardConnector, type ToolMode, type NodeKind } from "@/components/board/types";

/* ─── Context Menu ──────────────────────────── */
function ContextMenu({ x, y, items, onClose }: {
  x: number; y: number;
  items: { label: string; icon?: string; action: () => void; danger?: boolean }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position: "fixed", left: x, top: y, zIndex: 99999,
      minWidth: 180, padding: "4px 0",
      background: "rgba(18,22,36,0.97)", borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
      backdropFilter: "blur(20px)",
    }}>
      {items.map((item, i) => (
        <div key={i} onClick={() => { item.action(); onClose(); }}
          style={{
            padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            color: item.danger ? "#ef4444" : "#e2e8f0", fontSize: 13,
            transition: "background 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,180,97,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          {item.icon && <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{item.icon}</span>}
          {item.label}
        </div>
      ))}
    </div>
  );
}

/* ─── Format Panel ───────────────────────────── */
function FormatPanel({ node, onUpdate, onClose }: {
  node: BoardNode; onUpdate: (n: BoardNode) => void; onClose: () => void;
}) {
  const set = (partial: Partial<BoardNode>) => onUpdate({ ...node, ...partial });

  return (
    <div style={{
      position: "absolute", right: 16, top: 80, width: 220, zIndex: 5000,
      background: "rgba(15,18,30,0.95)", borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      padding: 14, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: GOLD, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Format</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>

      {/* Color */}
      <div>
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>FILL COLOR</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {NODE_COLORS.map(c => (
            <div key={c} onClick={() => set({ color: c })}
              style={{
                width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                background: c, border: c === "#ffffff" ? "1px solid rgba(255,255,255,0.2)" : "none",
                outline: node.color === c ? `2px solid ${GOLD}` : "none",
                outlineOffset: 1, boxShadow: node.color === c ? `0 0 12px ${GOLD}44` : "none",
                transition: "transform 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.15)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
          <div key="none" onClick={() => set({ color: undefined })}
            style={{
              width: 22, height: 22, borderRadius: 6, cursor: "pointer",
              background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b", fontSize: 12, outline: !node.color ? `2px solid ${GOLD}` : "none",
              outlineOffset: 1,
            }}
          >/</div>
        </div>
      </div>

      {/* Border color */}
      <div>
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>BORDER</div>
        <div style={{ display: "flex", gap: 4 }}>
          {["#d4b461", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#64748b", "transparent"].map(c => (
            <div key={c} onClick={() => set({ borderColor: c === "transparent" ? undefined : c })}
              style={{
                width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                background: c === "transparent" ? "rgba(255,255,255,0.05)" : c,
                border: c === "transparent" ? "1px dashed rgba(255,255,255,0.2)" : c === "#ffffff" ? "1px solid rgba(255,255,255,0.2)" : "none",
                outline: (node.borderColor || "#d4b461") === c ? `2px solid ${GOLD}` : "none",
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Border width */}
      <div>
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>BORDER WIDTH</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 6].map(w => (
            <div key={w} onClick={() => set({ borderWidth: w })}
              style={{
                width: 28, height: 22, borderRadius: 4, cursor: "pointer",
                background: (node.borderWidth || 2) === w ? `${GOLD}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${(node.borderWidth || 2) === w ? GOLD : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#e2e8f0", fontSize: 11,
              }}
            >{w}</div>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div>
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>OPACITY</div>
        <input type="range" min={20} max={100} value={(node.opacity ?? 100)}
          onChange={e => set({ opacity: Number(e.target.value) })}
          style={{ width: "100%", accentColor: GOLD }} />
        <div style={{ color: "#94a3b8", fontSize: 10, textAlign: "right" }}>{node.opacity ?? 100}%</div>
      </div>

      {/* Rotation */}
      <div>
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>ROTATION</div>
        <input type="range" min={-180} max={180} value={node.rotation ?? 0}
          onChange={e => set({ rotation: Number(e.target.value) })}
          style={{ width: "100%", accentColor: GOLD }} />
        <div style={{ color: "#94a3b8", fontSize: 10, textAlign: "right" }}>{node.rotation ?? 0}°</div>
      </div>

      {/* Dimensions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2 }}>W</div>
          <input value={Math.round(node.w)} onChange={e => set({ w: Math.max(30, Number(e.target.value)) })}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "#e2e8f0", padding: "4px 8px", fontSize: 12,
            }} />
        </div>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2 }}>H</div>
          <input value={Math.round(node.h)} onChange={e => set({ h: Math.max(30, Number(e.target.value)) })}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "#e2e8f0", padding: "4px 8px", fontSize: 12,
            }} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN BOARD BUILDER
══════════════════════════════════════════════════ */
export default function BoardBuilder() {
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [connectors, setConnectors] = useState<BoardConnector[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ToolMode>("select");
  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [aiOpen, setAiOpen] = useState(false);
  const [connecting, setConnecting] = useState<{ fromId: string; fromPos: { x: number; y: number } } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zCounter, setZCounter] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [lassoRect, setLassoRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [showFormat, setShowFormat] = useState(false);

  const selectedId = selected.size === 1 ? [...selected][0] : null;
  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) ?? null : null;

  /* ── Undo history ──────────────────────── */
  const undoStack = useRef<string[]>([]);
  const pushUndo = useCallback(() => {
    const snap = JSON.stringify({ nodes: nodes, connectors: connectors });
    undoStack.current.push(snap);
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, [nodes, connectors]);
  const canUndo = undoStack.current.length > 0;
  const canRedo = false;

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    const parsed = JSON.parse(prev);
    setNodes(parsed.nodes);
    setConnectors(parsed.connectors);
    setSelected(new Set());
  }, []);

  const handleRedo = useCallback(() => {}, []);

  /* ── Node CRUD ─────────────────────────── */
  const addNode = useCallback((kind: NodeKind, x?: number, y?: number) => {
    pushUndo();
    const sx = x ?? (-viewX / zoom + Math.random() * 300 + 100);
    const sy = y ?? (-viewY / zoom + Math.random() * 300 + 100);
    const isSticky = kind.startsWith("sticky-");
    const isShape = SHAPE_PRESETS.some(p => p.kind === kind);
    const isFrame = kind === "frame";
    const w = isSticky ? 180 : isFrame ? 500 : 160;
    const h = isSticky ? 160 : isFrame ? 400 : 120;
    const shape = SHAPE_PRESETS.find(p => p.kind === kind);
    const node: BoardNode = {
      id: uid(), kind, x: sx, y: sy, w, h,
      title: isSticky ? "Note" : isShape ? (shape?.label ?? "Shape") : isFrame ? "Frame" : "Text",
      zIndex: zCounter,
      color: isSticky ? undefined : undefined,
      shape: shape?.shape,
    };
    setZCounter(z => z + 1);
    setNodes(prev => [...prev, node]);
    setSelected(new Set([node.id]));
    setMode("select");
  }, [viewX, viewY, zoom, zCounter, pushUndo]);

  /* ── Add Sticky with random color ─────── */
  const addSticky = useCallback((kind?: string) => {
    const colors = STICKY_COLORS;
    const k = kind ?? colors[Math.floor(Math.random() * colors.length)].kind;
    addNode(k as NodeKind);
  }, [addNode]);

  const addShape = useCallback((kind: string) => {
    addNode(kind as NodeKind);
  }, [addNode]);

  const addText = useCallback(() => addNode("text"), [addNode]);
  const addImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      pushUndo();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const node: BoardNode = {
          id: uid(), kind: "image", x: -viewX / zoom + 100, y: -viewY / zoom + 100,
          w: 240, h: 180, title: "", imageUrl: url, zIndex: zCounter,
        };
        setZCounter(z => z + 1);
        setNodes(prev => [...prev, node]);
        setMode("select");
        setSelected(new Set([node.id]));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [viewX, viewY, zoom, zCounter, pushUndo]);

  const deleteSelected = useCallback(() => {
    if (selected.size === 0) return;
    pushUndo();
    const ids = selected;
    setNodes(prev => prev.filter(n => !ids.has(n.id)));
    setConnectors(prev => prev.filter(c => !ids.has(c.fromId) && !ids.has(c.toId)));
    setSelected(new Set());
  }, [selected, pushUndo]);

  const duplicateSelected = useCallback(() => {
    if (selected.size === 0) return;
    pushUndo();
    const ids = [...selected];
    setNodes(prev => {
      const newNodes: BoardNode[] = [];
      prev.forEach(n => {
        if (ids.includes(n.id)) {
          newNodes.push({ ...n, id: uid(), x: n.x + 30, y: n.y + 30, zIndex: zCounter + newNodes.length });
        }
      });
      setZCounter(z => z + newNodes.length);
      return [...prev, ...newNodes];
    });
  }, [selected, zCounter, pushUndo]);

  const bringToFront = useCallback(() => {
    if (selected.size === 0) return;
    pushUndo();
    setNodes(prev => {
      let z = zCounter;
      const mapped = prev.map(n => selected.has(n.id) ? { ...n, zIndex: z++ } : n);
      setZCounter(z);
      return mapped;
    });
  }, [selected, zCounter, pushUndo]);

  const sendToBack = useCallback(() => {
    if (selected.size === 0) return;
    pushUndo();
    setNodes(prev => {
      let z = 1;
      const rest = prev.filter(n => !selected.has(n.id));
      const selectedNodes = prev.filter(n => selected.has(n.id));
      selectedNodes.forEach(n => n.zIndex = z++);
      rest.forEach(n => n.zIndex = z++);
      setZCounter(z);
      return [...selectedNodes, ...rest];
    });
  }, [selected, pushUndo]);

  const editNode = useCallback((id: string, field: "title" | "body", val: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: val } : n));
  }, []);

  const changeNodeColor = useCallback((color: string) => {
    if (selectedId) {
      pushUndo();
      setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, color } : n));
    } else if (selected.size > 1) {
      pushUndo();
      setNodes(prev => prev.map(n => selected.has(n.id) ? { ...n, color } : n));
    }
  }, [selectedId, selected, pushUndo]);

  const changeConnectorColor = useCallback((color: string) => {
    if (selectedId) {
      pushUndo();
      setNodes(prev => prev.map(n => n.id === selectedId ? { ...n, borderColor: color } : n));
    }
  }, [selectedId, pushUndo]);

  const updateNode = useCallback((updated: BoardNode) => {
    pushUndo();
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
  }, [pushUndo]);

  /* ── Selection ─────────────────────────── */
  const selectNode = useCallback((id: string, shift?: boolean) => {
    if (shift) {
      setSelected(prev => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return s;
      });
    } else {
      setSelected(new Set([id]));
    }
    setConnecting(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(nodes.map(n => n.id)));
  }, [nodes]);

  /* ── Canvas interaction ─────────────────── */
  const handleCanvasClick = useCallback((sx: number, sy: number) => {
    if (mode === "sticky") {
      addSticky();
    } else if (mode === "shape") {
      addNode("rounded-rect", sx, sy);
    } else if (mode === "text") {
      addNode("text", sx, sy);
    } else if (mode === "image") {
      addImage();
    } else {
      setSelected(new Set());
      setConnecting(null);
      setContextMenu(null);
      setShowFormat(false);
    }
  }, [mode, addSticky, addNode, addImage]);

  /* ── Pan / Zoom ─────────────────────────── */
  const handlePan = useCallback((dx: number, dy: number) => {
    setViewX(v => v + dx);
    setViewY(v => v + dy);
  }, []);

  const handleZoom = useCallback((dz: number, cx: number, cy: number) => {
    setZoom(z => {
      const nz = Math.max(0.15, Math.min(4, z + dz * z));
      const fx = (cx - viewX) / z;
      const fy = (cy - viewY) / z;
      setViewX(v => cx - fx * nz);
      setViewY(v => cy - fy * nz);
      return nz;
    });
  }, [viewX, viewY]);

  const zoomIn = useCallback(() => setZoom(z => Math.min(4, z * 1.2)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.15, z / 1.2)), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  const zoomFit = useCallback(() => {
    if (nodes.length === 0) return;
    const PAD = 80;
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + n.w));
    const maxY = Math.max(...nodes.map(n => n.y + n.h));
    const bw = maxX - minX, bh = maxY - minY;
    const vw = window.innerWidth, vh = window.innerHeight;
    const nz = Math.min((vw - PAD * 2) / bw, (vh - PAD * 2) / bh, 2);
    setZoom(nz);
    setViewX((vw - bw * nz) / 2 - minX * nz);
    setViewY((vh - bh * nz) / 2 - minY * nz);
  }, [nodes]);

  /* ── Drag ──────────────────────────────── */
  const dragRef = useRef<{ id: string; startX: number; startY: number; nodeStartX: number; nodeStartY: number; groupDeltas: { id: string; dx: number; dy: number }[] } | null>(null);

  const dragStart = useCallback((id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    if (!selected.has(id)) {
      setSelected(new Set([id]));
    }

    const selectedIds = selected.has(id) ? [...selected] : [id];
    const deltas = selectedIds.map(sid => {
      const n = nodes.find(nn => nn.id === sid);
      return { id: sid, dx: n ? n.x : 0, dy: n ? n.y : 0, sx: n ? n.x : 0, sy: n ? n.y : 0 };
    });

    dragRef.current = {
      id,
      startX: e.clientX, startY: e.clientY,
      nodeStartX: node.x, nodeStartY: node.y,
      groupDeltas: deltas.map(d => ({ id: d.id, dx: d.sx, dy: d.sy })),
    };
    setDragging(id);
  }, [nodes, selected]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (connecting && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - viewX) / zoom,
        y: (e.clientY - rect.top - viewY) / zoom,
      });
    }

    if (dragging && dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      setNodes(prev => prev.map(n => {
        const entry = dragRef.current!.groupDeltas.find(d => d.id === n.id);
        if (entry) {
          return { ...n, x: entry.dx + dx, y: entry.dy + dy };
        }
        return n;
      }));
    }

    if (lassoRect) {
      setLassoRect(r => r ? { ...r, x2: (e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - viewX) / zoom, y2: (e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) - viewY) / zoom } : null);
    }
  }, [connecting, dragging, lassoRect, viewX, viewY, zoom]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (dragging && dragRef.current) {
      const dx = (_e.clientX - dragRef.current.startX) / zoom;
      const dy = (_e.clientY - dragRef.current.startY) / zoom;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) pushUndo();
    }

    if (lassoRect) {
      const r = lassoRect;
      const x1 = Math.min(r.x1, r.x2);
      const x2 = Math.max(r.x1, r.x2);
      const y1 = Math.min(r.y1, r.y2);
      const y2 = Math.max(r.y1, r.y2);
      const ids = nodes.filter(n =>
        n.x >= x1 && n.x + n.w <= x2 && n.y >= y1 && n.y + n.h <= y2
      ).map(n => n.id);
      if (ids.length) setSelected(new Set(ids));
      setLassoRect(null);
    }

    setDragging(null);
    dragRef.current = null;
  }, [dragging, lassoRect, nodes, zoom, pushUndo]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === "select" && (e.target as HTMLElement)?.dataset?.canvas === "bg" && !e.shiftKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = (e.clientX - rect.left - viewX) / zoom;
      const sy = (e.clientY - rect.top - viewY) / zoom;
      setLassoRect({ x1: sx, y1: sy, x2: sx, y2: sy });
    }
  }, [mode, viewX, viewY, zoom]);

  /* ── Resize ─────────────────────────────── */
  const resizeRef = useRef<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  const resizeStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const n = nodes.find(no => no.id === id);
    if (!n) return;
    resizeRef.current = { id, startX: e.clientX, startY: e.clientY, startW: n.w, startH: n.h };
    setResizing(true);
  }, [nodes]);

  useEffect(() => {
    if (!resizing || !resizeRef.current) return;
    const mm = (e: MouseEvent) => {
      const dx = (e.clientX - resizeRef.current!.startX) / zoom;
      const dy = (e.clientY - resizeRef.current!.startY) / zoom;
      setNodes(prev => prev.map(n =>
        n.id === resizeRef.current!.id
          ? { ...n, w: Math.max(30, resizeRef.current!.startW + dx), h: Math.max(30, resizeRef.current!.startH + dy) }
          : n
      ));
    };
    const mu = () => {
      if (resizeRef.current) pushUndo();
      setResizing(false);
      resizeRef.current = null;
    };
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, [resizing, zoom, pushUndo]);

  /* ── Connectors ─────────────────────────── */
  const handleConnectorStart = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setConnecting({ fromId: id, fromPos: { x: node.x + node.w / 2, y: node.y + node.h / 2 } });
  }, [nodes]);

  const handleConnectorEnd = useCallback((toId: string) => {
    if (!connecting || connecting.fromId === toId) { setConnecting(null); return; }
    pushUndo();
    setConnectors(prev => [...prev, { id: cid(), fromId: connecting.fromId, toId, style: "curved" }]);
    setConnecting(null);
    setMode("select");
  }, [connecting, pushUndo]);

  /* ── Context menu ───────────────────────── */
  const handleContextMenu = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!selected.has(nodeId)) setSelected(new Set([nodeId]));
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, [selected]);

  /* ── Keyboard shortcuts ─────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "v" || e.key === "V") setMode("select");
      else if (e.key === "s" || e.key === "S") setMode("sticky");
      else if (e.key === "r" || e.key === "R") setMode("shape");
      else if (e.key === "c" || e.key === "C") setMode("connector");
      else if (e.key === "t" || e.key === "T") setMode("text");
      else if (e.key === "i" || e.key === "I") setMode("image");
      else if (e.key === "h" || e.key === "H") setMode("hand");
      else if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      else if (e.key === "a" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); selectAll(); }
      else if (e.key === "d" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); handleRedo(); }
      else if (e.key === "Escape") { setSelected(new Set()); setConnecting(null); setContextMenu(null); setShowFormat(false); }
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); zoomReset(); }
      else if (e.key === "1" && e.shiftKey) { e.preventDefault(); zoomFit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected, handleUndo, handleRedo, zoomIn, zoomOut, zoomReset, zoomFit, selectAll]);

  /* ── Export ─────────────────────────────── */
  const handleExport = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, rect.width, rect.height);
    const nodesList = [...nodes].sort((a, b) => a.zIndex - b.zIndex);
    const svgNS = "http://www.w3.org/2000/svg";
    function renderNodeToCanvas(n: BoardNode) {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("transform", `translate(${viewX + n.x * zoom},${viewY + n.y * zoom}) scale(${zoom})`);
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("width", String(n.w));
      rect.setAttribute("height", String(n.h));
      rect.setAttribute("rx", "4");
      if (n.color) rect.setAttribute("fill", n.color);
      else if (n.kind.startsWith("sticky-")) {
        const sc = STICKY_COLORS.find(s => s.kind === n.kind);
        rect.setAttribute("fill", sc?.bg || "#fff3c4");
      } else rect.setAttribute("fill", "rgba(30,30,40,0.9)");
      rect.setAttribute("stroke", n.borderColor || GOLD);
      rect.setAttribute("stroke-width", String(n.borderWidth || 2));
      g.appendChild(rect);
      const title = document.createElementNS(svgNS, "text");
      title.setAttribute("x", String(n.w / 2));
      title.setAttribute("y", String(n.h / 2));
      title.setAttribute("text-anchor", "middle");
      title.setAttribute("fill", "#fff");
      title.setAttribute("font-size", "13");
      title.textContent = n.title;
      g.appendChild(title);
      // insert dummy with data
      const div = document.createElement("div");
      div.appendChild(g);
    }
    nodesList.forEach(n => renderNodeToCanvas(n));
    const image = new Image();
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <rect width="${rect.width}" height="${rect.height}" fill="#0a0a0f"/>
      ${nodesList.map(n => {
        const fill = n.color || (n.kind.startsWith("sticky-") ? (STICKY_COLORS.find(s => s.kind === n.kind)?.bg || "#fff3c4") : "#1e1e28");
        return `<g transform="translate(${viewX + n.x * zoom},${viewY + n.y * zoom}) scale(${zoom})">
          <rect x="0" y="0" width="${n.w}" height="${n.h}" rx="4" fill="${fill}" stroke="${n.borderColor || GOLD}" stroke-width="${n.borderWidth || 2}"/>
          <text x="${n.w / 2}" y="${n.h / 2 + 5}" text-anchor="middle" fill="#fff" font-size="13" font-family="sans-serif">${escapeXml(n.title)}</text>
        </g>`;
      }).join("\n")}
      ${connectors.map(c => {
        const from = nodes.find(n => n.id === c.fromId);
        const to = nodes.find(n => n.id === c.toId);
        if (!from || !to) return "";
        const x1 = viewX + (from.x + from.w / 2) * zoom;
        const y1 = viewY + (from.y + from.h / 2) * zoom;
        const x2 = viewX + (to.x + to.w / 2) * zoom;
        const y2 = viewY + (to.y + to.h / 2) * zoom;
        const cx1 = x1 + (x2 - x1) * 0.5;
        const cy1 = y1;
        const cx2 = x2 - (x2 - x1) * 0.5;
        const cy2 = y2;
        return `<path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}" fill="none" stroke="${c.color || GOLD}" stroke-width="2"/>
          <polygon points="${x2},${y2} ${x2 - 8},${y2 - 6} ${x2 - 8},${y2 + 6}" fill="${c.color || GOLD}"/>`;
      }).join("\n")}
    </svg>`;
    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      const a = document.createElement("a");
      a.download = "board.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    image.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgContent)));
  }, [nodes, connectors, viewX, viewY, zoom]);

  function escapeXml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ── Templates ──────────────────────────── */
  const handleApplyTemplate = useCallback((template: BoardTemplate) => {
    pushUndo();
    const result = applyTemplate(template, zCounter);
    setNodes(result.nodes);
    setConnectors(result.connectors);
    setZCounter(result.zCounter);
    setShowTemplates(false);
  }, [zCounter, pushUndo]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length < 2) return;
    pushUndo();
    const result = autoLayout(nodes, connectors);
    setNodes(result.nodes);
  }, [nodes, connectors, pushUndo]);

  /* ── AI Panel ─────────────────────────────── */
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiGenerate = useCallback(async (prompt: string, complexity = "detailed") => {
    setAiLoading(true);
    pushUndo();
    try {
      const res = await fetch("/api/board/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, complexity }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const rawNodes: any[] = data.nodes || [];
      const rawConns: any[] = data.connectors || [];
      let z = zCounter;
      const viewCX = -viewX / zoom + window.innerWidth / 2 / zoom;
      const viewCY = -viewY / zoom + window.innerHeight / 2 / zoom;
      const createdNodes: BoardNode[] = rawNodes.map((n: any, i: number) => ({
        id: uid(),
        kind: (n.kind || "rounded-rect") as NodeKind,
        x: viewCX + (n.x ?? (i % 5) * 220),
        y: viewCY + (n.y ?? Math.floor(i / 5) * 160),
        w: n.w ?? 180, h: n.h ?? 120,
        title: n.title ?? "Node",
        body: n.body,
        color: n.color,
        borderColor: n.borderColor,
        shape: n.shape,
        zIndex: z++,
        status: n.status, priority: n.priority, assignee: n.assignee,
        items: n.items, checked: n.checked,
        language: n.language, modelName: n.modelName,
      }));
      const createdConns: BoardConnector[] = rawConns.flatMap((c: any) => {
        const from = createdNodes[c.fromIdx];
        const to = createdNodes[c.toIdx];
        if (!from || !to) return [];
        return [{ id: cid(), fromId: from.id, toId: to.id, label: c.label, color: c.color, style: c.style ?? "curved" }];
      });
      setNodes(prev => [...prev, ...createdNodes]);
      setConnectors(prev => [...prev, ...createdConns]);
      setZCounter(z);
      setAiOpen(false);
    } catch (err) {
      console.error("AI generate failed:", err);
    } finally {
      setAiLoading(false);
    }
  }, [zCounter, viewX, viewY, zoom, pushUndo]);

  const handleAiGenerateFromImage = useCallback(async (prompt: string, file: File) => {
    setAiLoading(true);
    pushUndo();
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("prompt", prompt || "Recreate this diagram as a structured interactive board");
      const res = await fetch("/api/ai/board/generate-from-image", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const rawNodes: any[] = data.nodes || [];
      const rawConns: any[] = data.connectors || [];
      let z = zCounter;
      const viewCX = -viewX / zoom + window.innerWidth / 2 / zoom;
      const viewCY = -viewY / zoom + window.innerHeight / 2 / zoom;
      // Find bounding box of raw nodes to center them on canvas
      const minRX = Math.min(...rawNodes.map(n => n.x ?? 0));
      const minRY = Math.min(...rawNodes.map(n => n.y ?? 0));
      const createdNodes: BoardNode[] = rawNodes.map((n: any) => ({
        id: uid(),
        kind: (n.kind || "rounded-rect") as NodeKind,
        x: viewCX + (n.x ?? 0) - minRX,
        y: viewCY + (n.y ?? 0) - minRY,
        w: n.w ?? 180, h: n.h ?? 80,
        title: n.title ?? "Node",
        body: n.body,
        color: n.color,
        borderColor: n.borderColor,
        shape: n.shape,
        zIndex: z++,
        status: n.status, priority: n.priority, assignee: n.assignee,
        items: n.items, checked: n.checked,
        language: n.language, modelName: n.modelName,
      }));
      const createdConns: BoardConnector[] = (rawConns || []).flatMap((c: any) => {
        const from = createdNodes[c.fromIdx];
        const to = createdNodes[c.toIdx];
        if (!from || !to) return [];
        return [{ id: cid(), fromId: from.id, toId: to.id, label: c.label, color: c.color, style: c.style ?? "curved" }];
      });
      setNodes(prev => [...prev, ...createdNodes]);
      setConnectors(prev => [...prev, ...createdConns]);
      setZCounter(z);
      setAiOpen(false);
    } catch (err) {
      console.error("AI vision generate failed:", err);
    } finally {
      setAiLoading(false);
    }
  }, [zCounter, viewX, viewY, zoom, pushUndo]);

  const lassoStyle = lassoRect ? {
    left: Math.min(lassoRect.x1, lassoRect.x2),
    top: Math.min(lassoRect.y1, lassoRect.y2),
    width: Math.abs(lassoRect.x2 - lassoRect.x1),
    height: Math.abs(lassoRect.y2 - lassoRect.y1),
  } : null;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const handleHoverChange = useCallback((id: string, h: boolean) => {
    setHoveredId(h ? id : null);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0a0f" }}>
      {/* Toolbar */}
      <BoardToolbar
        mode={mode} onModeChange={setMode}
        canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}
        onExport={handleExport}
        zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset}
        onAddSticky={addSticky} onAddShape={addShape} onAddText={addText} onAddImage={addImage}
        selectedId={selectedId} selectedIds={[...selected]}
        onDeleteSelected={deleteSelected} onDuplicateSelected={duplicateSelected}
        onBringToFront={bringToFront} onSendToBack={sendToBack}
        nodeColor={selectedNode?.color} onChangeColor={changeNodeColor}
        connectorColor={selectedNode?.borderColor} onChangeConnectorColor={changeConnectorColor}
        onOpenTemplates={() => setShowTemplates(true)} onAutoLayout={handleAutoLayout} onZoomFit={zoomFit}
      />

      {/* Canvas */}
      <Canvas
        viewX={viewX} viewY={viewY} zoom={zoom}
        onPan={handlePan} onZoom={handleZoom}
        onCanvasClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        mode={mode}
      >
        {/* Connectors */}
        <ConnectorRenderer connectors={connectors} nodes={nodes} zoom={zoom} />

        {/* Active connector line */}
        {connecting && (
          <RubberBand from={connecting.fromPos} to={mousePos} zoom={zoom} />
        )}

        {/* Nodes */}
        {[...nodes].sort((a, b) => a.zIndex - b.zIndex).map(n => (
          <NodeRenderer
            key={n.id}
            node={n}
            selected={selected.has(n.id)}
            hovered={n.id === hoveredId}
            mode={mode}
            onSelect={selectNode}
            onDragStart={dragStart}
            onResizeStart={resizeStart}
            onEdit={editNode}
            onDelete={deleteSelected}
            onConnectorEnd={handleConnectorEnd}
            onConnectorStart={handleConnectorStart}
            onHoverChange={handleHoverChange}
            connecting={connecting !== null}
            onContextMenu={handleContextMenu}
          />
        ))}

        {/* Lasso selection */}
        {lassoStyle && (
          <div style={{
            position: "absolute",
            left: lassoStyle.left,
            top: lassoStyle.top,
            width: lassoStyle.width,
            height: lassoStyle.height,
            border: `1.5px solid ${GOLD}`,
            background: `${GOLD}11`,
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 9999,
          }} />
        )}
      </Canvas>

      {/* MiniMap */}
      {nodes.length > 1 && (
        <MiniMap viewX={viewX} viewY={viewY} zoom={zoom} nodes={nodes} />
      )}

      {/* Format Panel */}
      {showFormat && selectedNode && (
        <FormatPanel node={selectedNode} onUpdate={updateNode} onClose={() => setShowFormat(false)} />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { label: "Edit", icon: "✎", action: () => setShowFormat(true) },
            { label: "Duplicate", icon: "⧉", action: () => duplicateSelected() },
            { label: "Bring to Front", icon: "↑", action: () => bringToFront() },
            { label: "Send to Back", icon: "↓", action: () => sendToBack() },
            { label: "Delete", icon: "✕", action: () => deleteSelected(), danger: true },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Templates Gallery Modal */}
      {showTemplates && (
        <TemplateGalleryModal
          onApply={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* AI Panel toggle */}
      <button onClick={() => setAiOpen(!aiOpen)} style={{
        position: "absolute", bottom: 60, right: 16, width: 44, height: 44,
        background: GOLD, border: "none", borderRadius: "50%",
        cursor: "pointer", zIndex: 5000,
        boxShadow: "0 4px 16px rgba(212,180,97,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#0a0a0f", fontWeight: 700, fontSize: 16,
        transition: "transform 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        title="AI Board Generator"
      >
        ✦
      </button>

      {/* AI Panel */}
      {aiOpen && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 4999, display: "flex" }}>
          <AIPanel
            onGenerate={handleAiGenerate}
            onGenerateFromImage={handleAiGenerateFromImage}
            loading={aiLoading}
            onClose={() => setAiOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
