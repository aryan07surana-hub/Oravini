import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CrmContact, fullName, initials, STATUS_LABEL } from "./types";

const GOLD = "#d4b461";

type Action = {
  id: string;
  label: string;
  hint?: string;
  kind: "open-contact" | "new-contact" | "new-task" | "new-deal" | "import-csv" | "export-csv" | "duplicates" | "tab";
  payload?: any;
};

export function QuickPalette({
  onClose, onOpenContact, onSwitchTab, onNewContact, onNewTask, onNewDeal,
  onImportCSV, onExportCSV, onOpenDuplicates,
}: {
  onClose: () => void;
  onOpenContact: (id: string) => void;
  onSwitchTab: (t: "dashboard" | "contacts" | "pipelines" | "tasks" | "settings") => void;
  onNewContact: () => void;
  onNewTask: () => void;
  onNewDeal: () => void;
  onImportCSV: () => void;
  onExportCSV: () => void;
  onOpenDuplicates: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const { data: contacts = [] } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm-suite/contacts", "palette"],
    queryFn: () => apiRequest("GET", "/api/crm-suite/contacts?limit=500"),
  });

  const items = useMemo<Action[]>(() => {
    const base: Action[] = [
      { id: "new-contact", label: "New contact", hint: "C", kind: "new-contact" },
      { id: "new-task", label: "New task", hint: "T", kind: "new-task" },
      { id: "new-deal", label: "New deal", hint: "D", kind: "new-deal" },
      { id: "import-csv", label: "Import contacts from CSV", kind: "import-csv" },
      { id: "export-csv", label: "Export contacts to CSV", kind: "export-csv" },
      { id: "duplicates", label: "Find duplicate contacts", kind: "duplicates" },
      { id: "tab-dashboard", label: "Go to · Dashboard", kind: "tab", payload: "dashboard" },
      { id: "tab-contacts", label: "Go to · Contacts", kind: "tab", payload: "contacts" },
      { id: "tab-pipelines", label: "Go to · Pipelines", kind: "tab", payload: "pipelines" },
      { id: "tab-tasks", label: "Go to · Tasks", kind: "tab", payload: "tasks" },
      { id: "tab-settings", label: "Go to · Settings", kind: "tab", payload: "settings" },
    ];

    const ql = q.trim().toLowerCase();
    const filteredActions = ql
      ? base.filter(a => a.label.toLowerCase().includes(ql))
      : base;

    const matchedContacts: Action[] = (ql ? contacts.filter(c => {
      const hay = [c.firstName, c.lastName, c.email, c.phone, c.company].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(ql);
    }) : []).slice(0, 8).map(c => ({
      id: `contact-${c.id}`,
      label: `${fullName(c)} · ${c.email || c.phone || STATUS_LABEL[c.status]}`,
      kind: "open-contact",
      payload: c.id,
    }));

    return [...matchedContacts, ...filteredActions];
  }, [q, contacts]);

  useEffect(() => { setActive(0); }, [q]);

  const choose = (it: Action) => {
    onClose();
    setTimeout(() => {
      switch (it.kind) {
        case "open-contact": onOpenContact(it.payload); break;
        case "new-contact":  onNewContact(); break;
        case "new-task":     onNewTask(); break;
        case "new-deal":     onNewDeal(); break;
        case "import-csv":   onImportCSV(); break;
        case "export-csv":   onExportCSV(); break;
        case "duplicates":   onOpenDuplicates(); break;
        case "tab":          onSwitchTab(it.payload); break;
      }
    }, 0);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "14vh" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(560px, 92%)", background: "#0a0a0c", border: `1px solid ${GOLD}55`, borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${GOLD}22`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search contacts, jump to a tab, or run a command…"
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
              else if (e.key === "Enter" && items[active]) { e.preventDefault(); choose(items[active]); }
              else if (e.key === "Escape") { onClose(); }
            }}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 15 }}
          />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>ESC</span>
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {items.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No matches.</div>
          )}
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => choose(it)}
              onMouseEnter={() => setActive(i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", textAlign: "left",
                background: i === active ? `${GOLD}14` : "none",
                border: "none", borderLeft: i === active ? `2px solid ${GOLD}` : "2px solid transparent",
                color: "#fff", fontSize: 13, cursor: "pointer",
              }}
            >
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
              {it.hint && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 4 }}>{it.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
