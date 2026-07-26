import { useCallback, useState, type CSSProperties } from "react";
import { GOLD, STICKY_COLORS, type BoardNode, type ToolMode } from "./types";

interface Props {
  node: BoardNode;
  selected: boolean;
  hovered: boolean;
  mode: ToolMode;
  onSelect: (id: string, shift?: boolean) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onResizeStart: (id: string, e: React.MouseEvent) => void;
  onEdit: (id: string, field: "title" | "body", val: string) => void;
  onDelete: (id: string) => void;
  onConnectorEnd: (id: string) => void;
  onConnectorStart: (id: string) => void;
  onHoverChange: (id: string, hovered: boolean) => void;
  connecting: boolean;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
}

export default function NodeRenderer({
  node, selected, hovered, mode, onSelect, onDragStart,
  onResizeStart, onEdit, onDelete, onConnectorEnd, onConnectorStart,
  onHoverChange, connecting, onContextMenu,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(node.title);
  const [localBody, setLocalBody] = useState(node.body ?? "");

  const isSticky = node.kind.startsWith("sticky-");
  const stickyColor = STICKY_COLORS.find(s => s.kind === node.kind);
  const showPorts = hovered && (mode === "connector" || connecting);

  const finishEdit = useCallback(() => {
    setEditing(false);
    if (localTitle !== node.title) onEdit(node.id, "title", localTitle);
    if (localBody !== (node.body ?? "")) onEdit(node.id, "body", localBody);
  }, [node.id, node.title, node.body, localTitle, localBody, onEdit]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setLocalTitle(node.title);
    setLocalBody(node.body ?? "");
  }, [node.title, node.body]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    if (connecting) { onConnectorEnd(node.id); return; }
    onSelect(node.id, e.shiftKey);
    if (mode !== "connector") onDragStart(node.id, e);
  }, [editing, connecting, node.id, mode, onSelect, onDragStart, onConnectorEnd]);

  const handlePortClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (connecting) onConnectorEnd(node.id);
    else onConnectorStart(node.id);
  }, [connecting, node.id, onConnectorEnd, onConnectorStart]);

  const portBase: CSSProperties = {
    position: "absolute", width: 14, height: 14,
    background: GOLD, border: "2.5px solid #0a0a0f",
    borderRadius: "50%", zIndex: 2000, cursor: "crosshair",
    transition: "transform 0.12s, opacity 0.12s, box-shadow 0.12s",
    opacity: showPorts ? 1 : 0,
    transform: showPorts ? "scale(1)" : "scale(0.3)",
    boxShadow: showPorts ? `0 0 10px ${GOLD}99` : "none",
    pointerEvents: showPorts ? "auto" : "none",
  };

  const isShape = ["rectangle", "rounded-rect", "circle", "diamond"].includes(node.kind);
  const isFrame = node.kind === "frame";
  const isSection = node.kind === "section";
  const shapeClipPath = node.shape === "diamond" ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
    : node.shape === "circle" ? "circle(50%)" : undefined;

  const borderRadius = node.shape === "circle" ? "50%" : isSticky ? 6 : isFrame ? 14 : 12;

  return (
    <div
      style={{
        position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h,
        zIndex: node.zIndex + (selected ? 10000 : 0),
        cursor: editing ? "text" : mode === "connector" ? "crosshair" : "move",
        userSelect: "none",
        transform: `rotate(${node.rotation || 0}deg)`,
        transition: "box-shadow 0.15s",
        clipPath: shapeClipPath,
        opacity: (node.opacity ?? 100) / 100,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => onContextMenu(node.id, e)}
      onMouseEnter={() => onHoverChange(node.id, true)}
      onMouseLeave={() => onHoverChange(node.id, false)}
    >
      {/* ── Node content ── */}
      {isSticky       ? <StickyContent    node={node} stickyColor={stickyColor} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : isShape       ? <ShapeContent     node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : isFrame       ? <FrameContent     node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : isSection     ? <SectionContent   node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : node.kind === "kanban-card" ? <KanbanCard    node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "checklist"   ? <ChecklistNode node={node} onEdit={onEdit} />
       : node.kind === "code"        ? <CodeNode      node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "ai-node"     ? <AINodeContent node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "process" || node.kind === "predefined-process"
                       ? <ProcessNode     node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : node.kind === "decision"    ? <DecisionNode  node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : node.kind === "terminator"  ? <TerminatorNode node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : node.kind === "database"    ? <DatabaseNode  node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "cloud"       ? <CloudNode     node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
       : node.kind === "server"      ? <ServerNode    node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "person" || node.kind === "actor"
                       ? <PersonNode     node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "component"   ? <ComponentNode node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
       : node.kind === "document"    ? <DocumentNode  node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
                       : <DefaultContent  node={node} editing={editing} localTitle={localTitle} setLocalTitle={setLocalTitle} localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
      }

      {/* ── Selection ring ── */}
      {selected && !editing && (
        <div style={{
          position: "absolute", inset: -3,
          borderRadius: typeof borderRadius === "number" ? borderRadius + 3 : borderRadius,
          border: `2px solid ${GOLD}`,
          boxShadow: `0 0 0 1px ${GOLD}33, 0 0 24px ${GOLD}44`,
          pointerEvents: "none",
        }} />
      )}

      {/* ── Hover glow ── */}
      {hovered && !selected && !editing && !isFrame && !isSection && (
        <div style={{
          position: "absolute", inset: -2,
          borderRadius: typeof borderRadius === "number" ? borderRadius + 2 : borderRadius,
          border: `1.5px solid ${GOLD}55`,
          pointerEvents: "none",
        }} />
      )}

      {/* ── Connection ports ── */}
      {(["top", "right", "bottom", "left"] as const).map(pos => (
        <div key={pos}
          style={{
            ...portBase,
            ...(pos === "top"    ? { top: -7,  left: "50%", marginLeft: -7 } : {}),
            ...(pos === "bottom" ? { bottom: -7, left: "50%", marginLeft: -7 } : {}),
            ...(pos === "left"   ? { left: -7,  top: "50%",  marginTop: -7  } : {}),
            ...(pos === "right"  ? { right: -7, top: "50%",  marginTop: -7  } : {}),
          }}
          onClick={handlePortClick}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.4)"; e.currentTarget.style.boxShadow = `0 0 16px ${GOLD}dd`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = showPorts ? "scale(1)" : "scale(0.3)"; e.currentTarget.style.boxShadow = showPorts ? `0 0 10px ${GOLD}99` : "none"; }}
        />
      ))}

      {/* ── Resize handle ── */}
      {selected && !editing && !isSection && (
        <div
          onMouseDown={e => { e.stopPropagation(); onResizeStart(node.id, e); }}
          style={{
            position: "absolute", right: -5, bottom: -5, width: 12, height: 12,
            background: GOLD, border: "2px solid #0a0a0f",
            borderRadius: 3, cursor: "nwse-resize", zIndex: 2001,
          }}
        />
      )}
    </div>
  );
}

