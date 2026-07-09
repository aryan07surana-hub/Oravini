import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Panel,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Plus, Trash2, Edit3, Globe, Loader2, X, Check,
  Users, Eye, DollarSign, Layers, BarChart2, Zap, Link2,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR_BG = "#06060b";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

// ── Step type metadata ──────────────────────────────────────────────────────

const STEP_META: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  landing:      { label: "Landing / Opt-in", color: "#3b82f6", icon: "🏠", desc: "Lead capture page" },
  sales:        { label: "Sales Page",       color: "#d4b461", icon: "💰", desc: "Main VSL or sales copy" },
  upsell:       { label: "OTO Upsell",       color: "#22c55e", icon: "⬆️", desc: "One-time upgrade offer" },
  downsell:     { label: "Downsell",         color: "#f97316", icon: "⬇️", desc: "Lower-priced alternative" },
  order_bump:   { label: "Order Bump",       color: "#ec4899", icon: "🛒", desc: "Add-on at checkout" },
  thank_you:    { label: "Thank You",        color: "#a855f7", icon: "🙏", desc: "Post opt-in delivery" },
  confirmation: { label: "Confirmation",     color: "#06b6d4", icon: "✅", desc: "Order confirmed" },
  webinar:      { label: "Webinar Room",     color: "#ec4899", icon: "📡", desc: "Live or replay room" },
};

const STEP_TYPES = Object.keys(STEP_META);
const IS_OFFER = (type: string) => ["sales", "upsell", "downsell"].includes(type);

type Step = {
  id: string; funnel_id: string; name: string; type: string;
  slug: string; sections: any[]; color_scheme: string;
  position: number; next_step_id: string | null;
  yes_step_id: string | null; no_step_id: string | null;
  price: number | null; product_name: string | null;
  visits: number; conversions: number;
  canvas_x: number; canvas_y: number;
};

type Funnel = {
  id: string; name: string; slug: string; status: string;
  visits: number; leads: number; sales: number; revenue: number;
  steps: Step[];
};

// ── Custom Step Node ──────────────────────────────────────────────────────────

