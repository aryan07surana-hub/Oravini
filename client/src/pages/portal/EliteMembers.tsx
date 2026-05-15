import PortalLayout from "./Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Search, Plus, Trash2, Mail, Phone, User, Star } from "lucide-react";

const GOLD = "#d4b461";

const TIER_COLORS: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-200",
  starter: "bg-blue-900 text-blue-200",
  growth: "bg-purple-900 text-purple-200",
  pro: "bg-amber-900 text-amber-200",
  elite: "text-black font-bold",
  enterprise: "text-black font-bold",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  elite: "Elite (Tier 5)",
  enterprise: "Enterprise",
};

function ClientCard({ client, onDelete }: { client: any; onDelete: (id: string) => void }) {
  const initials = client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const plan = client.plan || "free";
  const isElite = plan === "elite" || plan === "enterprise";

  return (
    <div className={`relative rounded-xl border p-5 bg-card transition-all hover:shadow-lg ${isElite ? "border-amber-700/40" : "border-border"}`}>
      {isElite && (
        <div className="absolute top-3 right-3">
          <Crown className="w-4 h-4" style={{ color: GOLD }} />
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${GOLD}22`, color: GOLD }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{client.name || "—"}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{client.email}</p>
          {client.phone && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {client.phone}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-[10px] px-2 py-0.5 ${TIER_COLORS[plan] || TIER_COLORS.free}`} style={isElite ? { background: GOLD } : {}}>
              {TIER_LABELS[plan] || plan}
            </Badge>
            {client.planConfirmed && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-green-400 border-green-800">Active</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <a href={`mailto:${client.email}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
            <Mail className="w-3 h-3" /> Email
          </Button>
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 hover:bg-red-950"
          onClick={() => onDelete(client.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function EliteMembers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState("elite");
  const [newPassword, setNewPassword] = useState("");

  const { data: clients = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const deleteClient = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client removed" });
    },
    onError: () => toast({ title: "Failed to remove client", variant: "destructive" }),
  });

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

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || c.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  const eliteCount = clients.filter((c) => c.plan === "elite" || c.plan === "enterprise").length;

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Crown className="w-6 h-6" style={{ color: GOLD }} />
              Elite Members
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{eliteCount} elite / {clients.length} total clients</p>
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="elite">Elite (Tier 5)</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="free">Free</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No clients found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client) => (
              <ClientCard key={client.id} client={client} onDelete={(id) => deleteClient.mutate(id)} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: GOLD }} /> Add New Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs mb-1.5 block">Full Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="client@email.com" type="email" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Password</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Temporary password" type="password" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Tier</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