/* ─── shared styles ─────────────────────────────────── */
const BASE_FONT: CSSProperties = { fontFamily: "system-ui, -apple-system, sans-serif" };
const EDIT_INPUT: CSSProperties = {
  background: "rgba(0,0,0,0.25)", border: "none", borderRadius: 4,
  color: "#fff", padding: "4px 8px", fontSize: 13, fontWeight: 600,
  outline: `1.5px solid ${GOLD}`, fontFamily: "inherit", width: "100%",
};
const EDIT_TEXTAREA: CSSProperties = {
  background: "rgba(0,0,0,0.15)", border: "none", borderRadius: 4,
  color: "#fff", padding: "4px 8px", fontSize: 12, flex: 1,
  resize: "none", outline: `1px solid ${GOLD}44`, fontFamily: "inherit",
};

/* ─── Sticky Note ────────────────────────────────────── */
function StickyContent({ node, stickyColor, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const bg = node.color || stickyColor?.bg || "#fef3c7";
  const fg = node.color ? "#fff" : (stickyColor?.fg || "#1a1a1a");
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 6, ...BASE_FONT,
      boxShadow: "0 3px 12px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)",
      display: "flex", flexDirection: "column", padding: "12px 14px", overflow: "hidden", color: fg, position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "rgba(0,0,0,0.1)", borderRadius: "6px 6px 0 0" }} />
      {editing ? (
        <>
          <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus
            style={{ ...EDIT_INPUT, background: "rgba(0,0,0,0.1)", color: fg, marginBottom: 5, marginTop: 4 }} />
          <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit}
            style={{ ...EDIT_TEXTAREA, background: "rgba(0,0,0,0.05)", color: fg }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, marginTop: 4, lineHeight: 1.35, wordBreak: "break-word" }}>{node.title}</div>
          {node.body && <div style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.5, flex: 1, overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-line" }}>{node.body}</div>}
        </>
      )}
    </div>
  );
}

