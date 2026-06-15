import { useState, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Phone, Users, Send, Zap, Hash, BarChart2, Plus, Trash2,
  Edit2, Check, X, PlayCircle, PauseCircle, Clock, RefreshCw, Megaphone,
  Bot, ShieldCheck, Reply, ChevronDown, ChevronRight, Inbox, Settings,
  Upload, Search, Tag, AlertTriangle, TrendingUp, MessageCircle, Smartphone,
} from "lucide-react";

const GOLD = "#d4b461";
const TABS = [
  { id: "numbers",    label: "Phone Numbers", icon: Phone },
  { id: "contacts",   label: "Contacts",      icon: Users },
  { id: "campaigns",  label: "Campaigns",     icon: Megaphone },
  { id: "automations",label: "Automations",   icon: Zap },
  { id: "keywords",   label: "Keywords",      icon: Hash },
  { id: "inbox",      label: "Inbox",         icon: Inbox },
  { id: "analytics",  label: "Analytics",     icon: BarChart2 },
  { id: "ai",         label: "AI Tools",      icon: Bot },
] as const;
type Tab = (typeof TABS)[number]["id"];

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: GOLD }} />
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Phone Numbers Tab ─────────────────────────────────────────────────────────
function PhoneNumbersTab() {
  const { toast } = useToast();
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { data: ownedNumbers = [], refetch: refetchNumbers } = useQuery<any[]>({
    queryKey: ["/api/sms/numbers"],
  });

  async function searchNumbers() {
    if (!areaCode.match(/^\d{3}$/)) {
      toast({ title: "Enter a valid 3-digit area code", variant: "destructive" });
      return;
    }
    setSearching(true);
    try {
      const r = await apiRequest("GET", `/api/sms/numbers/search?areaCode=${areaCode}`);
      const data = await r.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  const provisionMut = useMutation({
    mutationFn: (phoneNumber: string) => apiRequest("POST", "/api/sms/numbers/provision", { phoneNumber }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Number provisioned!", description: "Your new number is ready to use." });
      setSearchResults([]);
      setAreaCode("");
      refetchNumbers();
    },
    onError: (e: any) => toast({ title: "Failed to provision", description: e.message, variant: "destructive" }),
  });

  const releaseMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sms/numbers/${id}`).then(r => r.json()),
    onSuccess: () => { toast({ title: "Number released" }); refetchNumbers(); },
    onError: () => toast({ title: "Release failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="border border-zinc-800">
        <CardHeader><CardTitle className="text-base text-white flex items-center gap-2"><Search className="w-4 h-4" style={{ color: GOLD }} />Find a Phone Number</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">Pick an area code to search available local numbers. Each number costs ~$1/month.</p>
          <div className="flex gap-3">
            <Input
              placeholder="Area code (e.g. 415)"
              value={areaCode}
              onChange={e => setAreaCode(e.target.value)}
              maxLength={3}
              className="w-40 bg-zinc-900 border-zinc-700 text-white"
            />
            <Button onClick={searchNumbers} disabled={searching} style={{ background: GOLD, color: "#000" }}>
              {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {searchResults.map(n => (
                <div key={n.phoneNumber} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div>
                    <p className="text-white font-mono font-medium">{n.phoneNumber}</p>
                    <p className="text-xs text-zinc-500">{n.locality && `${n.locality}, `}{n.region} · ${n.monthlyCost}/mo</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => provisionMut.mutate(n.phoneNumber)}
                    disabled={provisionMut.isPending}
                    style={{ background: GOLD, color: "#000" }}
                  >
                    {provisionMut.isPending ? "Buying..." : "Buy Number"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-zinc-800">
        <CardHeader><CardTitle className="text-base text-white flex items-center gap-2"><Smartphone className="w-4 h-4" style={{ color: GOLD }} />Your Phone Numbers ({ownedNumbers.length})</CardTitle></CardHeader>
        <CardContent>
          {ownedNumbers.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No numbers yet. Search and buy one above.</p>
          ) : (
            <div className="space-y-2">
              {ownedNumbers.map((n: any) => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div>
                    <p className="text-white font-mono font-medium">{n.phone_number}</p>
                    <p className="text-xs text-zinc-500">{n.friendly_name} · {n.country_code} · ${n.monthly_cost}/mo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => releaseMut.mutate(n.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Contacts Tab ──────────────────────────────────────────────────────────────
function ContactsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newContact, setNewContact] = useState({ phone: "", firstName: "", lastName: "", email: "", tags: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, refetch } = useQuery<{ contacts: any[]; total: number }>({
    queryKey: ["/api/sms/contacts", search, page],
    queryFn: () => apiRequest("GET", `/api/sms/contacts?search=${encodeURIComponent(search)}&page=${page}&limit=25`).then(r => r.json()),
  });
  const contacts = data?.contacts || [];
  const total = data?.total || 0;

  const addMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sms/contacts", {
      ...newContact,
      tags: newContact.tags ? newContact.tags.split(",").map(t => t.trim()) : [],
    }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Contact added" }); setAddOpen(false); setNewContact({ phone: "", firstName: "", lastName: "", email: "", tags: "" }); refetch(); },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sms/contacts/${id}`).then(r => r.json()),
    onSuccess: () => { toast({ title: "Contact deleted" }); refetch(); },
  });

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const contacts = lines.slice(1).map(line => {
      const vals = line.split(",");
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i]?.trim().replace(/^"|"$/g, "") || ""; });
      return { phone: obj.phone || obj.phone_number || obj.mobile, firstName: obj.first_name || obj.firstname || obj.name?.split(" ")[0], lastName: obj.last_name || obj.lastname || obj.name?.split(" ")[1], email: obj.email };
    }).filter(c => c.phone);

    const r = await apiRequest("POST", "/api/sms/contacts/import", { contacts }).then(res => res.json());
    toast({ title: `Imported ${r.imported} contacts`, description: r.skipped ? `${r.skipped} skipped` : undefined });
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="bg-zinc-900 border-zinc-700 text-white max-w-xs"
        />
        <Button onClick={() => setAddOpen(v => !v)} style={{ background: GOLD, color: "#000" }}>
          <Plus className="w-4 h-4 mr-1" />Add Contact
        </Button>
        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1" />Import CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
        <span className="text-zinc-500 text-sm ml-auto">{total} contacts</span>
      </div>

      {addOpen && (
        <Card className="border border-zinc-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Phone *" value={newContact.phone} onChange={e => setNewContact(v => ({ ...v, phone: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(v => ({ ...v, email: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="First name" value={newContact.firstName} onChange={e => setNewContact(v => ({ ...v, firstName: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="Last name" value={newContact.lastName} onChange={e => setNewContact(v => ({ ...v, lastName: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="Tags (comma-separated)" value={newContact.tags} onChange={e => setNewContact(v => ({ ...v, tags: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white col-span-2" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addMut.mutate()} disabled={!newContact.phone || addMut.isPending} style={{ background: GOLD, color: "#000" }}>Save</Button>
              <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-zinc-400">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-zinc-800">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-zinc-500 font-medium">Phone</th>
                <th className="text-left p-3 text-zinc-500 font-medium">Name</th>
                <th className="text-left p-3 text-zinc-500 font-medium">Status</th>
                <th className="text-left p-3 text-zinc-500 font-medium">Tags</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-zinc-500 py-12">No contacts yet. Add one or import a CSV.</td></tr>
              ) : contacts.map((c: any) => (
                <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="p-3 font-mono text-white">{c.phone}</td>
                  <td className="p-3 text-zinc-300">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-3">
                    {c.opted_in
                      ? <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Opted In</Badge>
                      : <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Opted Out</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).map((t: string) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteMut.mutate(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 25 && (
            <div className="flex items-center justify-between p-3 border-t border-zinc-800">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-zinc-400">← Prev</Button>
              <span className="text-zinc-500 text-xs">Page {page} · {total} total</span>
              <Button variant="ghost" disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="text-zinc-400">Next →</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────
function CampaignsTab() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", fromNumber: "", segment: "all", scheduledAt: "" });
  const [charCount, setCharCount] = useState(0);

  const { data: campaigns = [], refetch } = useQuery<any[]>({ queryKey: ["/api/sms/campaigns"] });
  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sms/campaigns", form).then(r => r.json()),
    onSuccess: () => { toast({ title: "Campaign created" }); setCreateOpen(false); setForm({ name: "", message: "", fromNumber: "", segment: "all", scheduledAt: "" }); refetch(); },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sms/campaigns/${id}/send`).then(r => r.json()),
    onSuccess: (data) => { toast({ title: `Sent to ${data.sent} contacts`, description: data.failed ? `${data.failed} failed` : undefined }); refetch(); },
    onError: () => toast({ title: "Send failed", variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(v => !v)} style={{ background: GOLD, color: "#000" }}>
          <Plus className="w-4 h-4 mr-1" />New Campaign
        </Button>
      </div>

      {createOpen && (
        <Card className="border border-zinc-700">
          <CardHeader><CardTitle className="text-sm text-white">New Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Campaign name *" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
            <select value={form.fromNumber} onChange={e => setForm(v => ({ ...v, fromNumber: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
              <option value="">Select sending number *</option>
              {(numbers as any[]).map((n: any) => <option key={n.id} value={n.phone_number}>{n.phone_number} ({n.friendly_name})</option>)}
            </select>
            <div className="relative">
              <Textarea
                placeholder="Message text *"
                value={form.message}
                onChange={e => { setForm(v => ({ ...v, message: e.target.value })); setCharCount(e.target.value.length); }}
                className="bg-zinc-900 border-zinc-700 text-white min-h-[100px] resize-none"
                maxLength={1600}
              />
              <span className={`absolute bottom-2 right-2 text-xs ${charCount > 160 ? "text-amber-400" : "text-zinc-600"}`}>
                {charCount}/160 {charCount > 160 ? `(${Math.ceil(charCount / 160)} segments)` : ""}
              </span>
            </div>
            <select value={form.segment} onChange={e => setForm(v => ({ ...v, segment: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
              <option value="all">All opted-in contacts</option>
              <option value="tagged">By tag</option>
            </select>
            <Input type="datetime-local" placeholder="Schedule (optional)" value={form.scheduledAt} onChange={e => setForm(v => ({ ...v, scheduledAt: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
            <div className="flex gap-2">
              <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.message || !form.fromNumber || createMut.isPending} style={{ background: GOLD, color: "#000" }}>Create</Button>
              <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-zinc-400">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <Card className="border border-zinc-800"><CardContent className="text-center text-zinc-500 py-12">No campaigns yet.</CardContent></Card>
        ) : campaigns.map((c: any) => (
          <Card key={c.id} className="border border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium truncate">{c.name}</h3>
                    <Badge className={statusColors[c.status] || statusColors.draft}>{c.status}</Badge>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{c.message}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="font-mono">{c.from_number}</span>
                    {c.status === "sent" && <>
                      <span>· {c.recipients_count} recipients</span>
                      <span>· {c.delivered_count} delivered</span>
                      {c.failed_count > 0 && <span className="text-red-400">· {c.failed_count} failed</span>}
                    </>}
                  </div>
                </div>
                {c.status === "draft" && (
                  <Button size="sm" onClick={() => sendMut.mutate(c.id)} disabled={sendMut.isPending} style={{ background: GOLD, color: "#000" }}>
                    <Send className="w-3 h-3 mr-1" />Send Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Automations Tab ───────────────────────────────────────────────────────────
function AutomationsTab() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", fromNumber: "", triggerType: "keyword", triggerValue: "" });
  const [newStep, setNewStep] = useState({ message: "", delayMinutes: 0, delayUnit: "minutes" });
  const [aiGoal, setAiGoal] = useState("");
  const [aiBuilding, setAiBuilding] = useState(false);

  const { data: automations = [], refetch } = useQuery<any[]>({ queryKey: ["/api/sms/automations"] });
  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"] });
  const { data: detail } = useQuery<any>({
    queryKey: ["/api/sms/automations", selectedId],
    queryFn: () => selectedId ? apiRequest("GET", `/api/sms/automations/${selectedId}`).then(r => r.json()) : null,
    enabled: !!selectedId,
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sms/automations", form).then(r => r.json()),
    onSuccess: (data) => { toast({ title: "Automation created" }); setCreateOpen(false); setSelectedId(data.id); refetch(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/sms/automations/${id}`, { status }).then(r => r.json()),
    onSuccess: () => { refetch(); queryClient.invalidateQueries({ queryKey: ["/api/sms/automations", selectedId] }); },
  });

  const addStepMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sms/automations/${selectedId}/steps`, newStep).then(r => r.json()),
    onSuccess: () => { toast({ title: "Step added" }); setNewStep({ message: "", delayMinutes: 0, delayUnit: "minutes" }); queryClient.invalidateQueries({ queryKey: ["/api/sms/automations", selectedId] }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const deleteStepMut = useMutation({
    mutationFn: (stepId: string) => apiRequest("DELETE", `/api/sms/automations/steps/${stepId}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sms/automations", selectedId] }),
  });

  async function buildWithAI() {
    if (!aiGoal) return;
    setAiBuilding(true);
    try {
      const r = await apiRequest("POST", "/api/sms/ai/build-automation", { goal: aiGoal, stepCount: 5 });
      const data = await r.json();
      setForm(v => ({ ...v, name: data.name || aiGoal, description: data.description || "" }));
      setCreateOpen(true);
      toast({ title: "AI built your automation!", description: "Review the details and add steps below." });
    } catch {
      toast({ title: "AI build failed", variant: "destructive" });
    } finally {
      setAiBuilding(false);
    }
  }

  const selected = automations.find((a: any) => a.id === selectedId);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(v => !v)} size="sm" style={{ background: GOLD, color: "#000" }}>
            <Plus className="w-3 h-3 mr-1" />New
          </Button>
        </div>

        {/* AI Builder */}
        <Card className="border border-zinc-800">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-zinc-400 flex items-center gap-1"><Bot className="w-3 h-3" style={{ color: GOLD }} />AI Automation Builder</p>
            <Input placeholder="Describe your goal..." value={aiGoal} onChange={e => setAiGoal(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-xs" />
            <Button size="sm" onClick={buildWithAI} disabled={!aiGoal || aiBuilding} className="w-full text-xs" style={{ background: GOLD, color: "#000" }}>
              {aiBuilding ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Build with AI"}
            </Button>
          </CardContent>
        </Card>

        {automations.map((a: any) => (
          <Card key={a.id} className={`border cursor-pointer transition-colors ${selectedId === a.id ? "border-yellow-500/40" : "border-zinc-800"}`} onClick={() => setSelectedId(a.id)}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.step_count || 0} steps · {a.enrolled_count} enrolled</p>
                </div>
                <Badge className={a.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs"}>
                  {a.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="col-span-2 space-y-4">
        {createOpen && (
          <Card className="border border-zinc-700">
            <CardHeader><CardTitle className="text-sm text-white">New Automation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Name *" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="Description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <select value={form.fromNumber} onChange={e => setForm(v => ({ ...v, fromNumber: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
                <option value="">Select sending number *</option>
                {(numbers as any[]).map((n: any) => <option key={n.id} value={n.phone_number}>{n.phone_number}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.triggerType} onChange={e => setForm(v => ({ ...v, triggerType: e.target.value }))} className="bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
                  <option value="keyword">Keyword trigger</option>
                  <option value="manual">Manual enroll</option>
                  <option value="new_contact">New contact</option>
                </select>
                <Input placeholder="Trigger value (e.g. JOIN)" value={form.triggerValue} onChange={e => setForm(v => ({ ...v, triggerValue: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.fromNumber || createMut.isPending} style={{ background: GOLD, color: "#000" }}>Create</Button>
                <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-zinc-400">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selected && detail && (
          <Card className="border border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">{detail.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="border-zinc-700 text-xs"
                    onClick={() => toggleMut.mutate({ id: detail.id, status: detail.status === "active" ? "paused" : "active" })}>
                    {detail.status === "active" ? <><PauseCircle className="w-3 h-3 mr-1" />Pause</> : <><PlayCircle className="w-3 h-3 mr-1" />Activate</>}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-zinc-500">Trigger: <span className="text-zinc-300">{detail.trigger_type} {detail.trigger_value && `— "${detail.trigger_value}"`}</span> · From: <span className="font-mono text-zinc-300">{detail.from_number}</span></div>

              {/* Steps */}
              <div className="space-y-2">
                {(detail.steps || []).map((step: any, idx: number) => (
                  <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: GOLD, color: "#000" }}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{step.message}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {idx === 0 ? "Immediately" : `After ${step.delay_minutes} ${step.delay_unit}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400 flex-shrink-0" onClick={() => deleteStepMut.mutate(step.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add step */}
              <div className="p-3 rounded-lg border border-dashed border-zinc-700 space-y-2">
                <p className="text-xs text-zinc-500">Add step</p>
                <Textarea
                  placeholder="Message text (max 160 chars)"
                  value={newStep.message}
                  onChange={e => setNewStep(v => ({ ...v, message: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white text-sm min-h-[60px] resize-none"
                  maxLength={160}
                />
                <div className="flex gap-2">
                  <Input type="number" placeholder="Delay" value={newStep.delayMinutes} onChange={e => setNewStep(v => ({ ...v, delayMinutes: parseInt(e.target.value) || 0 }))} className="bg-zinc-900 border-zinc-700 text-white w-24" min={0} />
                  <select value={newStep.delayUnit} onChange={e => setNewStep(v => ({ ...v, delayUnit: e.target.value }))} className="bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                  <Button onClick={() => addStepMut.mutate()} disabled={!newStep.message || addStepMut.isPending} size="sm" style={{ background: GOLD, color: "#000" }}>Add Step</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!selected && !createOpen && (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
            Select an automation or create one
          </div>
        )}
      </div>
    </div>
  );
}

// ── Keywords Tab ──────────────────────────────────────────────────────────────
function KeywordsTab() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ fromNumber: "", keyword: "", reply: "", action: "reply" });

  const { data: keywords = [], refetch } = useQuery<any[]>({ queryKey: ["/api/sms/keywords"] });
  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"] });

  const addMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sms/keywords", form).then(r => r.json()),
    onSuccess: () => { toast({ title: "Keyword added" }); setAddOpen(false); setForm({ fromNumber: "", keyword: "", reply: "", action: "reply" }); refetch(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiRequest("PATCH", `/api/sms/keywords/${id}`, { active }).then(r => r.json()),
    onSuccess: () => refetch(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sms/keywords/${id}`).then(r => r.json()),
    onSuccess: () => { toast({ title: "Keyword deleted" }); refetch(); },
  });

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
        <strong className="text-zinc-300">STOP, HELP, START</strong> are handled automatically by law (TCPA compliance). Add custom keywords below to trigger replies or enroll contacts in automations.
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(v => !v)} style={{ background: GOLD, color: "#000" }}>
          <Plus className="w-4 h-4 mr-1" />Add Keyword
        </Button>
      </div>

      {addOpen && (
        <Card className="border border-zinc-700">
          <CardContent className="p-4 space-y-3">
            <select value={form.fromNumber} onChange={e => setForm(v => ({ ...v, fromNumber: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
              <option value="">Select number *</option>
              {(numbers as any[]).map((n: any) => <option key={n.id} value={n.phone_number}>{n.phone_number}</option>)}
            </select>
            <Input placeholder='Keyword (e.g. "JOIN", "INFO", "PROMO")' value={form.keyword} onChange={e => setForm(v => ({ ...v, keyword: e.target.value.toUpperCase() }))} className="bg-zinc-900 border-zinc-700 text-white font-mono" />
            <Textarea placeholder="Auto-reply message" value={form.reply} onChange={e => setForm(v => ({ ...v, reply: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white text-sm min-h-[80px] resize-none" maxLength={160} />
            <select value={form.action} onChange={e => setForm(v => ({ ...v, action: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
              <option value="reply">Auto-reply only</option>
              <option value="subscribe">Subscribe to automation</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={() => addMut.mutate()} disabled={!form.fromNumber || !form.keyword || !form.reply || addMut.isPending} style={{ background: GOLD, color: "#000" }}>Save</Button>
              <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-zinc-400">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {keywords.length === 0 ? (
          <Card className="border border-zinc-800"><CardContent className="text-center text-zinc-500 py-12">No keywords yet.</CardContent></Card>
        ) : keywords.map((k: any) => (
          <Card key={k.id} className="border border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-white font-bold">{k.keyword}</span>
                    <Badge className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">{k.from_number}</Badge>
                    <Badge className={k.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs"}>
                      {k.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400">Reply: "{k.reply}"</p>
                  <p className="text-xs text-zinc-600 mt-1">{k.match_count} matches</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="text-zinc-400 text-xs" onClick={() => toggleMut.mutate({ id: k.id, active: !k.active })}>
                    {k.active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteMut.mutate(k.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────────
function InboxTab() {
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: conversations = [], refetch } = useQuery<any[]>({ queryKey: ["/api/sms/inbox"] });
  const { data: convDetail, refetch: refetchMessages } = useQuery<any>({
    queryKey: ["/api/sms/inbox", selectedConvId],
    queryFn: () => selectedConvId ? apiRequest("GET", `/api/sms/inbox/${selectedConvId}/messages`).then(r => r.json()) : null,
    enabled: !!selectedConvId,
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sms/inbox/${selectedConvId}/send`, { message: reply }).then(r => r.json()),
    onSuccess: () => { setReply(""); setAiSuggestions([]); refetchMessages(); refetch(); },
    onError: () => toast({ title: "Send failed", variant: "destructive" }),
  });

  async function getAISuggestions() {
    if (!convDetail?.messages?.length) return;
    const lastInbound = [...convDetail.messages].reverse().find((m: any) => m.direction === "inbound");
    if (!lastInbound) return;
    setLoadingAI(true);
    try {
      const r = await apiRequest("POST", "/api/sms/ai/suggest-replies", { inboundMessage: lastInbound.body });
      const data = await r.json();
      setAiSuggestions(data.replies || []);
    } catch {
      toast({ title: "AI suggestions failed", variant: "destructive" });
    } finally {
      setLoadingAI(false);
    }
  }

  const messages = convDetail?.messages || [];
  const conv = convDetail?.conversation;

  return (
    <div className="grid grid-cols-3 gap-0 border border-zinc-800 rounded-lg overflow-hidden" style={{ height: "600px" }}>
      {/* Conversation list */}
      <div className="border-r border-zinc-800 overflow-y-auto">
        <div className="p-3 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 font-medium">CONVERSATIONS</p>
        </div>
        {conversations.length === 0 ? (
          <p className="text-center text-zinc-600 text-sm p-8">No conversations yet.</p>
        ) : conversations.map((c: any) => (
          <div
            key={c.id}
            onClick={() => setSelectedConvId(c.id)}
            className={`p-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedConvId === c.id ? "bg-zinc-900" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.contact_phone}
                </p>
                <p className="text-xs text-zinc-500 font-mono">{c.contact_phone}</p>
                {c.last_message && <p className="text-xs text-zinc-600 truncate mt-0.5">{c.last_message}</p>}
              </div>
              {c.unread_count > 0 && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: GOLD, color: "#000" }}>
                  {c.unread_count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Message thread */}
      <div className="col-span-2 flex flex-col">
        {!selectedConvId ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{conv ? ([conv.first_name, conv.last_name].filter(Boolean).join(" ") || conv.contact_phone) : ""}</p>
                <p className="text-xs text-zinc-500 font-mono">{conv?.contact_phone}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-xs text-zinc-400" onClick={getAISuggestions} disabled={loadingAI}>
                <Bot className="w-3 h-3 mr-1" style={{ color: GOLD }} />
                {loadingAI ? "..." : "AI Replies"}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${m.direction === "outbound" ? "rounded-br-sm" : "rounded-bl-sm bg-zinc-800 text-white"}`}
                    style={m.direction === "outbound" ? { background: GOLD, color: "#000" } : {}}>
                    <p>{m.body}</p>
                    <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-black/50" : "text-zinc-500"}`}>{new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* AI reply suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="px-3 pb-2 flex gap-2 flex-wrap">
                {aiSuggestions.map((s: any, i: number) => (
                  <button key={i} onClick={() => setReply(s.text)} className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:border-yellow-500/40 hover:text-white transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-zinc-800 flex gap-2">
              <Textarea
                placeholder="Type a reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white text-sm resize-none min-h-[40px] max-h-[100px]"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (reply.trim()) sendMut.mutate(); } }}
              />
              <Button onClick={() => sendMut.mutate()} disabled={!reply.trim() || sendMut.isPending} style={{ background: GOLD, color: "#000" }}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/sms/analytics"] });
  const ov = data?.overview || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Contacts" value={ov.totalContacts || 0} />
        <StatCard icon={Send} label="Messages Sent" value={ov.totalMessagesSent || 0} />
        <StatCard icon={TrendingUp} label="Delivery Rate" value={`${ov.deliveryRate || 0}%`} />
        <StatCard icon={MessageCircle} label="Conversations" value={ov.totalConversations || 0} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Megaphone} label="Campaigns Sent" value={ov.totalCampaignsSent || 0} />
        <StatCard icon={Check} label="Delivered" value={ov.totalDelivered || 0} />
        <StatCard icon={X} label="Failed" value={ov.totalFailed || 0} sub="delivery failures" />
        <StatCard icon={AlertTriangle} label="Opt-Out Rate" value={`${ov.optOutRate || 0}%`} />
      </div>

      {data?.recentCampaigns?.length > 0 && (
        <Card className="border border-zinc-800">
          <CardHeader><CardTitle className="text-base text-white">Recent Campaigns</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-2 text-zinc-500 font-medium">Campaign</th>
                  <th className="text-left p-2 text-zinc-500 font-medium">Recipients</th>
                  <th className="text-left p-2 text-zinc-500 font-medium">Delivered</th>
                  <th className="text-left p-2 text-zinc-500 font-medium">Failed</th>
                  <th className="text-left p-2 text-zinc-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCampaigns.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="p-2 text-white">{c.name}</td>
                    <td className="p-2 text-zinc-400">{c.recipients_count}</td>
                    <td className="p-2 text-emerald-400">{c.delivered_count}</td>
                    <td className="p-2 text-red-400">{c.failed_count}</td>
                    <td className="p-2 text-zinc-500">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── AI Tools Tab ──────────────────────────────────────────────────────────────
function AIToolsTab() {
  const { toast } = useToast();
  const [activeAITool, setActiveAITool] = useState<"write" | "compliance" | "segment">("write");
  const [writeForm, setWriteForm] = useState({ goal: "", tone: "friendly", audience: "", cta: "" });
  const [writeResult, setWriteResult] = useState<any>(null);
  const [writeLoading, setWriteLoading] = useState(false);
  const [compMsg, setCompMsg] = useState("");
  const [compResult, setCompResult] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [segDesc, setSegDesc] = useState("");
  const [segResult, setSegResult] = useState<any>(null);
  const [segLoading, setSegLoading] = useState(false);

  async function runWrite() {
    if (!writeForm.goal) return;
    setWriteLoading(true);
    try {
      const r = await apiRequest("POST", "/api/sms/ai/write", writeForm);
      setWriteResult(await r.json());
    } catch { toast({ title: "AI write failed", variant: "destructive" }); }
    finally { setWriteLoading(false); }
  }

  async function runCompliance() {
    if (!compMsg) return;
    setCompLoading(true);
    try {
      const r = await apiRequest("POST", "/api/sms/ai/compliance-check", { message: compMsg });
      setCompResult(await r.json());
    } catch { toast({ title: "Compliance check failed", variant: "destructive" }); }
    finally { setCompLoading(false); }
  }

  async function runSegment() {
    if (!segDesc) return;
    setSegLoading(true);
    try {
      const r = await apiRequest("POST", "/api/sms/ai/build-segment", { description: segDesc });
      setSegResult(await r.json());
    } catch { toast({ title: "Segment build failed", variant: "destructive" }); }
    finally { setSegLoading(false); }
  }

  const aiTools = [
    { id: "write",      label: "AI Copywriter",      icon: Edit2, desc: "Generate SMS copy from a goal" },
    { id: "compliance", label: "Compliance Check",   icon: ShieldCheck, desc: "Check message for TCPA issues" },
    { id: "segment",    label: "Segment Builder",    icon: Tag, desc: "Natural language → contact filter" },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="space-y-2">
        {aiTools.map(t => (
          <button key={t.id} onClick={() => setActiveAITool(t.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${activeAITool === t.id ? "border-yellow-500/40 bg-zinc-900" : "border-zinc-800 hover:border-zinc-700"}`}>
            <div className="flex items-center gap-2 mb-1">
              <t.icon className="w-4 h-4" style={{ color: GOLD }} />
              <span className="text-white text-sm font-medium">{t.label}</span>
            </div>
            <p className="text-xs text-zinc-500">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="col-span-3">
        {activeAITool === "write" && (
          <Card className="border border-zinc-800">
            <CardHeader><CardTitle className="text-base text-white flex items-center gap-2"><Bot className="w-4 h-4" style={{ color: GOLD }} />AI SMS Copywriter</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Goal (e.g. Promote 20% off sale this weekend)" value={writeForm.goal} onChange={e => setWriteForm(v => ({ ...v, goal: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              <div className="grid grid-cols-3 gap-2">
                <select value={writeForm.tone} onChange={e => setWriteForm(v => ({ ...v, tone: e.target.value }))} className="bg-zinc-900 border border-zinc-700 text-white rounded-md p-2 text-sm">
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
                <Input placeholder="Audience (e.g. VIP members)" value={writeForm.audience} onChange={e => setWriteForm(v => ({ ...v, audience: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
                <Input placeholder="CTA (e.g. Shop now)" value={writeForm.cta} onChange={e => setWriteForm(v => ({ ...v, cta: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white" />
              </div>
              <Button onClick={runWrite} disabled={!writeForm.goal || writeLoading} style={{ background: GOLD, color: "#000" }}>
                {writeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate SMS"}
              </Button>
              {writeResult && (
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-2">
                  <p className="text-white">{writeResult.message}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>{writeResult.charCount} chars</span>
                    <span>{writeResult.segments} SMS segment{writeResult.segments !== 1 ? "s" : ""}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs text-zinc-400" onClick={() => { navigator.clipboard.writeText(writeResult.message); toast({ title: "Copied!" }); }}>
                    Copy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeAITool === "compliance" && (
          <Card className="border border-zinc-800">
            <CardHeader><CardTitle className="text-base text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: GOLD }} />TCPA Compliance Check</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Paste your SMS message to check..." value={compMsg} onChange={e => setCompMsg(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-sm min-h-[100px] resize-none" />
              <Button onClick={runCompliance} disabled={!compMsg || compLoading} style={{ background: GOLD, color: "#000" }}>
                {compLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Check Compliance"}
              </Button>
              {compResult && (
                <div className={`p-4 rounded-lg border ${compResult.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {compResult.passed ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span className={`font-medium ${compResult.passed ? "text-emerald-400" : "text-red-400"}`}>
                      {compResult.passed ? "Looks compliant" : "Issues found"} · Risk: {compResult.riskLevel}
                    </span>
                  </div>
                  {compResult.issues?.length > 0 && (
                    <ul className="text-sm text-red-300 space-y-1 mb-2">
                      {compResult.issues.map((issue: string, i: number) => <li key={i}>• {issue}</li>)}
                    </ul>
                  )}
                  {compResult.suggestions?.length > 0 && (
                    <ul className="text-sm text-zinc-400 space-y-1">
                      {compResult.suggestions.map((s: string, i: number) => <li key={i}>→ {s}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeAITool === "segment" && (
          <Card className="border border-zinc-800">
            <CardHeader><CardTitle className="text-base text-white flex items-center gap-2"><Tag className="w-4 h-4" style={{ color: GOLD }} />AI Segment Builder</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder='Describe segment (e.g. "VIP customers who joined last month")' value={segDesc} onChange={e => setSegDesc(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              <Button onClick={runSegment} disabled={!segDesc || segLoading} style={{ background: GOLD, color: "#000" }}>
                {segLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Build Segment"}
              </Button>
              {segResult && (
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-2">
                  <p className="text-white font-medium">{segResult.label}</p>
                  <p className="text-sm text-zinc-400">{segResult.estimatedDescription}</p>
                  <div className="text-xs text-zinc-500">
                    <p>Tags: {segResult.filters?.tags?.join(", ") || "any"}</p>
                    <p>Opted in: {segResult.filters?.optedIn ? "yes" : "all"}</p>
                    {segResult.filters?.source && <p>Source: {segResult.filters.source}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminSmsMarketing() {
  const [activeTab, setActiveTab] = useState<Tab>("numbers");
  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"] });
  const hasNumber = (numbers as any[]).length > 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6" style={{ color: GOLD }} />
              SMS Marketing
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {hasNumber ? `${(numbers as any[]).length} active number${(numbers as any[]).length !== 1 ? "s" : ""}` : "Get started by provisioning a phone number"}
            </p>
          </div>
          {!hasNumber && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              No phone number — start in the Phone Numbers tab
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === t.id ? "border-yellow-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "numbers"     && <PhoneNumbersTab />}
        {activeTab === "contacts"    && <ContactsTab />}
        {activeTab === "campaigns"   && <CampaignsTab />}
        {activeTab === "automations" && <AutomationsTab />}
        {activeTab === "keywords"    && <KeywordsTab />}
        {activeTab === "inbox"       && <InboxTab />}
        {activeTab === "analytics"   && <AnalyticsTab />}
        {activeTab === "ai"          && <AIToolsTab />}
      </div>
    </AdminLayout>
  );
}
