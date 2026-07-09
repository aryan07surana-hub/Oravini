import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Edit3, Zap, Mail, MessageSquare,
  Globe, Tag, Loader2, Play, ChevronDown, Check, X, ToggleLeft, ToggleRight,
  AlertCircle, ArrowRight,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR_BG = "#06060b";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

// ── Types ─────────────────────────────────────────────────────────────────────

type Action =
  | { type: "send_email"; subject: string; body: string; from_name: string }
  | { type: "send_sms"; message: string }
  | { type: "add_tag"; tag: string }
  | { type: "webhook"; url: string };

type Automation = {
  id: string;
  funnel_id: string;
  name: string;
  trigger_event: string;
  trigger_step_id: string | null;
  trigger_step_name: string | null;
  trigger_step_type: string | null;
  actions: Action[];
  active: boolean;
  created_at: string;
};

type FunnelStep = { id: string; name: string; type: string; position: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_EVENTS = [
  { value: "lead_captured",  label: "Lead Captured",     icon: Mail,    desc: "Fires when visitor submits an opt-in form" },
  { value: "page_visited",   label: "Page Visited",      icon: Globe,   desc: "Fires when visitor lands on a step" },
  { value: "purchase_made",  label: "Purchase Made",     icon: Zap,     desc: "Fires when visitor accepts an offer" },
];

const ACTION_TYPES = [
  { type: "send_email", label: "Send Email",    icon: Mail,           color: "#3b82f6" },
  { type: "send_sms",   label: "Send SMS",      icon: MessageSquare,  color: "#22c55e" },
  { type: "add_tag",    label: "Add Tag",       icon: Tag,            color: GOLD },
  { type: "webhook",    label: "Webhook",       icon: Globe,          color: "#a855f7" },
];

function defaultAction(type: string): Action {
  if (type === "send_email") return { type: "send_email", subject: "Welcome to {{funnel}}!", body: "<p>Hey {{name}},</p><p>Thanks for joining. Here's what's next...</p>", from_name: "My Brand" };
  if (type === "send_sms")   return { type: "send_sms",   message: "Hey {{name}}, thanks for signing up! Check your email for next steps." };
  if (type === "add_tag")    return { type: "add_tag",    tag: "funnel-lead" };
  return { type: "webhook",   url: "" };
}

// ── Action Icon + color helper ────────────────────────────────────────────────

function actionMeta(type: string) {
  return ACTION_TYPES.find(a => a.type === type) || ACTION_TYPES[0];
}

// ── Action Editor ─────────────────────────────────────────────────────────────

function ActionEditor({ action, onChange, onRemove }: {
  action: Action; onChange: (a: Action) => void; onRemove: () => void;
}) {
  const meta = actionMeta(action.type);
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${meta.color}25`, background: `${meta.color}06` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}18` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
        </div>
        <span className="text-xs font-black text-white flex-1">{meta.label}</span>
        <button onClick={e => { e.stopPropagation(); onRemove(); }} className="text-zinc-700 hover:text-red-400 transition-colors mr-1">
          <X className="w-3.5 h-3.5" />
        </button>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-3">

            {action.type === "send_email" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1">From Name</p>
                    <input value={action.from_name} onChange={e => onChange({ ...action, from_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border outline-none"
                      style={{ borderColor: PANEL_BORDER }} placeholder="My Brand" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1">Subject</p>
                    <input value={action.subject} onChange={e => onChange({ ...action, subject: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border outline-none"
                      style={{ borderColor: PANEL_BORDER }} placeholder="Welcome!" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-1">Body HTML <span className="text-zinc-700">— use {"{{name}}"} {"{{email}}"}</span></p>
                  <textarea value={action.body} onChange={e => onChange({ ...action, body: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border outline-none font-mono resize-none"
                    style={{ borderColor: PANEL_BORDER }} />
                </div>
              </>
            )}

            {action.type === "send_sms" && (
              <div>
                <p className="text-[10px] text-zinc-600 mb-1">Message <span className="text-zinc-700">— use {"{{name}}"}</span></p>
                <textarea value={action.message} onChange={e => onChange({ ...action, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border outline-none resize-none"
                  style={{ borderColor: PANEL_BORDER }} />
                <p className="text-[9px] text-zinc-700 mt-1">Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM env vars</p>
              </div>
            )}

            {action.type === "add_tag" && (
              <div>
                <p className="text-[10px] text-zinc-600 mb-1">Tag name</p>
                <input value={action.tag} onChange={e => onChange({ ...action, tag: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border outline-none"
                  style={{ borderColor: PANEL_BORDER }} placeholder="e.g. buyer, vip, cold-lead" />
                <p className="text-[9px] text-zinc-700 mt-1">Added to the contact's tag array in funnel_contacts</p>
              </div>
            )}

            {action.type === "webhook" && (
              <div>
                <p className="text-[10px] text-zinc-600 mb-1">POST URL</p>
                <input value={action.url} onChange={e => onChange({ ...action, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border outline-none font-mono"
                  style={{ borderColor: PANEL_BORDER }} placeholder="https://hooks.zapier.com/..." />
                <p className="text-[9px] text-zinc-700 mt-1">Sends JSON: {"{ contact, automation_id, trigger }"}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Automation Card ───────────────────────────────────────────────────────────

function AutomationCard({ auto, steps, onEdit, onDelete, onToggle, onTest, testing }: {
  auto: Automation; steps: FunnelStep[];
  onEdit: () => void; onDelete: () => void;
  onToggle: () => void; onTest: () => void;
  testing: boolean;
}) {
  const triggerMeta = TRIGGER_EVENTS.find(t => t.value === auto.trigger_event) || TRIGGER_EVENTS[0];
  const TriggerIcon = triggerMeta.icon;
  const actions: Action[] = Array.isArray(auto.actions) ? auto.actions : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: `1px solid ${auto.active ? `${GOLD}20` : PANEL_BORDER}` }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: PANEL_BORDER }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: auto.active ? `${GOLD}14` : "rgba(255,255,255,0.05)" }}>
          <Zap className="w-4 h-4" style={{ color: auto.active ? GOLD : "#52525b" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">{auto.name}</p>
          <p className="text-[10px] text-zinc-600">
            {triggerMeta.label}
            {auto.trigger_step_name && <span> · on "{auto.trigger_step_name}"</span>}
          </p>
        </div>
        <button onClick={onToggle} className="flex-shrink-0 transition-opacity hover:opacity-70">
          {auto.active
            ? <ToggleRight className="w-6 h-6" style={{ color: GOLD }} />
            : <ToggleLeft className="w-6 h-6 text-zinc-600" />}
        </button>
      </div>

      {/* Trigger → Actions flow */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-2 mb-4">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <TriggerIcon className="w-3 h-3 text-zinc-400" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">When</p>
            <p className="text-xs font-bold text-white">{triggerMeta.label}</p>
            {auto.trigger_step_name && (
              <p className="text-[10px] text-zinc-600">on step: {auto.trigger_step_name}</p>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex items-start gap-2 mb-4">
            <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
              <div className="w-px h-3" style={{ background: PANEL_BORDER }} />
              <ArrowRight className="w-3 h-3 text-zinc-700" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">Then</p>
              <div className="space-y-1.5">
                {actions.map((a, i) => {
                  const m = actionMeta(a.type);
                  const AIcon = m.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: `${m.color}0a`, border: `1px solid ${m.color}18` }}>
                      <AIcon className="w-3 h-3 flex-shrink-0" style={{ color: m.color }} />
                      <span className="text-xs font-bold" style={{ color: m.color }}>{m.label}</span>
                      <span className="text-[10px] text-zinc-600 truncate">
                        {a.type === "send_email" ? a.subject : a.type === "send_sms" ? a.message?.slice(0, 40) : a.type === "add_tag" ? a.tag : a.url?.slice(0, 40)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {actions.length === 0 && (
          <div className="flex items-center gap-2 text-zinc-700 text-xs mb-4">
            <AlertCircle className="w-3.5 h-3.5" />No actions configured
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={onEdit}
            className="flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${PANEL_BORDER}` }}>
            <Edit3 className="w-3.5 h-3.5" />Edit
          </button>
          <button onClick={onTest} disabled={testing}
            className="flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}25`, color: GOLD }}>
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Test
          </button>
          <button onClick={onDelete}
            className="py-2 px-3 rounded-xl text-xs text-red-500 hover:text-red-400 transition-colors"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Automation Editor Modal ───────────────────────────────────────────────────

function AutomationModal({ initial, steps, funnelId, onSave, onClose }: {
  initial: Partial<Automation> | null;
  steps: FunnelStep[];
  funnelId: string;
  onSave: (data: Partial<Automation>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "New Automation");
  const [triggerEvent, setTriggerEvent] = useState(initial?.trigger_event || "lead_captured");
  const [triggerStepId, setTriggerStepId] = useState<string>(initial?.trigger_step_id || "");
  const [actions, setActions] = useState<Action[]>(
    Array.isArray(initial?.actions) ? initial.actions : []
  );

  const addAction = (type: string) => setActions(prev => [...prev, defaultAction(type) as Action]);
  const updateAction = (i: number, a: Action) => setActions(prev => prev.map((x, idx) => idx === i ? a : x));
  const removeAction = (i: number) => setActions(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({
      name,
      trigger_event: triggerEvent,
      trigger_step_id: triggerStepId || null,
      actions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: PANEL_BORDER }}>
          <h2 className="text-sm font-black text-white">{initial?.id ? "Edit" : "New"} Automation</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Automation Name</p>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-white/5 border outline-none"
              style={{ borderColor: PANEL_BORDER }} />
          </div>

          {/* Trigger */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-3">Trigger — When this happens</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {TRIGGER_EVENTS.map(t => {
                const Icon = t.icon;
                const active = triggerEvent === t.value;
                return (
                  <button key={t.value} onClick={() => setTriggerEvent(t.value)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{ background: active ? `${GOLD}14` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? GOLD + "40" : "rgba(255,255,255,0.07)"}` }}>
                    <Icon className="w-4 h-4 mb-1.5" style={{ color: active ? GOLD : "#71717a" }} />
                    <p className="text-xs font-black" style={{ color: active ? GOLD : "#a1a1aa" }}>{t.label}</p>
                    <p className="text-[9px] text-zinc-700 mt-0.5 leading-tight">{t.desc}</p>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="text-[10px] text-zinc-600 mb-1.5">On which step? <span className="text-zinc-700">(leave blank for any step)</span></p>
              <select value={triggerStepId} onChange={e => setTriggerStepId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white border outline-none"
                style={{ background: "#0a0a0f", borderColor: PANEL_BORDER }}>
                <option value="">Any step</option>
                {steps.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-3">Actions — Then do this</p>
            <div className="space-y-2 mb-3">
              {actions.map((a, i) => (
                <ActionEditor key={i} action={a}
                  onChange={updated => updateAction(i, updated)}
                  onRemove={() => removeAction(i)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPES.map(at => {
                const AIcon = at.icon;
                return (
                  <button key={at.type} onClick={() => addAction(at.type)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                    style={{ background: `${at.color}0a`, border: `1px solid ${at.color}20`, color: at.color }}>
                    <Plus className="w-3 h-3" /><AIcon className="w-3 h-3" />{at.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: PANEL_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
            <Check className="w-3.5 h-3.5" />Save Automation
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FunnelAutomations() {
  const [, params] = useRoute("/funnels/:id/automations");
  const id = params?.id ?? "";
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [editingAuto, setEditingAuto] = useState<Partial<Automation> | null | false>(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: [`/api/funnels/${id}/automations`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}/automations`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!id,
  });

  const { data: funnel } = useQuery<any>({
    queryKey: [`/api/funnels/${id}`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!id,
  });

  const { data: steps = [] } = useQuery<FunnelStep[]>({
    queryKey: [`/api/funnels/${id}/steps`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}/steps`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      return Array.isArray(data) ? data : data.steps || [];
    },
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [`/api/funnels/${id}/automations`] });

  const createMut = useMutation({
    mutationFn: async (body: Partial<Automation>) => {
      const r = await fetch(`/api/funnels/${id}/automations`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { invalidate(); setEditingAuto(false); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ automId, body }: { automId: string; body: Partial<Automation> }) => {
      const r = await fetch(`/api/funnels/${id}/automations/${automId}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { invalidate(); setEditingAuto(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async (automId: string) => {
      await fetch(`/api/funnels/${id}/automations/${automId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: invalidate,
  });

  const testMut = useMutation({
    mutationFn: async (automId: string) => {
      const r = await fetch(`/api/funnels/${id}/automations/${automId}/test`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (data) => { setTestMsg(data.message || "Test sent!"); setTimeout(() => setTestMsg(null), 4000); setTestingId(null); },
    onError: () => { setTestingId(null); },
  });

  const handleSave = (data: Partial<Automation>) => {
    if (editingAuto && (editingAuto as Automation).id) {
      updateMut.mutate({ automId: (editingAuto as Automation).id, body: data });
    } else {
      createMut.mutate(data);
    }
  };

  const handleTest = (automId: string) => {
    setTestingId(automId);
    testMut.mutate(automId);
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Topbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: PANEL_BORDER, background: SIDEBAR_BG }}>
        <div className="flex items-center gap-3">
          <button onClick={() => nav(`/funnels/${id}/edit`)} className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-black text-white">{funnel?.name || "Funnel"}</p>
            <p className="text-[10px] text-zinc-600">Automation Triggers</p>
          </div>
        </div>
        <button onClick={() => setEditingAuto({})}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
          <Plus className="w-3.5 h-3.5" />New Automation
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {testMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: "#22c55e18", border: "1px solid #22c55e30", color: "#22c55e" }}>
            <Check className="w-4 h-4" />{testMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Explainer */}
        <div className="flex items-start gap-4 p-5 rounded-2xl mb-8" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}>
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
          <div>
            <p className="text-sm font-black text-white mb-1">Automation Triggers</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Automatically send emails, SMS messages, add CRM tags, or fire webhooks when visitors interact with your funnel.
              Triggers fire immediately when the event occurs. Use <code className="text-zinc-400">{"{{name}}"}</code> and <code className="text-zinc-400">{"{{email}}"}</code> as merge tags.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : automations.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
              <Zap className="w-8 h-8" style={{ color: `${GOLD}60` }} />
            </div>
            <p className="text-lg font-black text-white mb-2">No Automations Yet</p>
            <p className="text-sm text-zinc-600 mb-6">Create your first trigger to automate email follow-ups, SMS alerts, and CRM tagging</p>
            <button onClick={() => setEditingAuto({})}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
              <Plus className="w-4 h-4" />Create First Automation
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {automations.map(auto => (
              <AutomationCard key={auto.id} auto={auto} steps={steps}
                onEdit={() => setEditingAuto(auto)}
                onDelete={() => deleteMut.mutate(auto.id)}
                onToggle={() => updateMut.mutate({ automId: auto.id, body: { active: !auto.active } })}
                onTest={() => handleTest(auto.id)}
                testing={testingId === auto.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {editingAuto !== false && (
          <AutomationModal
            initial={editingAuto}
            steps={steps}
            funnelId={id}
            onSave={handleSave}
            onClose={() => setEditingAuto(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
