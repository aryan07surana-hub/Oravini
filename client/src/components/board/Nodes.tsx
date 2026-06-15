import { useCallback, useRef, useState, type CSSProperties } from "react";
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
  connecting: boolean;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
}

export default function NodeRenderer({
  node, selected, hovered, mode, onSelect, onDragStart,
  onResizeStart, onEdit, onDelete, onConnectorEnd,
  connecting, onContextMenu,
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
    onSelect(node.id, e.shiftKey);
    if (mode !== "connector" && !connecting) {
      onDragStart(node.id, e);
    }
  }, [editing, node.id, mode, connecting, onSelect, onDragStart]);

  const handlePortClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectorEnd(node.id);
  }, [node.id, onConnectorEnd]);

  const portStyle: CSSProperties = {
    position: "absolute", width: 12, height: 12,
    background: GOLD, border: "2px solid #0a0a0f",
    borderRadius: "50%", zIndex: 2000, cursor: "crosshair",
    transition: "transform 0.15s, opacity 0.15s",
    opacity: showPorts ? 1 : 0,
    transform: showPorts ? "scale(1)" : "scale(0.5)",
  };
  const portHover = { transform: "scale(1.3)" };

  const shapeClipPath = node.shape === "diamond"
    ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
    : node.shape === "circle"
    ? "circle(50%)"
    : undefined;

  const isShape = ["rectangle", "rounded-rect", "circle", "diamond"].includes(node.kind);
  const isFrame = node.kind === "frame";
  const borderRadius = node.shape === "circle" ? "50%" : isSticky ? 4 : isFrame ? 12 : 14;

  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        zIndex: node.zIndex + (selected ? 10000 : 0),
        cursor: editing ? "text" : mode === "connector" ? "crosshair" : "move",
        userSelect: "none",
        transform: `rotate(${node.rotation || 0}deg)`,
        transition: selected ? "box-shadow 0.2s" : "box-shadow 0.2s, transform 0.15s",
        clipPath: shapeClipPath,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => onContextMenu(node.id, e)}
    >
      {/* Content */}
      {isSticky ? (
        <StickyContent node={node} stickyColor={stickyColor} editing={editing}
          localTitle={localTitle} setLocalTitle={setLocalTitle}
          localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
      ) : isShape ? (
        <ShapeContent node={node} editing={editing}
          localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
      ) : isFrame ? (
        <FrameContent node={node} editing={editing}
          localTitle={localTitle} setLocalTitle={setLocalTitle} finishEdit={finishEdit} />
      ) : (
        <DefaultContent node={node} editing={editing}
          localTitle={localTitle} setLocalTitle={setLocalTitle}
          localBody={localBody} setLocalBody={setLocalBody} finishEdit={finishEdit} />
      )}

      {/* Selected border glow */}
      {selected && !editing && (
        <div style={{
          position: "absolute", inset: -3,
          borderRadius: typeof borderRadius === "number" ? borderRadius + 2 : borderRadius,
          border: `2.5px solid ${GOLD}`,
          boxShadow: `0 0 20px ${GOLD}55, 0 0 60px ${GOLD}22`,
          pointerEvents: "none",
        }} />
      )}

      {/* Connection ports */}
      {showPorts && (
        <>
          {["top", "right", "bottom", "left"].map(pos => (
            <div key={pos} style={{
              ...portStyle,
              ...(pos === "top"    ? { top: -7, left: "50%", marginLeft: -6 } : {}),
              ...(pos === "bottom" ? { bottom: -7, left: "50%", marginLeft: -6 } : {}),
              ...(pos === "left"   ? { left: -7, top: "50%", marginTop: -6 } : {}),
              ...(pos === "right"  ? { right: -7, top: "50%", marginTop: -6 } : {}),
            }}
              onClick={handlePortClick}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
        </>
      )}

      {/* Resize handle */}
      {selected && !editing && (
        <div
          onMouseDown={e => { e.stopPropagation(); onResizeStart(node.id, e); }}
          style={{
            position: "absolute", right: -6, bottom: -6, width: 14, height: 14,
            background: GOLD, border: "2px solid #0a0a0f",
            borderRadius: 2, cursor: "nwse-resize", zIndex: 2001,
            opacity: hovered ? 1 : 0.7, transition: "opacity 0.15s",
          }}
        />
      )}
    </div>
  );
}

/* ── Sticky Note (Miro-like) ──────────────────────────── */
function StickyContent({ node, stickyColor, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: node.color || stickyColor?.bg || "#fff3c4",
      borderRadius: 4,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)",
      display: "flex", flexDirection: "column",
      padding: 14, overflow: "hidden",
      color: node.color ? "#fff" : stickyColor?.fg || "#1a1a1a",
      fontFamily: editing ? "inherit" : "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive",
    }}>
      {editing ? (
        <>
          <input value={localTitle} onChange={e => setLocalTitle(e.target.value)}
            onBlur={finishEdit} autoFocus
            style={{ background: "rgba(0,0,0,0.1)", border: "none", borderRadius: 3,
              color: "inherit", padding: "2px 6px", fontSize: 14, fontWeight: 600,
              marginBottom: 4, outline: `1.5px solid ${GOLD}`, fontFamily: "inherit" }} />
          <textarea value={localBody} onChange={e => setLocalBody(e.target.value)}
            onBlur={finishEdit}
            style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 3,
              color: "inherit", padding: "2px 6px", fontSize: 13, flex: 1,
              resize: "none", outline: `1px solid ${GOLD}44`, fontFamily: "inherit" }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3, wordBreak: "break-word" }}>{node.title}</div>
          {node.body && <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4, flex: 1, overflow: "hidden", wordBreak: "break-word" }}>{node.body}</div>}
        </>
      )}
    </div>
  );
}