/* ─── Process Box ────────────────────────────────────── */
function ProcessNode({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const bg = node.color || "rgba(28,32,48,0.95)";
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 6, ...BASE_FONT,
      border: `2px solid ${node.borderColor || "rgba(255,255,255,0.15)"}`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      {editing
        ? <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "90%" }} />
        : <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, textAlign: "center", padding: "4px 10px", lineHeight: 1.35, wordBreak: "break-word" }}>{node.title}</span>
      }
    </div>
  );
}

/* ─── Decision Diamond ───────────────────────────────── */
function DecisionNode({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const bg = node.color || "rgba(28,25,60,0.95)";
  return (
    <div style={{ width: "100%", height: "100%", background: bg, ...BASE_FONT,
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      border: "none", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "60%", padding: "4px" }}>
        {editing
          ? <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "100%" }} />
          : <span style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{node.title}</span>
        }
      </div>
    </div>
  );
}

/* ─── Terminator ─────────────────────────────────────── */
function TerminatorNode({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const bg = node.color || "rgba(20,83,45,0.95)";
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 999, ...BASE_FONT,
      border: `2px solid ${node.borderColor || "#22c55e44"}`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      {editing
        ? <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "80%" }} />
        : <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700, textAlign: "center", letterSpacing: "0.05em" }}>{node.title}</span>
      }
    </div>
  );
}

/* ─── Database (cylinder) ────────────────────────────── */
function DatabaseNode({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const bg = node.color || "rgba(28,25,23,0.95)";
  const w = node.w, h = node.h, ry = Math.min(18, h * 0.18);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...BASE_FONT }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={`db-${node.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={node.color || "#2d2520"} />
            <stop offset="100%" stopColor={node.color || "#1c1917"} />
          </linearGradient>
        </defs>
        <rect x={2} y={ry} width={w - 4} height={h - ry * 2} fill={`url(#db-${node.id})`} />
        <ellipse cx={w / 2} cy={ry} rx={w / 2 - 2} ry={ry} fill={node.color || "#3d3028"} stroke={node.borderColor || GOLD} strokeWidth={1.5} />
        <ellipse cx={w / 2} cy={h - ry} rx={w / 2 - 2} ry={ry} fill={node.color || "#1c1917"} stroke={node.borderColor || GOLD} strokeWidth={1.5} />
        <rect x={2} y={ry} width={w - 4} height={h - ry * 2} fill="none" stroke={node.borderColor || GOLD} strokeWidth={1.5} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 8px" }}>
        {editing ? (
          <>
            <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "90%", marginBottom: 3 }} />
            <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} style={{ ...EDIT_TEXTAREA, textAlign: "center" }} />
          </>
        ) : (
          <>
            <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700, textAlign: "center" }}>{node.title}</div>
            {node.body && <div style={{ color: "#94a3b8", fontSize: 10, textAlign: "center", marginTop: 3, lineHeight: 1.4 }}>{node.body}</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Cloud ──────────────────────────────────────────── */
function CloudNode({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...BASE_FONT }}>
      <svg width={node.w} height={node.h} viewBox="0 0 200 120" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d="M40,90 Q20,90 20,70 Q20,52 35,50 Q33,30 55,28 Q65,12 82,18 Q95,5 115,15 Q135,5 148,22 Q168,20 172,42 Q188,44 186,62 Q184,80 168,82 Q165,95 148,95 Q140,100 40,90 Z"
          fill={node.color || "rgba(28,32,58,0.95)"} stroke={node.borderColor || GOLD} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px" }}>
        {editing
          ? <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "80%" }} />
          : <span style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600, textAlign: "center" }}>{node.title}</span>
        }
      </div>
    </div>
  );
}

