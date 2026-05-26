import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  X, Mail, Phone, Building2, MapPin, Tag, Save, Trash2,
  Instagram, Youtube, Linkedin, Globe, MessageSquare, PhoneCall, StickyNote, Send,
  Lightbulb, Wand2,
} from "lucide-react";
import { AISuggestAction, AIEmailDrafter } from "./AIAssist";
import {
  type CrmContact, type CrmActivity, type CrmOpportunity, type CrmTask,
  STATUS_COLORS, STATUS_LABEL, ACTIVITY_ICON, fullName, initials, formatMoney, timeAgo,
} from "./types";

const GOLD = "#d4b461";

type Detail = {
  contact: CrmContact;
  activities: CrmActivity[];
  opportunities: CrmOpportunity[];
  tasks: CrmTask[];
};

export function ContactDrawer({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<Detail>({
    queryKey: [`/api/crm-suite/contacts/${contactId}`],
  });
  const [edit, setEdit] = useState<Partial<CrmContact>>({});
  const [tab, setTab] = useState<"timeline" | "details" | "deals" | "tasks">("timeline");
  const [noteText, setNoteText] = useState("");
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const [aiEmailOpen, setAiEmailOpen] = useState(false);
  const [activityType, setActivityType] = useState<"note" | "email" | "call" | "sms" | "meeting">("note");

  useEffect(() => { setEdit({}); }, [contactId]);

  const c = data?.contact;
  const merged = c ? { ...c, ...edit } : null;

  const saveMut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/crm-suite/contacts/${contactId}`, edit),
    onSuccess: () => {
      toast({ title: "Saved" });
      queryClient.invalidateQueries({ queryKey: [`/api/crm-suite/contacts/${contactId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      setEdit({});
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const delMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/crm-suite/contacts/${contactId}`),
    onSuccess: () => {
      toast({ title: "Contact deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      onClose();
    },
  });

  const noteMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/activities", {
      contactId, type: activityType,
      title: activityType === "note" ? "Note added" : `${activityType.toUpperCase()} logged`,
      body: noteText,
    }),
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: [`/api/crm-suite/contacts/${contactId}`] });
    },
  });

  const dirty = Object.keys(edit).length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      {/* Drawer */}
      <aside
        style={{
          position: "absolute", right: 0, top: 0, height: "100vh",
          width: "min(720px, 100%)", background: "#0a0a0c",
          borderLeft: `1px solid ${GOLD}33`,
          display: "flex", flexDirection: "column",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.8)",
          animation: "drawerIn 0.25s ease",
        }}
      >
        <style>{`@keyframes drawerIn { from { transform: translateX(100%);} to { transform: translateX(0);} }`}</style>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 16 }}>
          {merged && (
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
              {initials(merged)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {merged ? fullName(merged) : "Loading..."}
            </div>
            {merged && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${STATUS_COLORS[merged.status]}22`, color: STATUS_COLORS[merged.status], textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {STATUS_LABEL[merged.status]}
                </span>
                {merged.score > 0 && <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>★ {merged.score}</span>}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{merged.email}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setAiSuggestOpen(true)}
              title="AI: suggest the next best action"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Lightbulb className="w-3.5 h-3.5" /> Suggest
            </button>
            <button
              onClick={() => setAiEmailOpen(true)}
              title="AI: draft an email"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Wand2 className="w-3.5 h-3.5" /> Draft
            </button>
            {dirty && (
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            )}
            <button
              onClick={() => { if (confirm("Delete this contact? This cannot be undone.")) delMut.mutate(); }}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
          {(["timeline", "details", "deals", "tasks"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none", border: "none", color: tab === t ? GOLD : "rgba(255,255,255,0.5)",
                padding: "14px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
              }}
            >
              {t}{t === "deals" && data?.opportunities.length ? ` (${data.opportunities.length})` : ""}
              {t === "tasks" && data?.tasks.filter(x => x.status === "open").length ? ` (${data.tasks.filter(x => x.status === "open").length})` : ""}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isLoading || !data ? (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading...</div>
          ) : tab === "details" ? (
            <DetailsTab contact={merged!} edit={edit} setEdit={setEdit} />
          ) : tab === "timeline" ? (
            <TimelineTab activities={data.activities} />
          ) : tab === "deals" ? (
            <DealsTab opps={data.opportunities} contactId={contactId} />
          ) : (
            <TasksTab tasks={data.tasks} contactId={contactId} />
          )}
        </div>

        {/* Activity composer (always visible on timeline) */}
        {tab === "timeline" && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", background: "rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {([
                { t: "note" as const,    icon: <StickyNote className="w-3 h-3" />, label: "Note" },
                { t: "email" as const,   icon: <Mail className="w-3 h-3" />,       label: "Email" },
                { t: "call" as const,    icon: <PhoneCall className="w-3 h-3" />,  label: "Call" },
                { t: "sms" as const,     icon: <MessageSquare className="w-3 h-3" />, label: "SMS" },
                { t: "meeting" as const, icon: <Send className="w-3 h-3" />,       label: "Meeting" },
              ]).map(({ t, icon, label }) => (
                <button key={t} onClick={() => setActivityType(t)}
                  style={{
                    background: activityType === t ? `${GOLD}22` : "rgba(255,255,255,0.03)",
                    color: activityType === t ? GOLD : "rgba(255,255,255,0.6)",
                    border: `1px solid ${activityType === t ? GOLD + "55" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                rows={2}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={`Log a ${activityType}...`}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
              />
              <button
                onClick={() => noteText.trim() && noteMut.mutate()}
                disabled={!noteText.trim() || noteMut.isPending}
                style={{
                  background: noteText.trim() ? `linear-gradient(135deg, ${GOLD}, #b8962e)` : "rgba(255,255,255,0.04)",
                  color: noteText.trim() ? "#000" : "rgba(255,255,255,0.3)",
                  border: "none", borderRadius: 8, padding: "0 14px", fontWeight: 800, fontSize: 13,
                  cursor: noteText.trim() ? "pointer" : "not-allowed",
                }}
              >
                Log
              </button>
            </div>
          </div>
        )}
      </aside>
      {aiSuggestOpen && <AISuggestAction contactId={contactId} onClose={() => setAiSuggestOpen(false)} />}
      {aiEmailOpen && <AIEmailDrafter contactId={contactId} onClose={() => setAiEmailOpen(false)} />}
    </div>
  );
}

/* ─── Tabs ─── */
function DetailsTab({ contact, edit, setEdit }: { contact: CrmContact; edit: Partial<CrmContact>; setEdit: (e: Partial<CrmContact>) => void }) {
  const set = (k: keyof CrmContact, v: any) => setEdit({ ...edit, [k]: v });
  const f = <K extends keyof CrmContact>(k: K): any => edit[k] !== undefined ? edit[k] : (contact as any)[k];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="First name" value={f("firstName") || ""} onChange={v => set("firstName", v)} />
      <Field label="Last name" value={f("lastName") || ""} onChange={v => set("lastName", v)} />
      <Field label="Email" value={f("email") || ""} onChange={v => set("email", v)} icon={<Mail className="w-3.5 h-3.5" />} />
      <Field label="Phone" value={f("phone") || ""} onChange={v => set("phone", v)} icon={<Phone className="w-3.5 h-3.5" />} />
      <Field label="Company" value={f("company") || ""} onChange={v => set("company", v)} icon={<Building2 className="w-3.5 h-3.5" />} />
      <Field label="Title" value={f("title") || ""} onChange={v => set("title", v)} />
      <SelectField label="Status" value={f("status")} onChange={v => set("status", v)}
        options={[["lead","Lead"], ["prospect","Prospect"], ["customer","Customer"], ["inactive","Inactive"]]} />
      <Field label="Score" type="number" value={String(f("score") ?? 0)} onChange={v => set("score", parseInt(v) || 0)} />
      <Field label="City" value={f("city") || ""} onChange={v => set("city", v)} icon={<MapPin className="w-3.5 h-3.5" />} />
      <Field label="Country" value={f("country") || ""} onChange={v => set("country", v)} />

      <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
        <Label>Social</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          <Field placeholder="https://instagram.com/..." value={f("instagram") || ""} onChange={v => set("instagram", v)} icon={<Instagram className="w-3.5 h-3.5" />} />
          <Field placeholder="https://youtube.com/..." value={f("youtube") || ""} onChange={v => set("youtube", v)} icon={<Youtube className="w-3.5 h-3.5" />} />
          <Field placeholder="https://linkedin.com/..." value={f("linkedin") || ""} onChange={v => set("linkedin", v)} icon={<Linkedin className="w-3.5 h-3.5" />} />
          <Field placeholder="https://..." value={f("website") || ""} onChange={v => set("website", v)} icon={<Globe className="w-3.5 h-3.5" />} />
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <Label>Tags</Label>
        <TagsEditor value={(f("tags") as string[]) || []} onChange={v => set("tags", v)} />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <Label>Notes</Label>
        <textarea
          value={f("notes") || ""}
          onChange={e => set("notes", e.target.value)}
          rows={4}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, marginTop: 6, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>
    </div>
  );
}

function TimelineTab({ activities }: { activities: CrmActivity[] }) {
  const [typeFilter, setTypeFilter] = useState<CrmActivity["type"] | "all">("all");
  const filtered = typeFilter === "all" ? activities : activities.filter(a => a.type === typeFilter);
  const types: { v: CrmActivity["type"] | "all"; label: string }[] = [
    { v: "all", label: "All" },
    { v: "note", label: "Notes" },
    { v: "email", label: "Email" },
    { v: "call", label: "Calls" },
    { v: "sms", label: "SMS" },
    { v: "meeting", label: "Meetings" },
    { v: "stage_change", label: "Stage" },
    { v: "system", label: "System" },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {types.map(t => (
          <button key={t.v} onClick={() => setTypeFilter(t.v)}
            style={{
              background: typeFilter === t.v ? `${GOLD}22` : "rgba(255,255,255,0.03)",
              color: typeFilter === t.v ? GOLD : "rgba(255,255,255,0.6)",
              border: `1px solid ${typeFilter === t.v ? GOLD + "55" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 99, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {!filtered.length ? <Empty>No activity matching this filter.</Empty> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.map((a, i) => (
            <div key={a.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(212,180,97,0.08)", border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {ACTIVITY_ICON[a.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{timeAgo(a.occurredAt)}</div>
                </div>
                {a.body && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{a.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DealsTab({ opps, contactId }: { opps: CrmOpportunity[]; contactId: string }) {
  if (!opps.length) return <Empty>No opportunities for this contact yet. Open the Pipelines tab to add one.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {opps.map(o => (
        <div key={o.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}22`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{o.title}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: GOLD }}>{formatMoney(o.valueCents, o.currency)}</div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{o.status}</div>
        </div>
      ))}
    </div>
  );
}

function TasksTab({ tasks, contactId }: { tasks: CrmTask[]; contactId: string }) {
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "done" }) => apiRequest("PATCH", `/api/crm-suite/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/crm-suite/contacts/${contactId}`] }),
  });
  if (!tasks.length) return <Empty>No tasks for this contact.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tasks.map(t => (
        <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={t.status === "done"}
            onChange={() => toggle.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })}
            style={{ width: 16, height: 16, accentColor: GOLD }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.status === "done" ? "rgba(255,255,255,0.4)" : "#fff", textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
            {t.dueAt && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Due {new Date(t.dueAt).toLocaleString()}</div>}
          </div>
        </label>
      ))}
    </div>
  );
}

/* ─── Field primitives ─── */
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>{children}</div>;
}

function Field({
  label, value, onChange, type = "text", icon, placeholder,
}: { label?: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode; placeholder?: string }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div style={{ position: "relative", marginTop: label ? 6 : 0 }}>
        {icon && <span style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`,
            borderRadius: 8, padding: icon ? "8px 12px 8px 32px" : "8px 12px",
            color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", marginTop: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none" }}
      >
        {options.map(([v, l]) => <option key={v} value={v} style={{ background: "#0a0a0c" }}>{l}</option>)}
      </select>
    </div>
  );
}

function TagsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8 }}>
      {value.map(t => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${GOLD}22`, border: `1px solid ${GOLD}55`, color: GOLD, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>
          {t}
          <button onClick={() => onChange(value.filter(x => x !== t))} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder="Add tag…"
        style={{ flex: 1, minWidth: 100, background: "transparent", border: "none", color: "#fff", fontSize: 12, outline: "none" }}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
      {children}
    </div>
  );
}
