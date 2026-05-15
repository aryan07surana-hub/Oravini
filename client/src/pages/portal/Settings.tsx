import PortalLayout from "./Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Crown, Star, Users, Plus, Pencil, Trash2, Shield, Search } from "lucide-react";

const GOLD = "#d4b461";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  elite: { label: "Elite (Tier 5)", color: GOLD, bg: `${GOLD}18`, icon: Crown },
  enterprise: { label: "Enterprise", color: "#c084fc", bg: "rgba(192,132,252,0.12)", icon: Star },
  pro: { label: "Pro", color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: Shield },
  growth: { label: "Growth", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: Users },
  starter: { label: "Starter", color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: Users },
  free: { label: "Free", color: "#4b5563", bg: "rgba(75,85,99,0.12)", icon: Users },
};

export default function PortalSettings() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState("elite");
  const [newPassword, setNewPassword] = useState("");
  const [editPlan, setEditPlan] = useState("elite");

  const { data: clients = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const addClient = useMutation({
    mutationFn: () => apiRequest("POST", "/api/clients", { email: newEmail, name: newName, plan: newPlan, password: newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client added" });
      setAddOpen(false);
      setNewEmail(""); setNewName(""); setNewPlan("elite"); setNewPassword("");
    },
    onError: (e: any) => toast({ title: "Failed to add client", description: e.message, variant: "destructive" }),
  });

  const updateTier = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) => apiRequest("PATCH", `/api/clients/${id}`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Tier updated" });
      setEditOpen(false);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client removed" });
    },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || c.plan === filterTier;
    return matchSearch && matchTier;
  });

  const tierCounts: Record<string, number> = {};
  clients.forEach((c) => { tierCounts[c.plan || "free"] = (tierCounts[c.plan || "free"] || 0) + 1; });

  return (
    <PortalLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6" style={{ color: GOLD }} />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage client tiers and access</p>
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>

        {/* Tier overview */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {Object.entries(TIER_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = tierCounts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => setFilterTier(filterTier === key ? "all" : key)}
                className={`rounded-xl border p-3 text-center transition-all ${filterTier === key ? "border-current" : "border-border"}`}
                style={filterTier === key ? { borderColor: config.color, background: config.bg } : {}}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: config.color }} />
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[9px] text-muted-foreground truncate">{config.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="outline" className="text-xs">{filtered.length} clients</Badge>
        </div>

        {/* Client table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No clients found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tier</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const tier = TIER_CONFIG[client.plan || "free"] || TIER_CONFIG.free;
                  const TierIcon = tier.icon;
                  return (
                    <tr key={client.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${GOLD}18`, color: GOLD }}>
                            {client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="text-[10px] gap-1 flex items-center w-fit" style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}33` }}>
                          <TierIcon className="w-2.5 h-2.5" /> {tier.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="outline" className={`text-[10px] ${client.planConfirmed ? "text-green-400 border-green-800" : "text-muted-foreground"}`}>
                          {client.planConfirmed ? "Active" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditTarget(client); setEditPlan(client.plan || "free"); setEditOpen(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950"
                            onClick={() => deleteClient.mutate(client.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit tier dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tier — {editTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs mb-1.5 block">New Tier</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elite">Elite (Tier 5)</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              style={{ background: GOLD, color: "#0a0910" }}
              onClick={() => updateTier.mutate({ id: editTarget.id, plan: editPlan })}
              disabled={updateTier.isPending}
            >
              {updateTier.isPending ? "Updating..." : "Update Tier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add client dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs mb-1.5 block">Full Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Client name" /></div>
            <div><Label className="text-xs mb-1.5 block">Email</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="client@email.com" type="email" /></div>
            <div><Label className="text-xs mb-1.5 block">Password</Label><Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Temporary password" type="password" /></div>
            <div>
              <Label className="text-xs mb-1.5 block">Tier</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elite">Elite (Tier 5)</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              style={{ background: GOLD, color: "#0a0910" }}
              onClick={() => addClient.mutate()}
              disabled={!newEmail || !newName || !newPassword || addClient.isPending}
            >
              {addClient.isPending ? "Adding..." : "Add Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