/* ─── Server ─────────────────────────────────────────── */
function ServerNode({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const bg = node.color || "rgba(22,26,48,0.95)";
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 8, ...BASE_FONT,
      border: `2px solid ${node.borderColor || "#3b82f6"}`,
      boxShadow: "0 4px 20px rgba(59,130,246,0.15)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ background: "rgba(59,130,246,0.2)", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[0,1,2,3,4].map(i => <div key={i} style={{ width: 24, height: 4, background: "#3b82f644", borderRadius: 2 }} />)}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 10px" }}>
        {editing ? (
          <>
            <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", marginBottom: 3 }} />
            <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} style={{ ...EDIT_TEXTAREA, textAlign: "center" }} />
          </>
        ) : (
          <>
            <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700, textAlign: "center" }}>{node.title}</div>
            {node.body && <div style={{ color: "#94a3b8", fontSize: 10, textAlign: "center", marginTop: 3, lineHeight: 1.4 }}>{node.body}</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Person ─────────────────────────────────────────── */
function PersonNode({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const bg = node.color || "rgba(20,30,50,0.9)";
  const size = Math.min(node.w, node.h) * 0.38;
  return (
    <div style={{ width: "100%", height: "100%", ...BASE_FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: bg, border: `2.5px solid ${node.borderColor || GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 16px ${GOLD}33` }}>
        <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>👤</span>
      </div>
      {editing ? (
        <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "90%" }} />
      ) : (
        <>
          <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{node.title}</div>
          {node.body && <div style={{ color: "#94a3b8", fontSize: 10.5, textAlign: "center", lineHeight: 1.4 }}>{node.body}</div>}
        </>
      )}
    </div>
  );
}

/* ─── Component (generic tech component) ─────────────── */
function ComponentNode({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const bg = node.color || "rgba(22,26,40,0.95)";
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 10, ...BASE_FONT,
      border: `1.5px solid ${node.borderColor || "rgba(255,255,255,0.12)"}`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f644" }} />
        <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>component</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 10px" }}>
        {editing ? (
          <>
            <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", marginBottom: 3 }} />
            <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} style={{ ...EDIT_TEXTAREA, textAlign: "center" }} />
          </>
        ) : (
          <>
            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700, textAlign: "center" }}>{node.title}</div>
            {node.body && <div style={{ color: "#94a3b8", fontSize: 10.5, textAlign: "center", marginTop: 3, lineHeight: 1.5, whiteSpace: "pre-line" }}>{node.body}</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Document (dog-ear) ─────────────────────────────── */
function DocumentNode({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const bg = node.color || "rgba(28,25,16,0.95)";
  const w = node.w, h = node.h, fold = Math.min(22, w * 0.15);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...BASE_FONT }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <path d={`M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z`}
          fill={bg} stroke={node.borderColor || GOLD} strokeWidth={1.5} />
        <path d={`M${w - fold},0 L${w - fold},${fold} L${w},${fold}`}
          fill={node.color ? "rgba(0,0,0,0.2)" : "rgba(212,180,97,0.15)"} stroke={node.borderColor || GOLD} strokeWidth={1.5} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: `${fold}px 12px 8px` }}>
        {editing
          ? <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "90%" }} />
          : <span style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600, textAlign: "center" }}>{node.title}</span>
        }
      </div>
    </div>
  );
}

