import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Merge as MergeIcon, ExternalLink } from "lucide-react";
import { type CrmContact, fullName, initials, timeAgo, STATUS_COLORS, STATUS_LABEL } from "./types";

const GOLD = "#d4b461";

type DupGroup = {
  key: string;
  n: number;
  ids: string[];
  contacts: Array<{
    id: string; firstName: string | null; lastName: string | null;
    email: string | null; phone: string | null; company: string | null;
    status: CrmContact["status"]; createdAt: string; updatedAt: string;
  }>;
};

export function DuplicatesPanel({ onClose, onOpenContact }: { onClose: () => void; onOpenContact: (id: string) => void }) {
  const { toast } = useToast();
  const { data: groups = [], isLoading } = useQuery<DupGroup[]>({ queryKey: ["/api/crm-suite/contacts/duplicates"] });
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = useMemo(() => groups.find(g => g.key === activeKey) || groups[0], [groups, activeKey]);

  const [keepId, setKeepId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({}); // field -> contactId

  const mergeMut = useMutation({
    mutationFn: () => {
      if (!active || !keepId) throw new Error("nothing selected");
      const fields: Record<string, any> = {};
      const k = active.contacts.find(c => c.id === keepId)!;
      // Build merged fields based on per-row choices, defaulting to the keeper
      const map: Array<[keyof typeof k, string]> = [
        ["firstName", "firstName"], ["lastName", "lastName"], ["email", "email"],
        ["phone", "phone"], ["company", "company"],
      ];
      for (const [src, fld] of map) {
        const fromId = chosen[fld] || keepId;
        const c = active.contacts.find(x => x.id === fromId)!;
        fields[fld] = (c as any)[src];
      }
      return apiRequest("POST", "/api/crm-suite/contacts/merge", {
        keepId,
        mergeIds: active.contacts.filter(c => c.id !== keepId).map(c => c.id),
        fields,
      });
    },
    onSuccess: () => {
      toast({ title: "Merged successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      setKeepId(null);
      setChosen({});
    },
    onError: (e: any) => toast({ title: "Merge failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "absolute", inset: "5vh 5vw", background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>Duplicate detection</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "4px 0 0" }}>{groups.length} duplicate group{groups.length === 1 ? "" : "s"} found</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr", overflow: "hidden" }}>
          {/* Left rail */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", padding: "8px 0" }}>
            {isLoading ? (
              <div style={{ padding: 20, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Scanning…</div>
            ) : groups.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                No duplicates 🎉
              </div>
            ) : (
              groups.map(g => (
                <button
                  key={g.key}
                  onClick={() => { setActiveKey(g.key); setKeepId(g.contacts[0]?.id ?? null); setChosen({}); }}
                  style={{
                    width: "100%", textAlign: "left", background: active?.key === g.key ? "rgba(212,180,97,0.08)" : "none",
                    border: "none", borderLeft: active?.key === g.key ? `2px solid ${GOLD}` : "2px solid transparent",
                    padding: "10px 14px", color: "#fff", cursor: "pointer", fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: GOLD, marginBottom: 2 }}>{g.key}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>{g.n} contacts</div>
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div style={{ overflowY: "auto", padding: "16px 24px" }}>
            {!active ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", padding: 24 }}>Select a group on the left.</div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                  Pick the keeper. We'll absorb all activities, opportunities, tasks, and tags from the others, then soft-delete them. Per-field overrides let you mix and match the cleanest data.
                </p>

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th style={th()}>Keep</th>
                      <th style={th()}>Name</th>
                      <th style={th()}>Email</th>
                      <th style={th()}>Phone</th>
                      <th style={th()}>Company</th>
                      <th style={th()}>Status</th>
                      <th style={th()}>Updated</th>
                      <th style={th()}>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.contacts.map(c => {
                      const isKeeper = keepId === c.id;
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isKeeper ? "rgba(212,180,97,0.05)" : "none" }}>
                          <td style={td()}>
                            <input type="radio" checked={isKeeper} onChange={() => setKeepId(c.id)} style={{ accentColor: GOLD, cursor: "pointer" }} />
                          </td>
                          <td style={td()}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{initials(c)}</div>
                              <span>{fullName(c)}</span>
                            </div>
                          </td>
                          <td style={td()}><PickCell field="email" value={c.email} contactId={c.id} chosen={chosen} setChosen={setChosen} /></td>
                          <td style={td()}><PickCell field="phone" value={c.phone} contactId={c.id} chosen={chosen} setChosen={setChosen} /></td>
                          <td style={td()}><PickCell field="company" value={c.company} contactId={c.id} chosen={chosen} setChosen={setChosen} /></td>
                          <td style={td()}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status], textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {STATUS_LABEL[c.status]}
                            </span>
                          </td>
                          <td style={td()}>{timeAgo(c.updatedAt)}</td>
                          <td style={td()}>
                            <button onClick={() => onOpenContact(c.id)} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    disabled={!keepId || mergeMut.isPending}
                    onClick={() => mergeMut.mutate()}
                    style={{
                      background: keepId ? `linear-gradient(135deg, ${GOLD}, #b8962e)` : "rgba(255,255,255,0.04)",
                      color: keepId ? "#000" : "rgba(255,255,255,0.3)",
                      border: "none", borderRadius: 10, padding: "11px 22px",
                      fontWeight: 800, fontSize: 13, cursor: keepId ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <MergeIcon className="w-3.5 h-3.5" />
                    Merge {active.contacts.length} contacts → 1
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PickCell({ field, value, contactId, chosen, setChosen }: { field: string; value: any; contactId: string; chosen: Record<string,string>; setChosen: (v: Record<string,string>) => void }) {
  if (!value) return <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>;
  const isPicked = chosen[field] === contactId;
  return (
    <button
      onClick={() => setChosen({ ...chosen, [field]: contactId })}
      style={{
        background: isPicked ? `${GOLD}22` : "none",
        border: `1px solid ${isPicked ? GOLD + "55" : "rgba(255,255,255,0.06)"}`,
        color: isPicked ? GOLD : "rgba(255,255,255,0.7)",
        borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200,
      }}
      title="Pick this value as the merged record"
    >
      {String(value)}
    </button>
  );
}

const th = (): React.CSSProperties => ({ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 10px", textAlign: "left" });
const td = (): React.CSSProperties => ({ padding: "10px", fontSize: 12, color: "rgba(255,255,255,0.85)", verticalAlign: "middle" });
