import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Columns3, ListTodo, Settings as SettingsIcon,
  Plus, Search, Upload, Download, RefreshCw, CheckCircle2,
  TrendingUp, DollarSign, Target, AlertCircle, Tag as TagIcon,
  Bookmark, Star, MoreHorizontal, Trash2, Archive, Mail, Phone, X,
  Copy as CopyIcon, ChevronRight,
} from "lucide-react";
import {
  type CrmContact, type CrmTask, type CrmTag, type CrmPipeline, type CrmSmartList,
  STATUS_COLORS, STATUS_LABEL, ACTIVITY_ICON,
  fullName, initials, formatMoney, timeAgo,
} from "./crm-suite/types";
import { ContactDrawer } from "./crm-suite/ContactDrawer";
import { PipelinesTab } from "./crm-suite/PipelinesTab";
import { ImportCSVModal } from "./crm-suite/ImportCSVModal";
import { DuplicatesPanel } from "./crm-suite/DuplicatesPanel";
import { QuickPalette } from "./crm-suite/QuickPalette";
import { ApiKeysPanel } from "./crm-suite/ApiKeysPanel";
import { useCrmRealtime } from "./crm-suite/useCrmRealtime";
import { downloadFile } from "./crm-suite/csv";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

type TabKey = "dashboard" | "contacts" | "pipelines" | "tasks" | "settings";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { key: "contacts",  label: "Contacts",   icon: Users },
  { key: "pipelines", label: "Pipelines",  icon: Columns3 },
  { key: "tasks",     label: "Tasks",      icon: ListTodo },
  { key: "settings",  label: "Settings",   icon: SettingsIcon },
];

/* ─── URL state helpers ─── */
function readURL() {
  const u = new URL(window.location.href);
  return {
    tab: (u.searchParams.get("tab") as TabKey) || "dashboard",
    contact: u.searchParams.get("contact"),
    list: u.searchParams.get("list"),
  };
}
function writeURL(state: { tab?: TabKey; contact?: string | null; list?: string | null }) {
  const u = new URL(window.location.href);
  if (state.tab) u.searchParams.set("tab", state.tab);
  if (state.contact !== undefined) {
    if (state.contact) u.searchParams.set("contact", state.contact);
    else u.searchParams.delete("contact");
  }
  if (state.list !== undefined) {
    if (state.list) u.searchParams.set("list", state.list);
    else u.searchParams.delete("list");
  }
  window.history.replaceState({}, "", u.toString());
}

export default function AdminCRMSuite() {
  return (
    <AdminLayout>
      <CRMSuiteInner isAdmin={true} />
    </AdminLayout>
  );
}