/* ─── Shape ──────────────────────────────────────────── */
function ShapeContent({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const isCircle = node.shape === "circle";
  const isDiamond = node.shape === "diamond";
  const round = node.shape === "rounded-rect" ? 14 : 4;
  const bg = node.color || "rgba(30,35,55,0.95)";
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: round, ...BASE_FONT,
      clipPath: isDiamond ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" : isCircle ? "circle(50%)" : undefined,
      border: `2px solid ${node.borderColor || GOLD}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      {editing
        ? <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, textAlign: "center", width: "80%" }} />
        : <span style={{ color: node.textColor || "#fff", fontSize: 13, fontWeight: 600, textAlign: "center", padding: "6px 10px", lineHeight: 1.35, wordBreak: "break-word" }}>{node.title}</span>
      }
    </div>
  );
}

/* ─── Kanban Card ─────────────────────────────────────── */
const PRIORITY_COLORS: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", urgent: "#dc2626" };
const STATUS_LABELS: Record<string, string> = { todo: "To Do", inprogress: "In Progress", review: "In Review", done: "Done", blocked: "Blocked" };
const STATUS_COLORS: Record<string, string> = { todo: "#475569", inprogress: "#3b82f6", review: "#f59e0b", done: "#22c55e", blocked: "#ef4444" };

function KanbanCard({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const status = node.status || "todo";
  const priority = node.priority || "medium";
  return (
    <div style={{ width: "100%", height: "100%", background: "rgba(22,26,42,0.97)", borderRadius: 10, ...BASE_FONT,
      border: `1px solid rgba(255,255,255,0.07)`,
      borderLeft: `3px solid ${PRIORITY_COLORS[priority]}`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "8px 10px 4px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
            background: `${STATUS_COLORS[status]}22`, color: STATUS_COLORS[status], letterSpacing: "0.06em" }}>
            {STATUS_LABELS[status]}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
            background: `${PRIORITY_COLORS[priority]}22`, color: PRIORITY_COLORS[priority], marginLeft: "auto", letterSpacing: "0.06em" }}>
            {priority.toUpperCase()}
          </span>
        </div>
        {editing ? (
          <>
            <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, fontSize: 12, marginBottom: 4 }} />
            <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} style={{ ...EDIT_TEXTAREA, fontSize: 11 }} />
          </>
        ) : (
          <>
            <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600, lineHeight: 1.35, marginBottom: 3, wordBreak: "break-word" }}>{node.title}</div>
            {node.body && <div style={{ color: "#94a3b8", fontSize: 10.5, lineHeight: 1.4, flex: 1, overflow: "hidden" }}>{node.body}</div>}
          </>
        )}
      </div>
      {node.assignee && (
        <div style={{ padding: "4px 10px 6px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${GOLD}33`, border: `1px solid ${GOLD}55`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: GOLD, fontWeight: 700 }}>
            {node.assignee.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ color: "#64748b", fontSize: 9 }}>{node.assignee}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Checklist ──────────────────────────────────────── */
