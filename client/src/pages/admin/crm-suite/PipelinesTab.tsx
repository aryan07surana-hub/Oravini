import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trophy, X, DollarSign, User, Flame, Clock } from "lucide-react";
import {
  type CrmPipeline, type CrmOpportunity, type CrmContact,
  formatMoney, fullName, initials,
} from "./types";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function PipelinesTab({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const { toast } = useToast();
  const { data: pipelines = [] } = useQuery<CrmPipeline[]>({ queryKey: ["/api/crm-suite/pipelines"] });
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const activeId = pipelineId || pipelines[0]?.id || null;
  const active = pipelines.find(p => p.id === activeId);

  const { data: opps = [] } = useQuery<CrmOpportunity[]>({
    queryKey: ["/api/crm-suite/opportunities", activeId],
    queryFn: () => apiRequest("GET", `/api/crm-suite/opportunities?pipelineId=${activeId}&status=open`),
    enabled: !!activeId,
  });
  const { data: contacts = [] } = useQuery<CrmContact[]>({ queryKey: ["/api/crm-suite/contacts"] });
  const contactById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const [showCreate, setShowCreate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const moveMut = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      apiRequest("PATCH", `/api/crm-suite/opportunities/${id}`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/opportunities", activeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
    },
  });

  const wonMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/crm-suite/opportunities/${id}`, { status: "won" }),
    onSuccess: () => {
      toast({ title: "Marked as won 🎉" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/opportunities", activeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
    },
  });

  const lostMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/crm-suite/opportunities/${id}`, { status: "lost" }),
    onSuccess: () => {
      toast({ title: "Marked as lost" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/opportunities", activeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
    },
  });

  const sortedOpps = useMemo(() => {
    if (!active) return [];
    const stageOrder = new Map(active.stages.map((s, i) => [s.id, i]));
    return [...opps].sort((a, b) => {
      const sa = stageOrder.get(a.stageId) ?? 0;
      const sb = stageOrder.get(b.stageId) ?? 0;
      if (sa !== sb) return sa - sb;
      return a.position - b.position;
    });
  }, [active, opps]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!sortedOpps.length) return;

      const idx = selectedId ? sortedOpps.findIndex(o => o.id === selectedId) : -1;
      const cur = idx >= 0 ? sortedOpps[idx] : null;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = sortedOpps[Math.min(sortedOpps.length - 1, (idx < 0 ? 0 : idx + 1))];
        if (next) setSelectedId(next.id);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = sortedOpps[Math.max(0, idx - 1)];
        if (next) setSelectedId(next.id);
        return;
      }
      if (!cur) return;
      const stageIdx = active.stages.findIndex(s => s.id === cur.stageId);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = active.stages[Math.min(active.stages.length - 1, stageIdx + 1)];
        if (next && next.id !== cur.stageId) {
          moveMut.mutate({ id: cur.id, stageId: next.id });
          if (next.isWon) wonMut.mutate(cur.id);
          if (next.isLost) lostMut.mutate(cur.id);
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = active.stages[Math.max(0, stageIdx - 1)];
        if (next && next.id !== cur.stageId) {
          moveMut.mutate({ id: cur.id, stageId: next.id });
        }
        return;
      }
      if (e.key === "w") { e.preventDefault(); wonMut.mutate(cur.id); }
      if (e.key === "l") { e.preventDefault(); lostMut.mutate(cur.id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, sortedOpps, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No pipeline yet</div>
        <div style={{ fontSize: 13 }}>Bootstrap should have created a default — try refreshing.</div>
      </div>
    );
  }

  const oppsByStage = new Map<string, CrmOpportunity[]>();
  for (const o of opps) {
    if (!oppsByStage.has(o.stageId)) oppsByStage.set(o.stageId, []);
    oppsByStage.get(o.stageId)!.push(o);
  }
  for (const list of oppsByStage.values()) list.sort((a, b) => a.position - b.position);

  const totalValue = opps.reduce((s, o) => s + o.valueCents, 0);
  const weightedValue = opps.reduce((s, o) => {
    const stage = active.stages.find(st => st.id === o.stageId);
    return s + o.valueCents * ((stage?.probability ?? 0) / 100);
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={activeId || ""}
            onChange={e => setPipelineId(e.target.value)}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", outline: "none" }}
          >
            {pipelines.map(p => <option key={p.id} value={p.id} style={{ background: "#0a0a0c" }}>{p.name}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            <kbd style={kbd()}>J</kbd>/<kbd style={kbd()}>K</kbd> nav · <kbd style={kbd()}>←</kbd>/<kbd style={kbd()}>→</kbd> stage · <kbd style={kbd()}>W</kbd> won · <kbd style={kbd()}>L</kbd> lost
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Stat label="Total pipeline" value={formatMoney(totalValue)} accent={GOLD} />
          <Stat label="Weighted forecast" value={formatMoney(weightedValue)} accent="#a78bfa" />
          <Stat label="Open deals" value={String(opps.length)} accent="#22c55e" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
        {active.stages.map(stage => {
          const stageOpps = oppsByStage.get(stage.id) || [];
          const stageValue = stageOpps.reduce((s, o) => s + o.valueCents, 0);
          return (
            <div
              key={stage.id}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                const id = e.dataTransfer.getData("text/plain");
                if (id) {
                  moveMut.mutate({ id, stageId: stage.id });
                  if (stage.isWon) wonMut.mutate(id);
                  if (stage.isLost) lostMut.mutate(id);
                }
              }}
              style={{
                minWidth: 280, width: 280, flexShrink: 0,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${stage.color}33`,
                borderRadius: 14, display: "flex", flexDirection: "column",
                maxHeight: "calc(100vh - 280px)",
              }}
            >
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${stage.color}22`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: stage.color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stage.name}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: `${stage.color}18`, borderRadius: 99, padding: "2px 8px" }}>
                  {stageOpps.length}
                </span>
              </div>
              <div style={{ padding: "8px 14px", fontSize: 11, color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {formatMoney(stageValue)} {stage.probability > 0 && stage.probability < 100 && `· ${stage.probability}%`}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                {stageOpps.map(o => {
                  const c = o.contactId ? contactById.get(o.contactId) : null;
                  const isSelected = selectedId === o.id;
                  const days = daysSince(o.updatedAt);
                  const rotting = !stage.isWon && !stage.isLost && days >= 14;
                  const veryRotting = days >= 30;
                  return (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData("text/plain", o.id)}
                      onClick={() => { setSelectedId(o.id); if (c) onOpenContact(c.id); }}
                      style={{
                        background: isSelected ? "rgba(212,180,97,0.08)" : "rgba(0,0,0,0.4)",
                        border: `1px solid ${isSelected ? GOLD + "88" : veryRotting ? "rgba(239,68,68,0.4)" : rotting ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 10, padding: "10px 12px", cursor: "grab",
                        transition: "transform 0.15s, border-color 0.15s",
                        boxShadow: isSelected ? `0 0 0 2px ${GOLD}22` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3, flex: 1 }}>
                          {o.title}
                        </div>
                        {(rotting || veryRotting) && (
                          <span title={`${days}d untouched`} style={{ flexShrink: 0, color: veryRotting ? "#ef4444" : "#f59e0b" }}>
                            <Flame className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      {c && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 6, background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                            {initials(c)}
                          </div>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName(c)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: GOLD, display: "flex", alignItems: "center", gap: 2 }}>
                          <DollarSign className="w-3 h-3" />{formatMoney(o.valueCents).replace("$", "")}
                        </span>
                        <span style={{ fontSize: 10, color: rotting ? (veryRotting ? "#ef4444" : "#f59e0b") : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock className="w-2.5 h-2.5" />
                          {days === 0 ? "today" : `${days}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {!stageOpps.length && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "20px 8px" }}>
                    Drop deals here
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCreate(stage.id)}
                style={{
                  background: "none", border: `1px dashed ${stage.color}55`, color: "rgba(255,255,255,0.5)",
                  borderRadius: 8, margin: 10, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Plus className="w-3 h-3" /> Add deal
              </button>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateOpportunityModal
          pipelineId={active.id}
          stageId={showCreate}
          contacts={contacts}
          onClose={() => setShowCreate(null)}
        />
      )}
    </div>
  );
}

function kbd(): React.CSSProperties {
  return { display: "inline-block", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "0 5px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.04)" };
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}33`, borderRadius: 10, padding: "8px 14px", minWidth: 130 }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function CreateOpportunityModal({ pipelineId, stageId, contacts, onClose }: {
  pipelineId: string; stageId: string; contacts: CrmContact[]; onClose: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [value, setValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/opportunities", {
      pipelineId, stageId,
      contactId: contactId || null,
      title,
      description: description || null,
      valueCents: Math.round((parseFloat(value) || 0) * 100),
      currency: "USD",
      expectedCloseDate: closeDate ? new Date(closeDate).toISOString() : null,
    }),
    onSuccess: () => {
      toast({ title: "Deal created" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/opportunities", pipelineId] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Couldn't create", description: e.message, variant: "destructive" }),
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, padding: 28, width: "min(480px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>New Deal</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input placeholder="Deal name (e.g. Tier 5 mentorship)" value={title} onChange={setTitle} />
          <select
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none" }}
          >
            <option value="" style={{ background: "#0a0a0c" }}>Link a contact (optional)</option>
            {contacts.slice(0, 200).map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a0c" }}>{fullName(c)}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input placeholder="Value ($)" type="number" value={value} onChange={setValue} />
            <Input placeholder="Close date" type="date" value={closeDate} onChange={setCloseDate} />
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
          />
          <button
            onClick={() => title.trim() && createMut.mutate()}
            disabled={!title.trim() || createMut.isPending}
            style={{
              background: title.trim() ? `linear-gradient(135deg, ${GOLD}, #b8962e)` : "rgba(255,255,255,0.04)",
              color: title.trim() ? "#000" : "rgba(255,255,255,0.3)",
              border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 800, fontSize: 14,
              cursor: title.trim() ? "pointer" : "not-allowed", marginTop: 4,
            }}
          >
            Create deal
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
    />
  );
}