type StepNodeData = {
  step: Step;
  funnelId: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function StepNode({ data }: NodeProps) {
  const d = data as StepNodeData;
  const { step, funnelId, onSelect, onDelete } = d;
  const meta = STEP_META[step.type] || STEP_META.landing;
  const cvr = step.visits > 0 ? ((step.conversions / step.visits) * 100).toFixed(0) : "—";
  const isOffer = IS_OFFER(step.type);
  const [, nav] = useLocation();

  return (
    <div onClick={() => onSelect(step.id)} className="group relative" style={{ width: 240 }}>
      {/* Incoming handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: `${meta.color}80`, border: `2px solid ${meta.color}`, width: 10, height: 10, top: -5 }}
      />

      <div
        className="rounded-2xl overflow-hidden transition-all cursor-pointer"
        style={{
          background: CARD,
          border: `2px solid ${d.selected ? meta.color + "70" : "rgba(255,255,255,0.08)"}`,
          boxShadow: d.selected ? `0 0 30px ${meta.color}25, 0 8px 32px rgba(0,0,0,0.6)` : "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* Type banner */}
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: `${meta.color}12`, borderBottom: `1px solid ${meta.color}20` }}>
          <span className="text-sm">{meta.icon}</span>
          <span className="text-[9px] font-black uppercase tracking-widest flex-1" style={{ color: meta.color }}>{meta.label}</span>
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); nav(`/funnels/${funnelId}/steps/${step.id}/edit`); }}
              className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(step.id); }}
              className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          <p className="text-white font-black text-sm mb-0.5 truncate">{step.name}</p>
          <p className="text-zinc-600 text-[10px] truncate mb-2">/f/…/{step.slug}</p>
          {step.price && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md mb-2" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
              <DollarSign className="w-2.5 h-2.5" style={{ color: GOLD }} />
              <span className="text-[10px] font-black" style={{ color: GOLD }}>${step.price}</span>
            </div>
          )}
          <div className="flex gap-3 text-[10px]">
            <div><p className="text-white font-black">{step.visits || 0}</p><p className="text-zinc-600">visits</p></div>
            <div><p className="text-white font-black">{step.conversions || 0}</p><p className="text-zinc-600">convs</p></div>
            <div><p className="font-black" style={{ color: step.conversions > 0 ? "#22c55e" : "#52525b" }}>{cvr}%</p><p className="text-zinc-600">CVR</p></div>
          </div>
        </div>

        {d.selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 pb-3">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); nav(`/funnels/${funnelId}/steps/${step.id}/edit`); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black"
              style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35`, color: meta.color }}
            >
              <Edit3 className="w-3 h-3" />Edit Page Content
            </button>
          </motion.div>
        )}
      </div>

      {/* Outgoing handles */}
      {isOffer ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes"
            style={{ background: "#22c55e", border: "2px solid #22c55e", width: 10, height: 10, left: "30%", bottom: -5 }} />
          <Handle type="source" position={Position.Bottom} id="no"
            style={{ background: "#ef4444", border: "2px solid #ef4444", width: 10, height: 10, left: "70%", bottom: -5 }} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="next"
          style={{ background: `${meta.color}80`, border: `2px solid ${meta.color}`, width: 10, height: 10, bottom: -5 }} />
      )}
    </div>
  );
}

const NODE_TYPES = { step: StepNode };

// ── Helpers: steps → RF nodes/edges ──────────────────────────────────────────

function stepsToNodes(
  steps: Step[], funnelId: string, selectedId: string | null,
  onSelect: (id: string) => void, onDelete: (id: string) => void,
): Node[] {
  return steps.map((step, i) => ({
    id: step.id,
    type: "step",
    position: (step.canvas_x || step.canvas_y)
      ? { x: step.canvas_x, y: step.canvas_y }
      : { x: 300, y: i * 240 },
    data: { step, funnelId, selected: selectedId === step.id, onSelect, onDelete },
    draggable: true,
  }));
}

function stepsToEdges(steps: Step[]): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();

  const push = (srcId: string, tgtId: string | null, label: string, color: string, sourceHandle: string) => {
    if (!tgtId) return;
    const eid = `${srcId}-${sourceHandle}-${tgtId}`;
    if (seen.has(eid)) return;
    seen.add(eid);
    edges.push({
      id: eid, source: srcId, target: tgtId, sourceHandle,
      label,
      labelStyle: { fontSize: 9, fontWeight: 800, fill: color },
      labelBgStyle: { fill: "#0a0a14", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      style: { stroke: color, strokeWidth: 1.5 },
      animated: !label,
      type: "smoothstep",
    });
  };

  steps.forEach(step => {
    if (IS_OFFER(step.type)) {
      push(step.id, step.yes_step_id, "YES", "#22c55e", "yes");
      push(step.id, step.no_step_id, "NO", "#ef4444", "no");
    } else {
      const nextId = step.next_step_id || steps.find(s => s.position === step.position + 1)?.id || null;
      push(step.id, nextId, "", `${GOLD}70`, "next");
    }
  });

  return edges;
}

// ── Connect Modal ─────────────────────────────────────────────────────────────

function ConnectModal({ conn, steps, onSave, onClose }: {
  conn: Connection; steps: Step[];
  onSave: (conn: Connection, routeType: "yes" | "no" | "next") => void;
  onClose: () => void;
}) {
  const src = steps.find(s => s.id === conn.source);
  const isOffer = src ? IS_OFFER(src.type) : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="w-80 rounded-2xl overflow-hidden p-5"
        style={{ background: "#0a0a14", border: `1px solid ${PANEL_BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-black text-white mb-4">Set Connection Type</p>
        <div className="space-y-2">
          {isOffer ? (
            <>
              <button onClick={() => onSave(conn, "yes")}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center gap-3 px-4 hover:opacity-90"
                style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
                ✅ YES — Visitor accepts
              </button>
              <button onClick={() => onSave(conn, "no")}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center gap-3 px-4 hover:opacity-90"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171" }}>
                ❌ NO — Visitor declines
              </button>
            </>
          ) : (
            <button onClick={() => onSave(conn, "next")}
              className="w-full py-3 rounded-xl text-sm font-black flex items-center gap-3 px-4 hover:opacity-90"
              style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}30`, color: GOLD }}>
              → Next Step (auto-advance)
            </button>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Cancel</button>
      </motion.div>
    </motion.div>
  );
}

// ── Step Settings Sidebar ─────────────────────────────────────────────────────

function StepSettings({ step, allSteps, saving, onSave, onClose }: {
  step: Step; allSteps: Step[]; saving: boolean;
  onSave: (updates: Partial<Step>) => void; onClose: () => void;
}) {
  const [name, setName] = useState(step.name);
  const [type, setType] = useState(step.type);
  const [price, setPrice] = useState(step.price?.toString() || "");
  const [productName, setProductName] = useState(step.product_name || "");
  const [yesId, setYesId] = useState(step.yes_step_id || "");
  const [noId, setNoId] = useState(step.no_step_id || "");
  const [nextId, setNextId] = useState(step.next_step_id || "");
  const [, nav] = useLocation();

  useEffect(() => {
    setName(step.name); setType(step.type);
    setPrice(step.price?.toString() || ""); setProductName(step.product_name || "");
    setYesId(step.yes_step_id || ""); setNoId(step.no_step_id || "");
    setNextId(step.next_step_id || "");
  }, [step]);

  const meta = STEP_META[type] || STEP_META.landing;
  const isOffer = IS_OFFER(type);
  const iCls = "w-full px-3 py-2 rounded-lg text-sm text-white outline-none";
  const iSty = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  const sSty = { background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)" };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1.5">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: PANEL_BORDER }}>
        <div className="flex items-center gap-2">
          <span>{meta.icon}</span>
          <p className="text-xs font-black text-white truncate max-w-[140px]">{step.name}</p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <F label="Step Name">
          <input value={name} onChange={e => setName(e.target.value)} className={iCls} style={iSty} />
        </F>
        <F label="Page Type">
          <select value={type} onChange={e => setType(e.target.value)} className={`${iCls} appearance-none`} style={sSty}>
            {STEP_TYPES.map(t => <option key={t} value={t}>{STEP_META[t].icon} {STEP_META[t].label}</option>)}
          </select>
        </F>

        {isOffer && (
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: PANEL_BORDER }}>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Offer Details</p>
            <F label="Product Name">
              <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. VIP Coaching" className={iCls} style={iSty} />
            </F>
            <F label="Price ($)">
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="97" className={iCls} style={iSty} />
            </F>
          </div>
        )}

        <div className="space-y-3 pt-2 border-t" style={{ borderColor: PANEL_BORDER }}>
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Routing</p>
          {isOffer ? (
            <>
              <F label="✅ YES → go to">
                <select value={yesId} onChange={e => setYesId(e.target.value)} className={`${iCls} appearance-none`} style={sSty}>
                  <option value="">Auto (next step)</option>
                  {allSteps.filter(s => s.id !== step.id).map(s => <option key={s.id} value={s.id}>{STEP_META[s.type]?.icon} {s.name}</option>)}
                </select>
              </F>
              <F label="❌ NO → go to">
                <select value={noId} onChange={e => setNoId(e.target.value)} className={`${iCls} appearance-none`} style={sSty}>
                  <option value="">Auto (next step)</option>
                  {allSteps.filter(s => s.id !== step.id).map(s => <option key={s.id} value={s.id}>{STEP_META[s.type]?.icon} {s.name}</option>)}
                </select>
              </F>
            </>
          ) : (
            <F label="Next Step →">
              <select value={nextId} onChange={e => setNextId(e.target.value)} className={`${iCls} appearance-none`} style={sSty}>
                <option value="">Auto (next by position)</option>
                {allSteps.filter(s => s.id !== step.id).map(s => <option key={s.id} value={s.id}>{STEP_META[s.type]?.icon} {s.name}</option>)}
              </select>
            </F>
          )}
        </div>

        <button
          onClick={() => onSave({ name, type, price: price ? parseFloat(price) : null, product_name: productName || null, yes_step_id: yesId || null, no_step_id: noId || null, next_step_id: nextId || null })}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%)`, color: BG }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Save</>}
        </button>

        <button
          onClick={() => nav(`/funnels/${step.funnel_id}/steps/${step.id}/edit`)}
          className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${meta.color}25`, color: meta.color }}>
          <Edit3 className="w-4 h-4" />Edit Page Content
        </button>
      </div>
    </div>
  );
}

// ── Add Step Modal ────────────────────────────────────────────────────────────

function AddStepModal({ onAdd, onClose }: { onAdd: (type: string, name: string) => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#0a0a14", border: `1px solid ${PANEL_BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: PANEL_BORDER }}>
          <p className="font-black text-white">Add Step</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {STEP_TYPES.map(type => {
            const m = STEP_META[type];
            return (
              <button key={type} onClick={() => { onAdd(type, m.label); onClose(); }}
                className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${m.color}14`, border: `1px solid ${m.color}25` }}>{m.icon}</div>
                <div>
                  <p className="text-sm font-black text-white">{m.label}</p>
                  <p className="text-[10px] text-zinc-500">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Canvas (inside ReactFlowProvider) ────────────────────────────────────────

function FunnelCanvas({ funnelId, steps, onStepsChange }: {
  funnelId: string; steps: Step[]; onStepsChange: (s: Step[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingConn, setPendingConn] = useState<Connection | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [saved, setSaved] = useState(false);
  const [, nav] = useLocation();
  const posTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSelect = useCallback((id: string) => setSelectedId(prev => prev === id ? null : id), []);
  const handleDelete = useCallback(async (stepId: string) => {
    await fetch(`/api/funnels/${funnelId}/steps/${stepId}`, { method: "DELETE", credentials: "include" });
    onStepsChange(steps.filter(s => s.id !== stepId));
    setSelectedId(null);
  }, [funnelId, steps, onStepsChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    stepsToNodes(steps, funnelId, selectedId, handleSelect, handleDelete)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(stepsToEdges(steps));

  useEffect(() => {
    setNodes(stepsToNodes(steps, funnelId, selectedId, handleSelect, handleDelete));
    setEdges(stepsToEdges(steps));
  }, [steps, selectedId]);

  const onConnect = useCallback((conn: Connection) => setPendingConn(conn), []);

  const saveConnection = async (conn: Connection, routeType: "yes" | "no" | "next") => {
    const updates: Partial<Step> = {};
    if (routeType === "yes") updates.yes_step_id = conn.target ?? null;
    else if (routeType === "no") updates.no_step_id = conn.target ?? null;
    else updates.next_step_id = conn.target ?? null;
    const r = await fetch(`/api/funnels/${funnelId}/steps/${conn.source}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(updates),
    });
    const updated = await r.json();
    onStepsChange(steps.map(s => s.id === conn.source ? { ...s, ...updated } : s));
    setPendingConn(null);
  };

  const onNodeDragStop = useCallback((_: MouseEvent | TouchEvent, node: Node) => {
    const { x, y } = node.position;
    onStepsChange(steps.map(s => s.id === node.id ? { ...s, canvas_x: x, canvas_y: y } : s));
    if (posTimer.current) clearTimeout(posTimer.current);
    posTimer.current = setTimeout(() => {
      fetch(`/api/funnels/${funnelId}/steps/${node.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ canvas_x: x, canvas_y: y }),
      });
    }, 600);
  }, [funnelId, steps, onStepsChange]);

  const addStep = async (type: string, name: string) => {
    const r = await fetch(`/api/funnels/${funnelId}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ type, name, canvas_x: 300, canvas_y: steps.length * 240 }),
    });
    const step = await r.json();
    onStepsChange([...steps, step]);
    setSelectedId(step.id);
  };

  const saveStep = async (stepId: string, updates: Partial<Step>) => {
    setSavingStep(true);
    try {
      const r = await fetch(`/api/funnels/${funnelId}/steps/${stepId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(updates),
      });
      const updated = await r.json();
      onStepsChange(steps.map(s => s.id === stepId ? { ...s, ...updated } : s));
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSavingStep(false); }
  };

  const selectedStep = steps.find(s => s.id === selectedId) || null;

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
          minZoom={0.2}
          maxZoom={2}
          style={{ background: "#020204" }}
          deleteKeyCode={null}
          connectionLineStyle={{ stroke: `${GOLD}80`, strokeWidth: 2 }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background color="rgba(255,255,255,0.04)" gap={28} size={1} />
          <Controls
            style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
            showInteractive={false}
          />
          <MiniMap
            style={{ background: "#06060b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
            nodeColor={n => {
              const s = steps.find(st => st.id === n.id);
              return s ? `${STEP_META[s.type]?.color || GOLD}60` : "#333";
            }}
            maskColor="rgba(0,0,0,0.6)"
          />
          <Panel position="top-right">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black shadow-2xl hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: BG }}>
              <Plus className="w-3.5 h-3.5" />Add Step
            </button>
          </Panel>
        </ReactFlow>

        {steps.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
              <Layers className="w-8 h-8" style={{ color: GOLD }} />
            </div>
            <p className="text-zinc-500 text-sm">Add your first step to start building</p>
          </div>
        )}
      </div>

      {/* Step Settings Sidebar */}
      <AnimatePresence>
        {selectedStep && (
          <motion.div
            key={selectedStep.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="w-[260px] flex-shrink-0"
            style={{ background: SIDEBAR_BG, borderLeft: `1px solid ${PANEL_BORDER}` }}
          >
            <StepSettings
              step={selectedStep} allSteps={steps} saving={savingStep}
              onSave={u => saveStep(selectedStep.id, u)}
              onClose={() => setSelectedId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddStepModal onAdd={addStep} onClose={() => setShowAddModal(false)} />}
        {pendingConn && (
          <ConnectModal conn={pendingConn} steps={steps}
            onSave={saveConnection} onClose={() => setPendingConn(null)} />
        )}
      </AnimatePresence>

      {saved && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-green-400 pointer-events-none z-50"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <Check className="w-3.5 h-3.5" />Saved
        </motion.div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FunnelBuilder() {
  const [, params] = useRoute("/funnels/:id/edit");
  const id = params?.id ?? "";
  const [, nav] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Funnel>({
    queryKey: [`/api/funnels/${id}`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    enabled: !!id,
  });

  const [steps, setSteps] = useState<Step[]>([]);
  const [funnel, setFunnel] = useState<Omit<Funnel, "steps"> | null>(null);
  const [savingFunnel, setSavingFunnel] = useState(false);

  useEffect(() => {
    if (data) {
      setSteps(data.steps || []);
      const { steps: _, ...rest } = data;
      setFunnel(rest);
    }
  }, [data]);

  const togglePublish = async () => {
    if (!funnel) return;
    setSavingFunnel(true);
    const newStatus = funnel.status === "active" ? "draft" : "active";
    const r = await fetch(`/api/funnels/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
    const updated = await r.json();
    setFunnel(prev => prev ? { ...prev, ...updated } : null);
    qc.invalidateQueries({ queryKey: ["/api/funnels"] });
    setSavingFunnel(false);
  };

  if (isLoading || !funnel) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: PANEL_BORDER, background: SIDEBAR_BG }}>
        <div className="flex items-center gap-3">
          <button onClick={() => nav("/funnels")} className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-black text-white">{funnel.name}</p>
            <p className="text-[10px] text-zinc-600">/f/{funnel.slug}</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-5 text-xs">
            {[
              { label: "Visits",   value: funnel.visits  || 0,   icon: Eye },
              { label: "Leads",    value: funnel.leads   || 0,   icon: Users },
              { label: "Revenue",  value: `$${Number(funnel.revenue || 0).toFixed(0)}`, icon: DollarSign },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-zinc-500">
                <s.icon className="w-3 h-3" />
                <span className="font-black text-white">{s.value}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav(`/funnels/${id}/analytics`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <BarChart2 className="w-3.5 h-3.5" />Analytics
          </button>
          <button onClick={() => nav(`/funnels/${id}/automations`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <Zap className="w-3.5 h-3.5" />Automations
          </button>
          <button onClick={() => nav(`/funnels/${id}/domain`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <Link2 className="w-3.5 h-3.5" />Domain
          </button>
          {funnel.status === "active" && (
            <a href={`/f/${funnel.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
              <Eye className="w-3.5 h-3.5" />Preview
            </a>
          )}
          <button onClick={togglePublish} disabled={savingFunnel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all"
            style={{
              background: funnel.status === "active" ? "rgba(239,68,68,0.12)" : `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`,
              color: funnel.status === "active" ? "#f87171" : BG,
              border: funnel.status === "active" ? "1px solid rgba(239,68,68,0.28)" : "none",
            }}>
            {savingFunnel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {funnel.status === "active" ? "Unpublish" : "Publish Funnel"}
          </button>
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="flex flex-1 min-h-0">
        <ReactFlowProvider>
          <FunnelCanvas funnelId={id} steps={steps} onStepsChange={setSteps} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
