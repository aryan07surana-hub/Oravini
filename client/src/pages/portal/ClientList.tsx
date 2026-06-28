import PortalLayout from "./Layout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Plus, Trash2, Instagram, ChevronDown, ChevronUp,
  FolderKanban, Crown, ExternalLink, Search, X, Edit2, Check
} from "lucide-react";

const GOLD = "#d4b461";
const LS_KEY = "portal_clients_v2";

type ProjectStatus = "not-started" | "in-progress" | "completed";

interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string;
}

interface Client {
  id: string;
  name: string;
  instagramUrl: string;
  tier: number;
  notes: string;
  projects: Project[];
  createdAt: string;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadClients(): Client[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveClients(clients: Client[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(clients));
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  "not-started": "bg-zinc-700 text-zinc-300",
  "in-progress": "bg-blue-900/60 text-blue-300",
  "completed": "bg-green-900/60 text-green-300",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "completed": "Completed",
};

const TIER_COLORS: Record<number, string> = {
  1: "bg-zinc-700 text-zinc-200",
  2: "bg-blue-900/60 text-blue-200",
  3: "bg-purple-900/60 text-purple-200",
  4: "bg-orange-900/60 text-orange-200",
  5: "text-black font-bold",
};

function ProjectRow({
  project,
  onDelete,
  onUpdate,
}: {
  project: Project;
  onDelete: () => void;
  onUpdate: (p: Partial<Project>) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border group">
      <div className="flex-1 min-w-0">
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate({ name: nameVal });
                  setEditingName(false);
                }
                if (e.key === "Escape") {
                  setNameVal(project.name);
                  setEditingName(false);
                }
              }}
            />
            <button
              onClick={() => {
                onUpdate({ name: nameVal });
                setEditingName(false);
              }}
              className="text-green-400 hover:text-green-300"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            className="text-sm font-medium text-foreground text-left hover:opacity-70 transition-opacity"
            onClick={() => setEditingName(true)}
          >
            {project.name}
          </button>
        )}
        <Textarea
          value={project.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Notes..."
          className="mt-2 text-xs resize-none min-h-[40px] border-0 bg-transparent px-0 text-muted-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0"
          rows={2}
        />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Select
          value={project.status}
          onValueChange={(v) => onUpdate({ status: v as ProjectStatus })}
        >
          <SelectTrigger className="h-7 text-xs w-32 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not-started">Not Started</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ClientCard({
  client,
  onDelete,
  onUpdate,
}: {
  client: Client;
  onDelete: () => void;
  onUpdate: (c: Partial<Client>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const isT5 = client.tier === 5;

  function addProject() {
    if (!newProjectName.trim()) return;
    const p: Project = {
      id: uid(),
      name: newProjectName.trim(),
      status: "not-started",
      notes: "",
    };
    onUpdate({ projects: [...client.projects, p] });
    setNewProjectName("");
  }

  function updateProject(projectId: string, patch: Partial<Project>) {
    onUpdate({
      projects: client.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch } : p
      ),
    });
  }

  function deleteProject(projectId: string) {
    onUpdate({ projects: client.projects.filter((p) => p.id !== projectId) });
  }

  const doneCount = client.projects.filter((p) => p.status === "completed").length;

  return (
    <div
      className={`rounded-xl border bg-card transition-all ${
        isT5 ? "border-amber-700/50" : "border-border"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{client.name}</span>
              <Badge
                className={`text-[10px] px-2 py-0 ${TIER_COLORS[client.tier] || TIER_COLORS[1]}`}
                style={isT5 ? { background: GOLD } : {}}
              >
                {isT5 && <Crown className="w-2.5 h-2.5 mr-1" />}
                Tier {client.tier}
              </Badge>
            </div>
            {client.instagramUrl && (
              <a
                href={client.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 transition-colors"
              >
                <Instagram className="w-3 h-3" />
                {client.instagramUrl.replace("https://", "").replace("http://", "")}
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}
            {client.notes && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{client.notes}</p>
            )}
            {client.projects.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {doneCount}/{client.projects.length} projects done
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <FolderKanban className="w-3 h-3" /> Projects
          </p>
          {client.projects.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No projects yet. Add one below.</p>
          )}
          {client.projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onDelete={() => deleteProject(p.id)}
              onUpdate={(patch) => updateProject(p.id, patch)}
            />
          ))}
          <div className="flex gap-2 mt-2">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addProject()}
            />
            <Button size="sm" onClick={addProject} className="h-8 px-3">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientList() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>(loadClients);
  const [tab, setTab] = useState<"all" | "tier5">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    name: "",
    instagramUrl: "",
    tier: "1",
    notes: "",
  });

  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  function addClient() {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const c: Client = {
      id: uid(),
      name: form.name.trim(),
      instagramUrl: form.instagramUrl.trim(),
      tier: parseInt(form.tier),
      notes: form.notes.trim(),
      projects: [],
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [c, ...prev]);
    setForm({ name: "", instagramUrl: "", tier: "1", notes: "" });
    setShowAdd(false);
    toast({ title: "Client added" });
  }

  function deleteClient(id: string) {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  function updateClient(id: string, patch: Partial<Client>) {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  const filtered = clients
    .filter((c) => tab === "all" || c.tier === 5)
    .filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.instagramUrl.toLowerCase().includes(search.toLowerCase())
    );

  const tier5Count = clients.filter((c) => c.tier === 5).length;

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: GOLD }} />
              Client List
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{clients.length} clients</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Client
          </Button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-1.5 transition-colors font-medium ${
                tab === "all"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === "all" ? { background: GOLD, color: "#0a0910" } : {}}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setTab("tier5")}
              className={`px-4 py-1.5 transition-colors font-medium flex items-center gap-1.5 ${
                tab === "tier5"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === "tier5" ? { background: GOLD, color: "#0a0910" } : {}}
            >
              <Crown className="w-3.5 h-3.5" /> Tier 5 ({tier5Count})
            </button>
          </div>
          <div className="flex-1 relative min-w-[180px]">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tier 5 banner */}
        {tab === "tier5" && (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}40` }}
          >
            <Crown className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: GOLD }}>
                Tier 5 Clients
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your highest-tier clients. Click any card to manage their projects.
              </p>
            </div>
          </div>
        )}

        {/* Client list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search
                ? "No clients match your search"
                : tab === "tier5"
                ? "No Tier 5 clients yet"
                : "No clients yet. Add your first one."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onDelete={() => deleteClient(c.id)}
                onUpdate={(patch) => updateClient(c.id, patch)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Client Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name or handle"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Instagram URL</Label>
              <div className="relative">
                <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.instagramUrl}
                  onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                  placeholder="https://instagram.com/username"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tier</Label>
              <Select
                value={form.tier}
                onValueChange={(v) => setForm((f) => ({ ...f, tier: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1</SelectItem>
                  <SelectItem value="2">Tier 2</SelectItem>
                  <SelectItem value="3">Tier 3</SelectItem>
                  <SelectItem value="4">Tier 4</SelectItem>
                  <SelectItem value="5">Tier 5 (Elite)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes about this client..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={addClient}>
                Add Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
