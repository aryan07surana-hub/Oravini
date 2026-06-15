import {
  MousePointer2, StickyNote, Square, MoveRight, Type, Image, Hand,
  Undo2, Redo2, Download, ZoomIn, ZoomOut,
  Trash2, Copy, BringToFront, SendToBack,
  Palette, ArrowLeftRight,
} from "lucide-react";
import { GOLD, STICKY_COLORS, SHAPE_PRESETS, CONNECTOR_COLORS, NODE_COLORS, type ToolMode } from "./types";

interface Props {
  mode: ToolMode;
  onModeChange: (m: ToolMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAddSticky: (kind: string) => void;
  onAddShape: (kind: string) => void;
  onAddText: () => void;
  onAddImage: () => void;
  selectedId: string | null;
  selectedIds: string[];
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  nodeColor?: string;
  onChangeColor: (color: string) => void;
  connectorColor?: string;
  onChangeConnectorColor: (color: string) => void;
  onOpenTemplates: () => void;
  onAutoLayout: () => void;
}

function ToolBtn({ icon, label, active, onClick, disabled }: {
  icon: React.ReactNode; label: string; active?: boolean;
  onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? GOLD : "rgba(255,255,255,0.06)",
        color: active ? "#0a0a0f" : "#b0b0c0",
        border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />;
}

export default function BoardToolbar({
  mode, onModeChange, canUndo, canRedo, onUndo, onRedo,
  onExport, zoom, onZoomIn, onZoomOut, onZoomReset,
  onAddSticky, onAddShape, onAddText, onAddImage,
  selectedId, selectedIds, onDeleteSelected, onDuplicateSelected,
  onBringToFront, onSendToBack,
  nodeColor, onChangeColor, connectorColor, onChangeConnectorColor,
  onOpenTemplates, onAutoLayout,
}: Props) {
  const hasSelection = selectedId !== null || selectedIds.length > 0;

  return (
    <div style={{
      position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 2,
      padding: "6px 10px", background: "rgba(15,18,30,0.92)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, backdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      zIndex: 5000,
    }}>
      {/* Tools */}
      <ToolBtn icon={<MousePointer2 size={16} />} label="Select (V)" active={mode === "select"} onClick={() => onModeChange("select")} />
      <ToolBtn icon={<StickyNote size={16} />} label="Sticky Note (S)" active={mode === "sticky"} onClick={() => onModeChange("sticky")} />
      <ToolBtn icon={<Square size={16} />} label="Shape (R)" active={mode === "shape"} onClick={() => onModeChange("shape")} />
      <ToolBtn icon={<MoveRight size={16} />} label="Connector (C)" active={mode === "connector"} onClick={() => onModeChange("connector")} />
      <ToolBtn icon={<Type size={16} />} label="Text (T)" active={mode === "text"} onClick={() => onModeChange("text")} />
      <ToolBtn icon={<Image size={16} />} label="Image (I)" active={mode === "image"} onClick={() => onModeChange("image")} />
      <ToolBtn icon={<Hand size={16} />} label="Hand (H)" active={mode === "hand"} onClick={() => onModeChange("hand")} />

      <Divider />

      {/* Undo/Redo */}
      <ToolBtn icon={<Undo2 size={15} />} label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
      <ToolBtn icon={<Redo2 size={15} />} label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo} />

      {/* Selection actions */}
      {hasSelection && (
        <>
          <Divider />
          <ToolBtn icon={<Trash2 size={15} />} label="Delete" onClick={onDeleteSelected} />
          <ToolBtn icon={<Copy size={15} />} label="Duplicate (Ctrl+D)" onClick={onDuplicateSelected} />
          <ToolBtn icon={<BringToFront size={15} />} label="Bring to Front" onClick={onBringToFront} />
          <ToolBtn icon={<SendToBack size={15} />} label="Send to Back" onClick={onSendToBack} />
        </>
      )}

      <Divider />

      {/* Export */}
      <ToolBtn icon={<Download size={15} />} label="Export PNG" onClick={onExport} />

      {/* Templates & Auto Layout */}
      <ToolBtn icon={<ArrowLeftRight size={15} />} label="Auto Layout" onClick={onAutoLayout} />

      <Divider />

      {/* Zoom */}
      <ToolBtn icon={<ZoomOut size={15} />} label="Zoom Out" onClick={onZoomOut} />
      <button
        onClick={onZoomReset}
        title="Reset Zoom"
        style={{
          background: "none", border: "none", color: "#b0b0c0",
          cursor: "pointer", fontSize: 12, fontWeight: 600,
          minWidth: 40, textAlign: "center", fontVariantNumeric: "tabular-nums",
          padding: "2px 4px",
        }}
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolBtn icon={<ZoomIn size={15} />} label="Zoom In" onClick={onZoomIn} />

      {/* Format bar (when node selected) */}
      {hasSelection && selectedId && (
        <>
          <Divider />
          <ColorPicker current={nodeColor || ""} onChange={onChangeColor} colors={NODE_COLORS} title="Node Color" />
          <ColorPicker current={connectorColor || CONNECTOR_COLORS[0]} onChange={onChangeConnectorColor} colors={CONNECTOR_COLORS} title="Border/Connector Color" />
        </>
      )}
    </div>
  );
}

function ColorPicker({ current, onChange, colors, title }: {
  current: string; onChange: (c: string) => void; colors: string[]; title: string;
}) {
  return (
    <div title={title} style={{ display: "flex", alignItems: "center", gap: 3, padding: "0 4px" }}>
      {colors.map(c => (
        <div key={c} onClick={() => onChange(c)}
          style={{
            width: 16, height: 16, borderRadius: "50%", background: c,
            border: c === "#ffffff" ? "1px solid rgba(255,255,255,0.3)" : "none",
            cursor: "pointer", outline: current === c ? `2px solid ${GOLD}` : "none",
            outlineOffset: 2, transition: "transform 0.1s",
            boxShadow: c === "#ffffff" ? "none" : "inset 0 1px 2px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.2)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        />
      ))}
    </div>
  );
}