/* ── Shape ─────────────────────────────────────────────── */
function ShapeContent({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  const isCircle = node.shape === "circle";
  const isDiamond = node.shape === "diamond";
  const round = node.shape === "rounded-rect" ? 16 : 0;
  const bg = node.color || "rgba(30,30,40,0.9)";
  const clipPath = isDiamond ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" : isCircle ? "circle(50%)" : undefined;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: bg, borderRadius: round,
      clipPath, border: `2px solid ${node.borderColor || GOLD}`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {editing ? (
        <input value={localTitle} onChange={e => setLocalTitle(e.target.value)}
          onBlur={finishEdit} autoFocus
          style={{ width: "80%", background: "rgba(0,0,0,0.3)", border: `1.5px solid ${GOLD}`,
            borderRadius: 6, color: "#fff", textAlign: "center", fontSize: 13,
            padding: "4px 8px", outline: "none" }} />
      ) : (
        <span style={{
          color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center",
          padding: 8, lineHeight: 1.3, wordBreak: "break-word",
        }}>
          {node.title}
        </span>
      )}
    </div>
  );
}

/* ── Default (text / image) ────────────────────────────── */
function DefaultContent({ node, editing, localTitle, setLocalTitle, localBody, setLocalBody, finishEdit }: any) {
  if (node.imageUrl) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
        <img src={node.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      padding: "8px 12px", overflow: "hidden",
      background: node.color || "transparent",
      borderRadius: 10,
      border: node.color ? `1px solid ${node.borderColor || `${GOLD}44`}` : "none",
      color: "#e2e8f0",
    }}>
      {editing ? (
        <>
          <input value={localTitle} onChange={e => setLocalTitle(e.target.value)}
            onBlur={finishEdit} autoFocus
            style={{ background: "rgba(0,0,0,0.2)", border: "none", borderRadius: 4,
              color: "#fff", padding: "4px 8px", fontSize: 15, fontWeight: 600,
              marginBottom: 4, outline: `1.5px solid ${GOLD}` }} />
          <textarea value={localBody} onChange={e => setLocalBody(e.target.value)}
            onBlur={finishEdit}
            style={{ background: "rgba(0,0,0,0.1)", border: "none", borderRadius: 4,
              color: "#fff", padding: "4px 8px", fontSize: 13, flex: 1,
              resize: "none", outline: `1px solid ${GOLD}44` }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.3, wordBreak: "break-word" }}>{node.title}</div>
          {node.body && <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4, flex: 1, overflow: "hidden", wordBreak: "break-word" }}>{node.body}</div>}
        </>
      )}
    </div>
  );
}

/* ── Frame ─────────────────────────────────────────────── */
function FrameContent({ node, editing, localTitle, setLocalTitle, finishEdit }: any) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "rgba(15,23,42,0.12)", borderRadius: 12,
      border: "2px dashed rgba(212,180,97,0.3)",
      overflow: "hidden",
    }}>
      {editing ? (
        <input value={localTitle} onChange={e => setLocalTitle(e.target.value)}
          onBlur={finishEdit} autoFocus
          style={{ width: "100%", background: "rgba(212,180,97,0.1)", border: "none",
            color: GOLD, padding: "4px 12px", fontSize: 11, fontWeight: 600,
            outline: `1px solid ${GOLD}44` }} />
      ) : (
        <div style={{ padding: "4px 12px", fontSize: 11, color: GOLD, fontWeight: 600, borderBottom: "1px solid rgba(212,180,97,0.1)" }}>
          ▭ {node.title}
        </div>
      )}
    </div>
  );
}