function ChecklistNode({ node, onEdit }: any) {
  const items: string[] = node.items || [];
  const checked: boolean[] = node.checked || items.map(() => false);
  const done = checked.filter(Boolean).length;

  const toggle = (i: number) => {
    const newChecked = [...checked];
    newChecked[i] = !newChecked[i];
    onEdit(node.id, "body", JSON.stringify(newChecked));
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "rgba(18,22,36,0.97)", borderRadius: 10, ...BASE_FONT,
      border: `1.5px solid rgba(255,255,255,0.08)`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", flex: 1 }}>{node.title}</span>
        <span style={{ fontSize: 10, color: done === items.length && items.length > 0 ? "#22c55e" : "#64748b", fontWeight: 600 }}>
          {done}/{items.length}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 8px" }}>
        {items.map((item: string, i: number) => (
          <div key={i} onClick={(e) => { e.stopPropagation(); toggle(i); }}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 4px", cursor: "pointer", borderRadius: 4,
              transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${checked[i] ? "#22c55e" : "#475569"}`,
              background: checked[i] ? "#22c55e" : "transparent", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {checked[i] && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ color: checked[i] ? "#475569" : "#e2e8f0", fontSize: 11.5, lineHeight: 1.35,
              textDecoration: checked[i] ? "line-through" : "none", transition: "all 0.15s" }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Code Block ─────────────────────────────────────── */
const LANG_COLORS: Record<string, string> = { javascript: "#f59e0b", typescript: "#3b82f6", python: "#22c55e", go: "#06b6d4", rust: "#ef4444", sql: "#8b5cf6", bash: "#10b981", default: "#94a3b8" };

function CodeNode({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  const lang = node.language || "code";
  const langColor = LANG_COLORS[lang] || LANG_COLORS.default;
  return (
    <div style={{ width: "100%", height: "100%", background: "#0d1117", borderRadius: 10, ...BASE_FONT,
      border: "1.5px solid rgba(255,255,255,0.06)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "6px 12px",
        display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#ef4444", "#f59e0b", "#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
        </div>
        <span style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{node.title}</span>
        <span style={{ fontSize: 9, color: langColor, fontWeight: 700, fontFamily: "monospace", textTransform: "uppercase" }}>{lang}</span>
      </div>
      <div style={{ flex: 1, padding: "8px 12px", overflow: "auto" }}>
        {editing ? (
          <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} autoFocus
            style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none",
              color: "#e6edf3", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "none" }} />
        ) : (
          <pre style={{ margin: 0, color: "#e6edf3", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {node.body || "// Write your code here"}
          </pre>
        )}
      </div>
    </div>
  );
}

/* ─── AI Node ─────────────────────────────────────────── */
function AINodeContent({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 12, ...BASE_FONT, overflow: "hidden",
      background: "linear-gradient(135deg, rgba(88,28,135,0.95) 0%, rgba(30,64,175,0.95) 100%)",
      border: "1.5px solid rgba(167,139,250,0.3)",
      boxShadow: "0 4px 24px rgba(139,92,246,0.25)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "8px 12px 4px", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 15 }}>✦</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {node.modelName || "AI"}
        </span>
      </div>
      <div style={{ flex: 1, padding: "0 12px 10px", display: "flex", flexDirection: "column" }}>
        {editing ? (
          <>
            <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, marginBottom: 4 }} />
            <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} style={EDIT_TEXTAREA} />
          </>
        ) : (
          <>
            <div style={{ color: "#e9d5ff", fontSize: 12, fontWeight: 700, lineHeight: 1.35, marginBottom: 4 }}>{node.title}</div>
            {node.body && <div style={{ color: "rgba(233,213,255,0.65)", fontSize: 10.5, lineHeight: 1.5 }}>{node.body}</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Section (colored zone) ────────────────────────── */
function SectionContent({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const bg = node.color ? `${node.color}18` : "rgba(212,180,97,0.04)";
  const border = node.borderColor || node.color || GOLD;
  return (
    <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 16, ...BASE_FONT,
      border: `1.5px dashed ${border}44`, overflow: "hidden",
    }}>
      <div style={{ padding: "6px 16px", background: `${border}12`, borderBottom: `1px solid ${border}22`,
        display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: border, opacity: 0.7 }} />
        {editing ? (
          <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus
            style={{ background: "none", border: "none", outline: "none", color: border, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "inherit", flex: 1 }} />
        ) : (
          <span style={{ color: border, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{node.title}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Frame ──────────────────────────────────────────── */
function FrameContent({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const border = node.borderColor || "rgba(212,180,97,0.25)";
  return (
    <div style={{ width: "100%", height: "100%", background: "rgba(15,20,35,0.15)", borderRadius: 14, ...BASE_FONT,
      border: `1.5px dashed ${border}`, overflow: "hidden",
    }}>
      <div style={{ padding: "5px 14px", background: `${border}18`, borderBottom: `1px solid ${border}22` }}>
        {editing ? (
          <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus
            style={{ background: "none", border: "none", outline: "none", color: node.borderColor || GOLD, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "inherit", width: "100%" }} />
        ) : (
          <span style={{ fontSize: 11, color: node.borderColor || GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em" }}>{node.title}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Default (text / image) ─────────────────────────── */
function DefaultContent({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  if (node.imageUrl) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <img src={node.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" draggable={false} />
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "10px 14px", overflow: "hidden", ...BASE_FONT,
      background: node.color || "rgba(22,26,40,0.95)", borderRadius: 12,
      border: `1.5px solid ${node.color ? (node.borderColor || `${GOLD}44`) : "rgba(255,255,255,0.07)"}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)", color: "#e2e8f0",
    }}>
      {editing ? (
        <>
          <input value={localTitle} onChange={e => setLocalTitle(e.target.value)} onBlur={finishEdit} autoFocus style={{ ...EDIT_INPUT, marginBottom: 5 }} />
          <textarea value={localBody} onChange={e => setLocalBody(e.target.value)} onBlur={finishEdit} style={EDIT_TEXTAREA} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.35, wordBreak: "break-word", color: "#f1f5f9" }}>{node.title}</div>
          {node.body && <div style={{ fontSize: 11.5, opacity: 0.7, lineHeight: 1.5, flex: 1, overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-line" }}>{node.body}</div>}
        </>
      )}
    </div>
  );
}