export function CRMSuiteInner({ isAdmin }: { isAdmin: boolean }) {
  // Subscribe to live updates
  useCrmRealtime();

  const initial = readURL();
  const [tab, setTab] = useState<TabKey>(initial.tab);
  const [openContactId, setOpenContactId] = useState<string | null>(initial.contact);
  const [activeListId, setActiveListId] = useState<string | null>(initial.list);

  const [showImport, setShowImport] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);

  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);

  // Sync URL on changes
  useEffect(() => writeURL({ tab, contact: openContactId, list: activeListId }), [tab, openContactId, activeListId]);

  // Cmd+K palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowPalette(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { toast } = useToast();
  const restoreMut = useMutation({
    mutationFn: (ids: string[]) => apiRequest("POST", "/api/crm-suite/contacts/bulk", { action: "restore", ids }),
    onSuccess: () => {
      toast({ title: "Restored" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/smart-lists"] });
      setUndo(null);
    },
  });

  const handleExportCSV = async () => {
    const r = await fetch("/api/crm-suite/contacts/export.csv", { credentials: "include" });
    if (!r.ok) { toast({ title: "Export failed", variant: "destructive" }); return; }
    const blob = await r.blob();
    downloadFile(`oravini-contacts-${new Date().toISOString().slice(0,10)}.csv`, blob);
    toast({ title: "CSV downloaded" });
  };

  return (
    <>
      <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 20, minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              CRM
              <span style={{ fontSize: 10, fontWeight: 800, color: "#000", background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, borderRadius: 99, padding: "3px 10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Live
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              Contacts · Pipelines · Activities · Tasks — synced in real time across your team.
            </p>
          </div>
          <button
            onClick={() => setShowPalette(true)}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12 }}
          >
            <Search className="w-3.5 h-3.5" />
            Quick search…
            <span style={{ marginLeft: 24, fontSize: 10, border: "1px solid rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: 4, fontFamily: "ui-monospace, Menlo, monospace" }}>⌘K</span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  background: "none", border: "none",
                  color: active ? GOLD : "rgba(255,255,255,0.5)",
                  padding: "12px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                }}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, animation: "fadeIn 0.2s ease" }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;} }`}</style>
          {tab === "dashboard" && (
            <DashboardTab
              isAdmin={isAdmin}
              onOpenContact={setOpenContactId}
              onShowDuplicates={() => setShowDuplicates(true)}
              onShowImport={() => setShowImport(true)}
              onExportCSV={handleExportCSV}
            />
          )}
          {tab === "contacts" && (
            <ContactsTab
              onOpenContact={setOpenContactId}
              activeListId={activeListId}
              setActiveListId={setActiveListId}
              onShowImport={() => setShowImport(true)}
              onExportCSV={handleExportCSV}
              onShowDuplicates={() => setShowDuplicates(true)}
              onUndoSet={setUndo}
              onNewContact={() => setShowNewContact(true)}
            />
          )}
          {tab === "pipelines" && <PipelinesTab onOpenContact={setOpenContactId} />}
          {tab === "tasks" && <TasksTab onOpenContact={setOpenContactId} onNewTask={() => setShowNewTask(true)} />}
          {tab === "settings" && <SettingsTab isAdmin={isAdmin} />}
        </div>
      </div>

      {/* Drawer + modals */}
      {openContactId && <ContactDrawer contactId={openContactId} onClose={() => setOpenContactId(null)} />}
      {showImport && <ImportCSVModal onClose={() => setShowImport(false)} />}
      {showDuplicates && <DuplicatesPanel onClose={() => setShowDuplicates(false)} onOpenContact={id => { setOpenContactId(id); setShowDuplicates(false); }} />}
      {showPalette && (
        <QuickPalette
          onClose={() => setShowPalette(false)}
          onOpenContact={setOpenContactId}
          onSwitchTab={setTab}
          onNewContact={() => setShowNewContact(true)}
          onNewTask={() => setShowNewTask(true)}
          onNewDeal={() => { setTab("pipelines"); setShowNewDeal(true); }}
          onImportCSV={() => setShowImport(true)}
          onExportCSV={handleExportCSV}
          onOpenDuplicates={() => setShowDuplicates(true)}
        />
      )}
      {showNewContact && <CreateContactModal onClose={() => setShowNewContact(false)} />}
      {showNewTask && <CreateTaskModal onClose={() => setShowNewTask(false)} />}

      {/* Undo toast */}
      {undo && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 400, background: "#0a0a0c", border: `1px solid ${GOLD}55`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 16px 50px rgba(0,0,0,0.7)", animation: "fadeIn 0.2s ease" }}>
          <span style={{ fontSize: 13, color: "#fff" }}>{undo.label}</span>
          <button onClick={() => restoreMut.mutate(undo.ids)} style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            Undo
          </button>
          <button onClick={() => setUndo(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

/* ═════════════════════════════════════════════════════════
   DASHBOARD TAB
═════════════════════════════════════════════════════════ */
function DashboardTab({
  onOpenContact, onShowDuplicates, onShowImport, onExportCSV, isAdmin,
}: {
  onOpenContact: (id: string) => void;
  onShowDuplicates: () => void;
  onShowImport: () => void;
  onExportCSV: () => void;
  isAdmin: boolean;
}) {
  const { data, isLoading, refetch, isFetching } = useQuery<{
    counts: { contacts: number; leads: number; customers: number; openOpportunities: number; lostOpportunities: number; openTasks: number; overdueTasks: number };
    revenue: { pipelineCents: number; wonCents: number };
    stageStats: { id: string; name: string; color: string; deals: number; total_value: string | number }[];
    recentActivities: any[];
  }>({ queryKey: ["/api/crm-suite/dashboard"] });

  const { toast } = useToast();
  const importMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/contacts/import-from-platform"),
    onSuccess: (r: any) => {
      toast({ title: "Import complete", description: `+${r.landingLeads} leads, +${r.users} users, +${r.dmLeads} DM contacts` });
      queryClient.invalidateQueries();
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const tier5Mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/sync-tier5"),
    onSuccess: (r: any) => {
      toast({
        title: "Tier 5 synced",
        description: `+${r.inserted} new · ↻${r.updated} updated${r.demoted ? ` · ${r.demoted} demoted` : ""}`,
      });
      queryClient.invalidateQueries();
    },
    onError: (e: any) => toast({ title: "Tier 5 sync failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !data) return <Loading />;
  const c = data.counts;
  const r = data.revenue;

  const tiles = [
    { label: "Total contacts",       value: c.contacts.toLocaleString(),           accent: GOLD,       icon: <Users className="w-4 h-4" /> },
    { label: "Active leads",         value: c.leads.toLocaleString(),              accent: "#60a5fa",  icon: <Target className="w-4 h-4" /> },
    { label: "Customers",            value: c.customers.toLocaleString(),          accent: "#22c55e",  icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: "Open opportunities",   value: c.openOpportunities.toLocaleString(),  accent: "#a78bfa",  icon: <Columns3 className="w-4 h-4" /> },
    { label: "Pipeline value",       value: formatMoney(r.pipelineCents),          accent: GOLD,       icon: <DollarSign className="w-4 h-4" /> },
    { label: "Closed won",           value: formatMoney(r.wonCents),               accent: "#22c55e",  icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Open tasks",           value: c.openTasks.toLocaleString(),          accent: "#f59e0b",  icon: <ListTodo className="w-4 h-4" /> },
    { label: "Overdue tasks",        value: c.overdueTasks.toLocaleString(),       accent: "#ef4444",  icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>Overview</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onShowImport} style={tbBtn(GOLD)}><Upload className="w-3.5 h-3.5" /> Import CSV</button>
          <button onClick={onExportCSV} style={tbBtn("rgba(255,255,255,0.7)")}><Download className="w-3.5 h-3.5" /> Export CSV</button>
          {isAdmin && (
            <>
              <button onClick={() => importMut.mutate()} disabled={importMut.isPending} style={tbBtn(GOLD)}>
                <Upload className="w-3.5 h-3.5" /> {importMut.isPending ? "Importing..." : "Pull platform leads"}
              </button>
              <button onClick={() => tier5Mut.mutate()} disabled={tier5Mut.isPending} style={tbBtn("#22c55e")}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {tier5Mut.isPending ? "Syncing..." : "Sync Tier 5 clients"}
              </button>
              <button onClick={onShowDuplicates} style={tbBtn("#f59e0b")}><CopyIcon className="w-3.5 h-3.5" /> Find duplicates</button>
            </>
          )}
          <button onClick={() => refetch()} disabled={isFetching} style={tbBtn("rgba(255,255,255,0.6)")}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${t.accent}22`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: t.accent }}>
              {t.icon}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>{t.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: t.accent, fontVariantNumeric: "tabular-nums" }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }} className="bv-crm-dash-grid">
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Pipeline by stage</div>
          {data.stageStats.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No stages yet — go to Settings.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.stageStats.map(s => {
                const total = Number(s.total_value) || 0;
                const max = Math.max(1, ...data.stageStats.map(x => Number(x.total_value) || 0));
                return (
                  <div key={s.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
                        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{s.name}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>· {s.deals} deal{s.deals === 1 ? "" : "s"}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: GOLD, fontVariantNumeric: "tabular-nums" }}>{formatMoney(total)}</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(total / max) * 100}%`, background: s.color, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Recent activity</div>
          {data.recentActivities.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No activity yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
              {data.recentActivities.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => a.contactId && onOpenContact(a.contactId)}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", textAlign: "left", cursor: a.contactId ? "pointer" : "default", display: "flex", gap: 10 }}
                >
                  <span style={{ fontSize: 14 }}>{ACTIVITY_ICON[a.type as keyof typeof ACTIVITY_ICON] || "•"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{timeAgo(a.occurredAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@media(max-width:1000px){ .bv-crm-dash-grid{grid-template-columns:1fr !important;} }`}</style>
    </div>
  );
}

function tbBtn(accent: string): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${accent === "rgba(255,255,255,0.6)" ? "rgba(255,255,255,0.1)" : accent + "33"}`,
    borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700,
    color: accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  };
}

/* ═════════════════════════════════════════════════════════
   CONTACTS TAB — with smart-list rail, multi-select, bulk
═════════════════════════════════════════════════════════ */
function ContactsTab({
  onOpenContact, activeListId, setActiveListId, onShowImport, onExportCSV,
  onShowDuplicates, onUndoSet, onNewContact,
}: {
  onOpenContact: (id: string) => void;
  activeListId: string | null;
  setActiveListId: (id: string | null) => void;
  onShowImport: () => void;
  onExportCSV: () => void;
  onShowDuplicates: () => void;
  onUndoSet: (u: { ids: string[]; label: string } | null) => void;
  onNewContact: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [scoreMin, setScoreMin] = useState<string>("");
  const [lastContactedDays, setLastContactedDays] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSaveList, setShowSaveList] = useState(false);

  const { toast } = useToast();
  const { data: smartLists = [] } = useQuery<CrmSmartList[]>({ queryKey: ["/api/crm-suite/smart-lists"] });
  const { data: tags = [] } = useQuery<CrmTag[]>({ queryKey: ["/api/crm-suite/tags"] });

  // When active smart list changes, seed filter inputs from it
  const activeList = smartLists.find(l => l.id === activeListId) || null;
  useEffect(() => {
    if (activeList) {
      setQ(activeList.filters.q || "");
      setStatus(activeList.filters.status || "");
      setTag(activeList.filters.tag || "");
      setScoreMin(activeList.filters.scoreMin != null ? String(activeList.filters.scoreMin) : "");
      setLastContactedDays(activeList.filters.lastContactedDays != null ? String(activeList.filters.lastContactedDays) : "");
      setSelected(new Set());
    }
  }, [activeListId]); // eslint-disable-line

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (status) queryParams.set("status", status);
  if (tag) queryParams.set("tag", tag);
  if (scoreMin) queryParams.set("scoreMin", scoreMin);
  if (lastContactedDays) queryParams.set("lastContactedDays", lastContactedDays);

  const { data: contacts = [], isLoading } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm-suite/contacts", q, status, tag, scoreMin, lastContactedDays],
    queryFn: () => apiRequest("GET", `/api/crm-suite/contacts?${queryParams.toString()}`),
  });

  // Bulk action mutations
  const bulkMut = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: any }) =>
      apiRequest("POST", "/api/crm-suite/contacts/bulk", { ids: [...selected], action, payload }),
    onSuccess: (r: any, vars) => {
      toast({ title: `Updated ${r.affected ?? selected.size} contact${(r.affected ?? selected.size) === 1 ? "" : "s"}` });
      if (vars.action === "delete" && r.undoable) {
        onUndoSet({ ids: [...selected], label: `Deleted ${selected.size} contact${selected.size === 1 ? "" : "s"}` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/smart-lists"] });
      setSelected(new Set());
    },
    onError: (e: any) => toast({ title: "Bulk action failed", description: e.message, variant: "destructive" }),
  });

  const allSelected = contacts.length > 0 && contacts.every(c => selected.has(c.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(contacts.map(c => c.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }} className="bv-crm-cont-grid">
      {/* Smart Lists rail */}
      <SmartListRail
        smartLists={smartLists}
        activeId={activeListId}
        onSelect={(id) => setActiveListId(id)}
        currentFilters={{ q, status, tag, scoreMin: scoreMin ? parseInt(scoreMin) : undefined, lastContactedDays: lastContactedDays ? parseInt(lastContactedDays) : undefined }}
      />

      {/* Main */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }} />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setActiveListId(null); }}
              placeholder="Search by name, email, phone, or company"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px 10px 36px", color: "#fff", fontSize: 13, outline: "none" }}
            />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setActiveListId(null); }} style={inputStyle()}>
            <option value="" style={{ background: "#0a0a0c" }}>All statuses</option>
            <option value="lead" style={{ background: "#0a0a0c" }}>Lead</option>
            <option value="prospect" style={{ background: "#0a0a0c" }}>Prospect</option>
            <option value="customer" style={{ background: "#0a0a0c" }}>Customer</option>
            <option value="inactive" style={{ background: "#0a0a0c" }}>Inactive</option>
          </select>
          <select value={tag} onChange={e => { setTag(e.target.value); setActiveListId(null); }} style={inputStyle()}>
            <option value="" style={{ background: "#0a0a0c" }}>Any tag</option>
            {tags.map(t => <option key={t.id} value={t.name} style={{ background: "#0a0a0c" }}>{t.name}</option>)}
          </select>
          <button onClick={() => setShowSaveList(true)} style={tbBtn(GOLD)}><Bookmark className="w-3.5 h-3.5" /> Save view</button>
          <button onClick={onNewContact} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus className="w-3.5 h-3.5" /> New contact
          </button>
        </div>

        {/* Bulk action bar — visible when items selected */}
        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${GOLD}10`, border: `1px solid ${GOLD}55`, borderRadius: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{selected.size} selected</span>
            <span style={{ flex: 1 }} />
            <BulkStatusButton onPick={(s) => bulkMut.mutate({ action: "set-status", payload: { status: s } })} />
            <BulkTagButton tags={tags} onAdd={(name) => bulkMut.mutate({ action: "add-tag", payload: { tag: name } })} />
            <button onClick={() => bulkMut.mutate({ action: "archive" })} style={pillBtn("#71717a")}>
              <Archive className="w-3 h-3" /> Archive
            </button>
            <button onClick={() => { if (confirm(`Delete ${selected.size} contact${selected.size === 1 ? "" : "s"}? You can undo right after.`)) bulkMut.mutate({ action: "delete" }); }} style={pillBtn("#ef4444")}>
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button onClick={() => setSelected(new Set())} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", padding: "4px 6px", cursor: "pointer", fontSize: 12 }}>Clear</button>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1.5fr 1.4fr 1fr 0.8fr 1fr 0.8fr", gap: 0, padding: "12px 16px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", alignItems: "center" }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: GOLD, cursor: "pointer" }} />
            <div>Name</div><div>Email</div><div>Phone</div><div>Status</div><div>Tags</div><div style={{ textAlign: "right" }}>Updated</div>
          </div>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading…</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: "rgba(255,255,255,0.6)" }}>No contacts in this view</div>
              <div style={{ fontSize: 12 }}>Try clearing the filters, or import a CSV.</div>
            </div>
          ) : (
            contacts.map(c => {
              const isSel = selected.has(c.id);
              return (
                <div key={c.id}
                  style={{
                    display: "grid", gridTemplateColumns: "32px 1.5fr 1.4fr 1fr 0.8fr 1fr 0.8fr",
                    gap: 0, padding: "10px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                    background: isSel ? `${GOLD}08` : "none",
                    transition: "background 0.15s",
                  }}
                >
                  <input type="checkbox" checked={isSel} onChange={() => toggleOne(c.id)} style={{ accentColor: GOLD, cursor: "pointer" }} onClick={e => e.stopPropagation()} />
                  <button onClick={() => onOpenContact(c.id)} style={rowBtn()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {initials(c)}
                      </div>
                      <div style={{ minWidth: 0, fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {fullName(c)}
                      </div>
                    </div>
                  </button>
                  <button onClick={() => onOpenContact(c.id)} style={rowBtn()}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>{c.email || "—"}</div>
                  </button>
                  <button onClick={() => onOpenContact(c.id)} style={rowBtn()}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{c.phone || "—"}</div>
                  </button>
                  <button onClick={() => onOpenContact(c.id)} style={rowBtn()}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status], textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </button>
                  <button onClick={() => onOpenContact(c.id)} style={rowBtn()}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingRight: 12, minWidth: 0 }}>
                      {(c.tags || []).slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.25)", color: GOLD, whiteSpace: "nowrap" }}>{t}</span>
                      ))}
                      {(c.tags || []).length > 3 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>+{(c.tags || []).length - 3}</span>}
                    </div>
                  </button>
                  <button onClick={() => onOpenContact(c.id)} style={{ ...rowBtn(), textAlign: "right" }}>
                    <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{timeAgo(c.updatedAt)}</div>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", padding: "0 4px" }}>
          Showing {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        </div>
      </div>

      <style>{`@media(max-width:900px){ .bv-crm-cont-grid{grid-template-columns:1fr !important;} }`}</style>

      {showSaveList && <SaveListModal
        currentFilters={{
          q: q || undefined, status: status || undefined, tag: tag || undefined,
          scoreMin: scoreMin ? parseInt(scoreMin) : undefined,
          lastContactedDays: lastContactedDays ? parseInt(lastContactedDays) : undefined,
        }}
        onClose={() => setShowSaveList(false)}
      />}
    </div>
  );
}

function rowBtn(): React.CSSProperties {
  return { background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0, color: "inherit", display: "block", width: "100%" };
}

function inputStyle(): React.CSSProperties {
  return { background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none", minWidth: 140 };
}

function pillBtn(accent: string): React.CSSProperties {
  return { background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
}

function BulkStatusButton({ onPick }: { onPick: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={pillBtn("#60a5fa")}>Set status <ChevronRight className="w-3 h-3" style={{ transform: "rotate(90deg)" }} /></button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 8, padding: 4, zIndex: 50, minWidth: 140 }}>
          {(["lead", "prospect", "customer", "inactive"] as const).map(s => (
            <button key={s} onClick={() => { onPick(s); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(212,180,97,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkTagButton({ tags, onAdd }: { tags: CrmTag[]; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={pillBtn(GOLD)}><TagIcon className="w-3 h-3" /> Tag</button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 8, padding: 8, zIndex: 50, minWidth: 220 }}>
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 6 }}>
            {tags.map(t => (
              <button key={t.id} onClick={() => { onAdd(t.name); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "5px 8px", background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(212,180,97,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ width: 6, height: 6, borderRadius: 99, background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="New tag…"
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 11, outline: "none" }} />
            <button onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(""); setOpen(false); } }}
              style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}55`, color: GOLD, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SmartListRail({ smartLists, activeId, onSelect, currentFilters }: {
  smartLists: CrmSmartList[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  currentFilters: any;
}) {
  const { toast } = useToast();
  const delMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/crm-suite/smart-lists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/smart-lists"] }),
  });

  const pinned = smartLists.filter(l => l.pinned);
  const others = smartLists.filter(l => !l.pinned);

  return (
    <aside style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 4, height: "fit-content", position: "sticky", top: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", padding: "6px 10px" }}>Smart Lists</div>
      {pinned.map(l => (
        <ListItem key={l.id} list={l} active={activeId === l.id} onSelect={() => onSelect(l.id)} onDelete={() => delMut.mutate(l.id)} />
      ))}
      {others.length > 0 && <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 10px 4px" }}>Other</div>}
      {others.map(l => (
        <ListItem key={l.id} list={l} active={activeId === l.id} onSelect={() => onSelect(l.id)} onDelete={() => delMut.mutate(l.id)} />
      ))}
      <button onClick={() => onSelect(null)} style={{ background: "none", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 6 }}>
        Clear list
      </button>
    </aside>
  );
}

function ListItem({ list, active, onSelect, onDelete }: { list: CrmSmartList; active: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div style={{ position: "relative" }} onMouseEnter={(e) => { (e.currentTarget.querySelector(".lst-del") as HTMLElement).style.opacity = "1"; }} onMouseLeave={(e) => { (e.currentTarget.querySelector(".lst-del") as HTMLElement).style.opacity = "0"; }}>
      <button
        onClick={onSelect}
        style={{
          width: "100%", textAlign: "left",
          background: active ? `${GOLD}14` : "none",
          border: "none",
          borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
          padding: "8px 12px",
          color: active ? GOLD : "rgba(255,255,255,0.7)",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          {list.pinned && <Star className="w-3 h-3" style={{ color: GOLD, flexShrink: 0 }} />}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{list.name}</span>
        </span>
        {typeof list.count === "number" && (
          <span style={{ fontSize: 10, color: active ? GOLD : "rgba(255,255,255,0.4)", flexShrink: 0 }}>{list.count}</span>
        )}
      </button>
      <button
        className="lst-del"
        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete list "${list.name}"?`)) onDelete(); }}
        style={{ position: "absolute", right: 4, top: 6, opacity: 0, transition: "opacity 0.15s", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 5px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 10 }}
      >×</button>
    </div>
  );
}

function SaveListModal({ currentFilters, onClose }: { currentFilters: any; onClose: () => void }) {
  const [name, setName] = useState("");
  const [pinned, setPinned] = useState(false);
  const { toast } = useToast();
  const saveMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/smart-lists", { name, filters: currentFilters, pinned }),
    onSuccess: () => {
      toast({ title: "Smart list saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/smart-lists"] });
      onClose();
    },
  });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, padding: 28, width: "min(420px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Save smart list</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.6 }}>
          Saves the current search + filters as a one-click view in the sidebar.
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="List name (e.g. Q4 hot leads)"
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none" }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ accentColor: GOLD }} />
          Pin to top
        </label>
        <button
          onClick={() => name.trim() && saveMut.mutate()}
          disabled={!name.trim() || saveMut.isPending}
          style={{
            marginTop: 16, width: "100%",
            background: name.trim() ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.04)",
            color: name.trim() ? "#000" : "rgba(255,255,255,0.3)",
            border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 800, fontSize: 14,
            cursor: name.trim() ? "pointer" : "not-allowed",
          }}
        >
          Save list
        </button>
      </div>
    </div>
  );
}

function CreateContactModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("lead");

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/contacts", {
      firstName: firstName || null, lastName: lastName || null,
      email: email || null, phone: phone || null, company: company || null,
      status, source: "manual",
    }),
    onSuccess: () => {
      toast({ title: "Contact created" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      onClose();
    },
  });

  const valid = (firstName || lastName || email || phone || "").trim().length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, padding: 28, width: "min(520px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>New contact</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field value={firstName} onChange={setFirstName} placeholder="First name" />
          <Field value={lastName} onChange={setLastName} placeholder="Last name" />
          <Field value={email} onChange={setEmail} placeholder="Email" type="email" />
          <Field value={phone} onChange={setPhone} placeholder="Phone" />
          <Field value={company} onChange={setCompany} placeholder="Company" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, cursor: "pointer", outline: "none", appearance: "none" }}>
            <option value="lead" style={{ background: "#0a0a0c" }}>Lead</option>
            <option value="prospect" style={{ background: "#0a0a0c" }}>Prospect</option>
            <option value="customer" style={{ background: "#0a0a0c" }}>Customer</option>
            <option value="inactive" style={{ background: "#0a0a0c" }}>Inactive</option>
          </select>
        </div>
        <button onClick={() => valid && createMut.mutate()} disabled={!valid || createMut.isPending}
          style={{ marginTop: 16, width: "100%", background: valid ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.04)", color: valid ? "#000" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: valid ? "pointer" : "not-allowed" }}>
          Create contact
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   TASKS TAB
═════════════════════════════════════════════════════════ */
function TasksTab({ onOpenContact, onNewTask }: { onOpenContact: (id: string) => void; onNewTask: () => void }) {
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const { data: tasks = [], isLoading } = useQuery<CrmTask[]>({
    queryKey: ["/api/crm-suite/tasks", filter],
    queryFn: () => apiRequest("GET", `/api/crm-suite/tasks${filter === "all" ? "" : `?status=${filter}`}`),
  });
  const { data: contacts = [] } = useQuery<CrmContact[]>({ queryKey: ["/api/crm-suite/contacts"] });
  const contactById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "done" }) =>
      apiRequest("PATCH", `/api/crm-suite/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["open", "done", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                background: filter === f ? `${GOLD}22` : "rgba(255,255,255,0.03)",
                color: filter === f ? GOLD : "rgba(255,255,255,0.6)",
                border: `1px solid ${filter === f ? GOLD + "55" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
              }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={onNewTask}
          style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus className="w-3.5 h-3.5" /> New task
        </button>
      </div>
      {isLoading ? <Loading /> : tasks.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>No tasks here.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.map(t => {
            const c = t.contactId ? contactById.get(t.contactId) : null;
            const overdue = t.dueAt && t.status === "open" && new Date(t.dueAt) < new Date();
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10 }}>
                <input type="checkbox" checked={t.status === "done"} onChange={() => toggleMut.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })} style={{ width: 16, height: 16, accentColor: GOLD, cursor: "pointer" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.status === "done" ? "rgba(255,255,255,0.4)" : "#fff", textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                    {t.dueAt && <span style={{ color: overdue ? "#ef4444" : "rgba(255,255,255,0.5)" }}>📅 {new Date(t.dueAt).toLocaleString()}</span>}
                    {c && <button onClick={() => onOpenContact(c.id)} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", padding: 0, fontSize: 11 }}>@ {fullName(c)}</button>}
                    {t.priority !== "normal" && <span style={{ color: t.priority === "urgent" ? "#ef4444" : t.priority === "high" ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>{t.priority}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data: contacts = [] } = useQuery<CrmContact[]>({ queryKey: ["/api/crm-suite/contacts"] });
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("normal");

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/tasks", {
      title, contactId: contactId || null, dueAt: dueAt || null, priority,
    }),
    onSuccess: () => {
      toast({ title: "Task created" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      onClose();
    },
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, padding: 28, width: "min(480px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>New task</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field value={title} onChange={setTitle} placeholder="What needs to be done?" />
          <select value={contactId} onChange={e => setContactId(e.target.value)}
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, cursor: "pointer", outline: "none", appearance: "none" }}>
            <option value="" style={{ background: "#0a0a0c" }}>Link a contact (optional)</option>
            {contacts.slice(0, 200).map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a0c" }}>{fullName(c)}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field value={dueAt} onChange={setDueAt} placeholder="Due" type="datetime-local" />
            <select value={priority} onChange={e => setPriority(e.target.value)}
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, cursor: "pointer", outline: "none", appearance: "none" }}>
              <option value="low" style={{ background: "#0a0a0c" }}>Low</option>
              <option value="normal" style={{ background: "#0a0a0c" }}>Normal</option>
              <option value="high" style={{ background: "#0a0a0c" }}>High</option>
              <option value="urgent" style={{ background: "#0a0a0c" }}>Urgent</option>
            </select>
          </div>
          <button onClick={() => title.trim() && createMut.mutate()} disabled={!title.trim() || createMut.isPending}
            style={{ background: title.trim() ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.04)", color: title.trim() ? "#000" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: title.trim() ? "pointer" : "not-allowed" }}>
            Create task
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   SETTINGS TAB
═════════════════════════════════════════════════════════ */
function SettingsTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: pipelines = [] } = useQuery<CrmPipeline[]>({ queryKey: ["/api/crm-suite/pipelines"] });
  const { data: tags = [] } = useQuery<CrmTag[]>({ queryKey: ["/api/crm-suite/tags"] });
  const { toast } = useToast();
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#d4b461");
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const active = pipelines.find(p => p.id === (activePipelineId || pipelines[0]?.id)) || pipelines[0];
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#60a5fa");

  const addStageMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/crm-suite/pipelines/${active!.id}/stages`, {
      name: newStageName, color: newStageColor, position: active!.stages.length,
    }),
    onSuccess: () => { setNewStageName(""); queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/pipelines"] }); },
  });
  const delStageMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/crm-suite/stages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/pipelines"] }),
    onError: (e: any) => toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });
  const addTagMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/tags", { name: newTagName, color: newTagColor }),
    onSuccess: () => { setNewTagName(""); queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tags"] }); },
  });
  const delTagMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/crm-suite/tags/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tags"] }),
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="bv-crm-set-grid">
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>Pipeline stages</div>
          {pipelines.length > 1 && (
            <select value={active?.id} onChange={e => setActivePipelineId(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 11, outline: "none" }}>
              {pipelines.map(p => <option key={p.id} value={p.id} style={{ background: "#0a0a0c" }}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {active?.stages.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: s.color }} />
              <span style={{ flex: 1, fontSize: 13, color: "#fff", fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{s.probability}%</span>
              {s.isWon && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>WON</span>}
              {s.isLost && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>LOST</span>}
              <button onClick={() => delStageMut.mutate(s.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="New stage name…"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
          <input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)} style={{ width: 36, height: 36, padding: 2, background: "rgba(0,0,0,0.4)", border: `1px solid ${GOLD}22`, borderRadius: 8, cursor: "pointer" }} />
          <button onClick={() => newStageName.trim() && addStageMut.mutate()}
            style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}55`, color: GOLD, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Tags</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {tags.map(t => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${t.color}22`, border: `1px solid ${t.color}55`, color: t.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>
              <TagIcon className="w-3 h-3" />{t.name}
              <button onClick={() => delTagMut.mutate(t.id)} style={{ background: "none", border: "none", color: t.color, cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="New tag name…"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
          <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} style={{ width: 36, height: 36, padding: 2, background: "rgba(0,0,0,0.4)", border: `1px solid ${GOLD}22`, borderRadius: 8, cursor: "pointer" }} />
          <button onClick={() => newTagName.trim() && addTagMut.mutate()}
            style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}55`, color: GOLD, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>
      </div>

      <style>{`@media(max-width:900px){ .bv-crm-set-grid{grid-template-columns:1fr !important;} }`}</style>
      {isAdmin && <ApiKeysPanel />}
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading…</div>;
}

function Field({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
  );
}
