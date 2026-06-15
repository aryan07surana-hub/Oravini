import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Phone, Users, Send, Zap, Hash, BarChart2, Plus, Trash2,
  Check, X, PlayCircle, PauseCircle, RefreshCw, Megaphone,
  Bot, ShieldCheck, Tag, AlertTriangle, TrendingUp, MessageCircle, Smartphone,
  Inbox, Search, Upload, ChevronRight, LayoutDashboard, Loader2, Lock,
  ChevronDown, ChevronUp, Info, Sparkles, HelpCircle, ArrowRight,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ message: r.statusText }));
    throw new Error(err.message || r.statusText);
  }
  return r.json();
}

function hasSmsAccess(plan: string | undefined | null): boolean {
  return ["starter", "growth", "pro", "elite"].includes(plan || "");
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview",    label: "Overview",      icon: LayoutDashboard },
  { id: "numbers",     label: "Phone Numbers", icon: Smartphone },
  { id: "contacts",    label: "Contacts",      icon: Users },
  { id: "campaigns",   label: "Campaigns",     icon: Megaphone },
  { id: "automations", label: "Automations",   icon: Zap },
  { id: "keywords",    label: "Keywords",      icon: Hash },
  { id: "inbox",       label: "Inbox",         icon: Inbox },
  { id: "analytics",   label: "Analytics",     icon: BarChart2 },
  { id: "ai",          label: "AI Tools",      icon: Bot },
] as const;
type NavId = (typeof NAV)[number]["id"];

// ── Guide box (collapsible inline help) ──────────────────────────────────────

function GuideBox({ title, steps, tip }: { title: string; steps: string[]; tip?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden" style={{ background: "#0a0a0c" }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" style={{ color: GOLD }} />
          <span className="text-sm font-medium text-zinc-300">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
          <ol className="space-y-2 mt-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5" style={{ background: `${GOLD}20`, color: GOLD }}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {tip && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg mt-2" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
              <p className="text-xs text-zinc-400">{tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hard gate (shown when no number on any locked tab) ───────────────────────

function NumberGate({ onGo }: { onGo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-5 px-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
        <Phone className="w-8 h-8" style={{ color: GOLD }} />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-black text-white">Get your phone number first</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Every SMS feature — campaigns, automations, inbox, keywords — needs a dedicated phone number to send from. It takes 30 seconds to provision one.
        </p>
      </div>
      <div className="space-y-2 text-left max-w-xs w-full">
        {[
          "Search any US area code",
          "Pick a number you like",
          "Click Buy — it's instantly yours",
          "Everything unlocks immediately",
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm text-zinc-400">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}20` }}>
              <span className="text-xs font-black" style={{ color: GOLD }}>{i + 1}</span>
            </div>
            {s}
          </div>
        ))}
      </div>
      <button onClick={onGo} className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
        <Smartphone className="w-4 h-4" />Get My Phone Number <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Setup wizard (shown on overview for new users) ────────────────────────────

const WIZARD_KEY = "sms_wizard_v1";

function SetupWizard({ hasNumber, contactCount, keywordCount, campaignCount, onNavigate }: {
  hasNumber: boolean; contactCount: number; keywordCount: number; campaignCount: number; onNavigate: (id: NavId) => void;
}) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(WIZARD_KEY) === "done");

  const steps = [
    { label: "Get a phone number", desc: "Your dedicated SMS sender identity", done: hasNumber, tab: "numbers" as NavId, icon: Smartphone },
    { label: "Add contacts", desc: "Import a CSV or add people manually", done: contactCount > 0, tab: "contacts" as NavId, icon: Users },
    { label: "Set up a keyword", desc: "Let people text JOIN to subscribe", done: keywordCount > 0, tab: "keywords" as NavId, icon: Hash },
    { label: "Send your first campaign", desc: "Blast a message to your list", done: campaignCount > 0, tab: "campaigns" as NavId, icon: Megaphone },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  useEffect(() => {
    if (allDone) { localStorage.setItem(WIZARD_KEY, "done"); setDismissed(true); }
  }, [allDone]);

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "#080810", borderColor: `${GOLD}30` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: `${GOLD}20`, background: `${GOLD}08` }}>
        <div>
          <h3 className="text-white font-black text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            Getting Started — {doneCount}/{steps.length} complete
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Complete these steps to launch your first SMS campaign</p>
        </div>
        <button onClick={() => { setDismissed(true); localStorage.setItem(WIZARD_KEY, "done"); }} className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs">Dismiss</button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800">
        <div className="h-full transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%`, background: `linear-gradient(90deg, ${GOLD}, #b8962e)` }} />
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {steps.map((step, i) => (
          <button key={i} onClick={() => !step.done && onNavigate(step.tab)} disabled={step.done} className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${step.done ? "opacity-60 cursor-default border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 hover:border-yellow-500/30 hover:bg-zinc-900/50 cursor-pointer"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${step.done ? "bg-emerald-500/20" : ""}`} style={step.done ? {} : { background: `${GOLD}15` }}>
              {step.done ? <Check className="w-4 h-4 text-emerald-400" /> : <step.icon className="w-4 h-4" style={{ color: GOLD }} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${step.done ? "text-zinc-400 line-through" : "text-white"}`}>{step.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{step.desc}</p>
            </div>
            {!step.done && <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0 mt-1" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Loader({ state }: { state: string }) {
  return (
    <div className="flex items-center justify-center h-40 gap-2 text-zinc-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{state}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 p-4" style={{ background: "#0a0a0c" }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color || GOLD}15` }}>
          <Icon className="w-4 h-4" style={{ color: color || GOLD }} />
        </div>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Tier gate ─────────────────────────────────────────────────────────────────

function SmsTierGate({ plan }: { plan: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: BG }}>
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
          <Lock className="w-8 h-8" style={{ color: GOLD }} />
        </div>
        <h2 className="text-2xl font-black text-white">SMS Marketing</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Provision real phone numbers, send campaigns, build automations, manage two-way conversations, and use AI to grow via text — available on Starter plan and above.
        </p>
        <p className="text-sm text-zinc-600">Current plan: <span className="font-bold text-white capitalize">{plan || "Free"}</span></p>
        <a href="/select-plan" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
          Upgrade to unlock SMS <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewSection({ setActive, hasNumber, contactCount, keywordCount, campaignCount }: {
  setActive: (id: NavId) => void; hasNumber: boolean; contactCount: number; keywordCount: number; campaignCount: number;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["/api/sms/analytics"], queryFn: () => apiFetch("/api/sms/analytics") });
  const ov = data?.overview || {};

  return (
    <div className="space-y-5">
      <SetupWizard hasNumber={hasNumber} contactCount={contactCount} keywordCount={keywordCount} campaignCount={campaignCount} onNavigate={setActive} />

      {!hasNumber && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
          <p className="text-sm text-zinc-300">You need a phone number before you can send any SMS. <button onClick={() => setActive("numbers")} className="font-bold underline" style={{ color: GOLD }}>Get one now →</button></p>
        </div>
      )}

      {isLoading ? <Loader state="Loading stats..." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Contacts" value={ov.totalContacts?.toLocaleString() || "0"} sub="Opted-in subscribers" icon={Users} />
            <StatCard label="Messages Sent" value={ov.totalMessagesSent?.toLocaleString() || "0"} sub="All time" icon={Send} color="#3b82f6" />
            <StatCard label="Delivery Rate" value={`${ov.deliveryRate || 0}%`} sub="Avg across sends" icon={TrendingUp} color="#22c55e" />
            <StatCard label="Opt-Out Rate" value={`${ov.optOutRate || 0}%`} sub="STOP replies" icon={AlertTriangle} color="#f97316" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Campaigns Sent" value={ov.totalCampaignsSent || "0"} sub="Broadcast blasts" icon={Megaphone} color="#a855f7" />
            <StatCard label="Conversations" value={ov.totalConversations || "0"} sub="Two-way threads" icon={MessageCircle} color="#06b6d4" />
          </div>
        </>
      )}

      <div className="grid grid-cols-3 gap-3">
        {([
          { id: "campaigns" as NavId, icon: Megaphone, label: "Send a Campaign", desc: "Blast a message to your contacts" },
          { id: "automations" as NavId, icon: Zap, label: "Build Automation", desc: "Set up drip sequences with AI" },
          { id: "ai" as NavId, icon: Bot, label: "AI Copywriter", desc: "Generate compliant SMS instantly" },
        ]).map(q => (
          <button key={q.id} onClick={() => setActive(q.id)} className="p-4 rounded-2xl border border-zinc-800 text-left hover:border-zinc-700 transition-colors" style={{ background: "#0a0a0c" }}>
            <q.icon className="w-5 h-5 mb-3" style={{ color: GOLD }} />
            <p className="text-white text-sm font-bold">{q.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{q.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Phone Numbers ─────────────────────────────────────────────────────────────

function NumbersSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const { data: owned = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"], queryFn: () => apiFetch("/api/sms/numbers") });

  async function search() {
    if (!areaCode.match(/^\d{3}$/)) { toast({ title: "Enter a 3-digit area code", variant: "destructive" }); return; }
    setSearching(true);
    try { setResults(await apiFetch(`/api/sms/numbers/search?areaCode=${areaCode}`)); }
    catch { toast({ title: "Search failed — try a different area code", variant: "destructive" }); }
    finally { setSearching(false); }
  }

  const buyMut = useMutation({
    mutationFn: (phoneNumber: string) => apiFetch("/api/sms/numbers/provision", { method: "POST", body: JSON.stringify({ phoneNumber }) }),
    onSuccess: () => { toast({ title: "Number is yours!", description: "All SMS features are now unlocked." }); setResults([]); setAreaCode(""); qc.invalidateQueries({ queryKey: ["/api/sms/numbers"] }); },
    onError: (e: any) => toast({ title: "Could not provision number", description: e.message, variant: "destructive" }),
  });

  const releaseMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sms/numbers/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Number released" }); qc.invalidateQueries({ queryKey: ["/api/sms/numbers"] }); },
  });

  if (isLoading) return <Loader state="Loading numbers..." />;

  return (
    <div className="space-y-5">
      <GuideBox
        title="How phone numbers work"
        steps={[
          "Enter any US area code (3 digits, e.g. 310 for LA, 212 for NYC, 415 for SF)",
          "Pick a number from the search results — each one is ~$1/month",
          "Click Buy — your number is provisioned instantly from Twilio",
          "All your campaigns, automations, inbox and keywords flow through this number",
          "You can buy multiple numbers for different purposes (e.g. one for promos, one for support)",
        ]}
        tip="Choose an area code that matches your audience's region — local numbers get higher open rates than toll-free."
      />

      <div className="rounded-2xl border border-zinc-800 p-5 space-y-4" style={{ background: "#0a0a0c" }}>
        <div>
          <h3 className="text-white font-bold mb-1">Search Available Numbers</h3>
          <p className="text-sm text-zinc-500">Enter a 3-digit US area code to see available numbers.</p>
        </div>
        <div className="flex gap-3">
          <input
            placeholder="e.g. 310, 212, 415"
            value={areaCode}
            onChange={e => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onKeyDown={e => e.key === "Enter" && search()}
            className="flex-1 max-w-[160px] px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50"
          />
          <button onClick={search} disabled={searching || areaCode.length !== 3} className="px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" />Search</>}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            <p className="text-xs text-zinc-500">{results.length} numbers available — pick one:</p>
            {results.map(n => (
              <div key={n.phoneNumber} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div>
                  <p className="text-white font-mono font-bold text-lg">{n.phoneNumber}</p>
                  <p className="text-xs text-zinc-500">{[n.locality, n.region].filter(Boolean).join(", ")} · SMS enabled · ~$1/month</p>
                </div>
                <button onClick={() => buyMut.mutate(n.phoneNumber)} disabled={buyMut.isPending} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
                  {buyMut.isPending ? "Buying..." : "Buy This Number"}
                </button>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && areaCode.length === 3 && !searching && (
          <p className="text-xs text-zinc-600">Search above to see available numbers in area code {areaCode}.</p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "#0a0a0c" }}>
        <h3 className="text-white font-bold mb-4">Your Numbers ({(owned as any[]).length})</h3>
        {(owned as any[]).length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Smartphone className="w-10 h-10 mx-auto text-zinc-700" />
            <p className="text-zinc-500 text-sm">No numbers yet. Search above to get your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(owned as any[]).map((n: any) => (
              <div key={n.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div>
                  <p className="text-white font-mono font-bold text-xl">{n.phone_number}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{n.friendly_name} · {n.country_code} · ${n.monthly_cost}/mo</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium text-emerald-400 bg-emerald-500/10">Active</span>
                  <button onClick={() => { if (confirm("Release this number? This cannot be undone.")) releaseMut.mutate(n.id); }} className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────

function ContactsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ phone: "", firstName: "", lastName: "", email: "", tags: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/sms/contacts", search, page],
    queryFn: () => apiFetch(`/api/sms/contacts?search=${encodeURIComponent(search)}&page=${page}&limit=25`),
  });
  const contacts: any[] = data?.contacts || [];
  const total: number = data?.total || 0;

  const addMut = useMutation({
    mutationFn: () => apiFetch("/api/sms/contacts", { method: "POST", body: JSON.stringify({ ...form, tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()) : [] }) }),
    onSuccess: () => { toast({ title: "Contact added" }); setAddOpen(false); setForm({ phone: "", firstName: "", lastName: "", email: "", tags: "" }); refetch(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sms/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Contact deleted" }); refetch(); },
  });

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",");
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i]?.trim().replace(/^"|"$/g, "") || ""; });
      return { phone: obj.phone || obj.phone_number || obj.mobile, firstName: obj.first_name || obj.firstname, lastName: obj.last_name || obj.lastname, email: obj.email };
    }).filter(c => c.phone);
    const r = await apiFetch("/api/sms/contacts/import", { method: "POST", body: JSON.stringify({ contacts: rows }) });
    toast({ title: `Imported ${r.imported} contacts`, description: r.skipped ? `${r.skipped} skipped (no phone)` : "All imported!" });
    refetch();
    e.target.value = "";
  }

  if (isLoading) return <Loader state="Loading contacts..." />;

  return (
    <div className="space-y-5">
      <GuideBox
        title="How contacts work"
        steps={[
          "Add contacts manually with a phone number (required) + optional name, email, tags",
          "Or import a CSV — needs a 'phone' column. Optional: first_name, last_name, email",
          "Contacts are automatically added when someone texts one of your Keywords",
          "Tags help you segment contacts for targeted campaigns (e.g. 'vip', 'new', 'buyers')",
          "If a contact texts STOP, they are automatically opted out and you cannot message them",
          "Phone numbers must be in E.164 format: +1XXXXXXXXXX or 10-digit US number",
        ]}
        tip="Import a CSV to get started fast. Make sure the header row says 'phone' — the importer is forgiving with other column names."
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input placeholder="Search by phone, name, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
        </div>
        <button onClick={() => setAddOpen(v => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
          <Plus className="w-4 h-4" />Add Contact
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:border-zinc-600 transition-colors">
          <Upload className="w-4 h-4" />Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
        <span className="text-zinc-500 text-sm ml-auto">{total} contacts</span>
      </div>

      {addOpen && (
        <div className="rounded-2xl border border-zinc-700 p-5 space-y-3" style={{ background: "#0a0a0c" }}>
          <h3 className="text-white font-bold text-sm">Add a Contact</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="+1XXXXXXXXXX (required)" value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50 col-span-2" />
            <input placeholder="First name" value={form.firstName} onChange={e => setForm(v => ({ ...v, firstName: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
            <input placeholder="Last name" value={form.lastName} onChange={e => setForm(v => ({ ...v, lastName: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
            <input placeholder="Email (optional)" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
            <input placeholder="Tags: vip, buyer, new (comma-separated)" value={form.tags} onChange={e => setForm(v => ({ ...v, tags: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMut.mutate()} disabled={!form.phone || addMut.isPending} className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {addMut.isPending ? "Saving..." : "Save Contact"}
            </button>
            <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 overflow-hidden" style={{ background: "#0a0a0c" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {["Phone", "Name", "Status", "Tags", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-zinc-600 py-16">No contacts yet. Add one or import a CSV above.</td></tr>
            ) : contacts.map((c: any) => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-3 font-mono text-white">{c.phone}</td>
                <td className="px-4 py-3 text-zinc-300">{[c.first_name, c.last_name].filter(Boolean).join(" ") || <span className="text-zinc-700">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.opted_in ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                    {c.opted_in ? "Opted In" : "Opted Out"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags || []).map((t: string) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteMut.mutate(c.id)} className="p-1.5 rounded-lg text-red-400/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">← Previous</button>
            <span className="text-xs text-zinc-600">Page {page} · {total} total</span>
            <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

function CampaignsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", fromNumber: "", segment: "all", scheduledAt: "", mediaUrl: "" });
  const [chars, setChars] = useState(0);
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showMms, setShowMms] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/sms/campaigns"], queryFn: () => apiFetch("/api/sms/campaigns") });
  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"], queryFn: () => apiFetch("/api/sms/numbers") });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/api/sms/campaigns", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Campaign created" }); setOpen(false); setForm({ name: "", message: "", fromNumber: "", segment: "all", scheduledAt: "", mediaUrl: "" }); setChars(0); setShowMms(false); qc.invalidateQueries({ queryKey: ["/api/sms/campaigns"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sms/campaigns/${id}/send`, { method: "POST" }),
    onSuccess: (d) => { toast({ title: `Sent! ${d.sent} delivered`, description: d.failed ? `${d.failed} failed` : "All messages sent." }); qc.invalidateQueries({ queryKey: ["/api/sms/campaigns"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  async function generateWithAI() {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    try {
      const d = await apiFetch("/api/sms/ai/write", { method: "POST", body: JSON.stringify({ goal: aiGoal }) });
      const msg = d.message || d.text || d.content || "";
      setForm(v => ({ ...v, message: msg }));
      setChars(msg.length);
      setAiGoal("");
      toast({ title: "Message generated ✓", description: "Review it and tweak before sending." });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  if (isLoading) return <Loader state="Loading campaigns..." />;

  return (
    <div className="space-y-5">
      <GuideBox
        title="How campaigns work"
        steps={[
          "A campaign is a one-time blast — you pick a message, a number to send from, and who to send to",
          "Segment 'All opted-in contacts' sends to everyone who has opted in and not stopped",
          "160 characters = 1 SMS segment. Going over costs more — the counter shows how many parts your message uses",
          "STOP opt-outs are automatically excluded — you never need to filter them manually",
          "Once sent, you see delivered count and failed count in real time",
          "Always include something like 'Reply STOP to unsubscribe' in promotional messages (legally required)",
          "MMS: add an image URL to send a picture alongside your message (costs more than SMS)",
        ]}
        tip="Use the AI Generate button to write a compliant 160-char message from a one-line goal description."
      />

      <div className="flex justify-end">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
          <Plus className="w-4 h-4" />New Campaign
        </button>
      </div>

      {open && (
        <div className="rounded-2xl border border-zinc-700 p-5 space-y-3" style={{ background: "#0a0a0c" }}>
          <h3 className="text-white font-bold">Create Campaign</h3>
          <input placeholder="Campaign name (internal label, not sent to contacts)" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
          <select value={form.fromNumber} onChange={e => setForm(v => ({ ...v, fromNumber: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none">
            <option value="">Select which number to send from</option>
            {(numbers as any[]).map((n: any) => <option key={n.id} value={n.phone_number}>{n.phone_number} ({n.friendly_name})</option>)}
          </select>

          {/* AI Generate */}
          <div className="rounded-xl border border-zinc-700/60 p-3 space-y-2" style={{ background: `${GOLD}06` }}>
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: GOLD }}>
              <Sparkles className="w-3.5 h-3.5" /> AI Message Generator
            </p>
            <div className="flex gap-2">
              <input
                placeholder="e.g. Flash sale — 30% off all products this weekend only"
                value={aiGoal}
                onChange={e => setAiGoal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") generateWithAI(); }}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-xs focus:outline-none focus:border-yellow-500/50 placeholder-zinc-600"
              />
              <button
                onClick={generateWithAI}
                disabled={!aiGoal.trim() || aiLoading}
                className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}
              >
                {aiLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3" />Generate</>}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600">Describe your campaign goal → AI writes a compliant 160-char message</p>
          </div>

          <div className="relative">
            <textarea
              placeholder="Your message — keep under 160 chars for 1 SMS segment. Include: Reply STOP to unsubscribe"
              value={form.message}
              onChange={e => { setForm(v => ({ ...v, message: e.target.value })); setChars(e.target.value.length); }}
              rows={4} maxLength={1600}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm resize-none focus:outline-none focus:border-yellow-500/50"
            />
            <span className={`absolute bottom-3 right-3 text-xs ${chars > 160 ? "text-amber-400" : "text-zinc-600"}`}>
              {chars}/160{chars > 160 ? ` · ${Math.ceil(chars / 160)} segments` : ""}
            </span>
          </div>

          {/* MMS toggle */}
          <div>
            <button
              onClick={() => setShowMms(v => !v)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showMms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showMms ? "Hide MMS" : "Add image (MMS)"}
            </button>
            {showMms && (
              <div className="mt-2 space-y-1">
                <input
                  placeholder="Image URL (must be publicly accessible — JPEG, PNG, GIF)"
                  value={form.mediaUrl}
                  onChange={e => setForm(v => ({ ...v, mediaUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                />
                <p className="text-[10px] text-zinc-600">MMS costs more than SMS — typically 3× the rate. Leave blank for text-only SMS.</p>
              </div>
            )}
          </div>

          <select value={form.segment} onChange={e => setForm(v => ({ ...v, segment: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none">
            <option value="all">All opted-in contacts</option>
            <option value="tagged">By tag (contacts with matching tags only)</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => createMut.mutate()} disabled={!form.name || !form.message || !form.fromNumber || createMut.isPending} className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {createMut.isPending ? "Creating..." : "Create Campaign"}
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(campaigns as any[]).length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 p-16 text-center" style={{ background: "#0a0a0c" }}>
            <Megaphone className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">No campaigns yet. Create one above to send your first broadcast.</p>
          </div>
        ) : (campaigns as any[]).map((c: any) => (
          <div key={c.id} className="rounded-2xl border border-zinc-800 p-4" style={{ background: "#0a0a0c" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold truncate">{c.name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${c.status === "sent" ? "text-emerald-400 bg-emerald-500/10" : c.status === "scheduled" ? "text-blue-400 bg-blue-500/10" : "text-zinc-400 bg-zinc-500/10"}`}>{c.status}</span>
                </div>
                <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{c.message}</p>
                <div className="flex items-center flex-wrap gap-3 text-xs text-zinc-600">
                  <span className="font-mono">{c.from_number}</span>
                  {c.status === "sent" && <>
                    <span>· {c.recipients_count} sent</span>
                    <span className="text-emerald-400">· {c.delivered_count} delivered</span>
                    {c.failed_count > 0 && <span className="text-red-400">· {c.failed_count} failed</span>}
                  </>}
                </div>
              </div>
              {c.status === "draft" && (
                <button onClick={() => { if (confirm(`Send "${c.name}" to all opted-in contacts now?`)) sendMut.mutate(c.id); }} disabled={sendMut.isPending} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
                  <Send className="w-3.5 h-3.5" />{sendMut.isPending ? "Sending..." : "Send Now"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Automations ───────────────────────────────────────────────────────────────

// ── Step timeline visual ──────────────────────────────────────────────────────

function StepTimeline({ steps, onDelete, editable = false }: {
  steps: any[];
  onDelete?: (id: string) => void;
  editable?: boolean;
}) {
  return (
    <div className="space-y-0">
      {steps.map((s: any, i: number) => (
        <div key={s.id || i} className="flex gap-3">
          {/* Left rail */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black z-10" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="w-0.5 flex-1 my-1" style={{ background: `${GOLD}25`, minHeight: 20 }} />
            )}
          </div>
          {/* Message card */}
          <div className="flex-1 pb-4">
            <div className="rounded-xl border border-zinc-800 p-3.5" style={{ background: "#0f0f11" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: GOLD }}>
                    {i === 0 ? "⚡ Sends immediately when triggered" : `⏱ Wait ${s.delay_minutes || s.delayMinutes} ${s.delay_unit || s.delayUnit} then send`}
                  </p>
                  <p className="text-white text-sm leading-relaxed">{s.message}</p>
                  <p className="text-[10px] text-zinc-600 mt-1.5">{(s.message || "").length}/160 chars · {Math.ceil((s.message || "").length / 160)} segment</p>
                </div>
                {editable && onDelete && (
                  <button onClick={() => onDelete(s.id)} className="p-1.5 text-red-400/30 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AutomationsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // mode: list | aiPreview | manualCreate | detail
  const [mode, setMode] = useState<"list" | "aiPreview" | "manualCreate" | "detail">("list");
  const [selected, setSelected] = useState<string | null>(null);

  // AI flow
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null); // {name, description, steps}
  const [trigger, setTrigger] = useState({ fromNumber: "", triggerType: "keyword", triggerValue: "" });
  const [activating, setActivating] = useState(false);

  // Manual flow
  const [manForm, setManForm] = useState({ name: "", fromNumber: "", triggerType: "keyword", triggerValue: "" });
  const [manStep, setManStep] = useState({ message: "", delayMinutes: 0, delayUnit: "days" });

  const { data: automations = [] } = useQuery<any[]>({
    queryKey: ["/api/sms/automations"],
    queryFn: () => apiFetch("/api/sms/automations"),
  });
  const { data: numbers = [] } = useQuery<any[]>({
    queryKey: ["/api/sms/numbers"],
    queryFn: () => apiFetch("/api/sms/numbers"),
  });
  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ["/api/sms/automations", selected],
    queryFn: () => selected ? apiFetch(`/api/sms/automations/${selected}`) : null,
    enabled: !!selected && mode === "detail",
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: any) => apiFetch(`/api/sms/automations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sms/automations"] }); refetchDetail(); },
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/api/sms/automations", { method: "POST", body: JSON.stringify(manForm) }),
    onSuccess: (d) => { toast({ title: "Automation created — now add steps" }); setSelected(d.id); setMode("detail"); qc.invalidateQueries({ queryKey: ["/api/sms/automations"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const addStepMut = useMutation({
    mutationFn: () => apiFetch(`/api/sms/automations/${selected}/steps`, { method: "POST", body: JSON.stringify(manStep) }),
    onSuccess: () => { toast({ title: "Step added" }); setManStep({ message: "", delayMinutes: 0, delayUnit: "days" }); qc.invalidateQueries({ queryKey: ["/api/sms/automations", selected] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteStepMut = useMutation({
    mutationFn: (stepId: string) => apiFetch(`/api/sms/automations/steps/${stepId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/sms/automations", selected] }),
  });

  async function buildWithAI() {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    try {
      const d = await apiFetch("/api/sms/ai/build-automation", {
        method: "POST",
        body: JSON.stringify({ goal: aiGoal, stepCount: 5 }),
      });
      setAiResult(d);
      setMode("aiPreview");
    } catch {
      toast({ title: "AI build failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function createAndActivate() {
    if (!trigger.fromNumber || !aiResult) return;
    setActivating(true);
    try {
      // 1. Create automation
      const auto = await apiFetch("/api/sms/automations", {
        method: "POST",
        body: JSON.stringify({
          name: aiResult.name,
          description: aiResult.description,
          fromNumber: trigger.fromNumber,
          triggerType: trigger.triggerType,
          triggerValue: trigger.triggerValue,
        }),
      });
      // 2. Bulk-add all steps + activate
      const steps = (aiResult.steps || []).map((s: any) => ({
        message: s.message,
        delayMinutes: s.delayMinutes || s.delay_minutes || 0,
        delayUnit: s.delayUnit || s.delay_unit || "days",
      }));
      await apiFetch(`/api/sms/automations/${auto.id}/steps/bulk`, {
        method: "POST",
        body: JSON.stringify({ steps, activate: true }),
      });
      toast({ title: "Sequence created & activated! 🎉", description: `${steps.length} steps ready — ${trigger.triggerType === "keyword" ? `starts when someone texts "${trigger.triggerValue}"` : "enroll contacts manually to start"}` });
      qc.invalidateQueries({ queryKey: ["/api/sms/automations"] });
      setSelected(auto.id);
      setMode("detail");
      setAiGoal("");
      setAiResult(null);
      setTrigger({ fromNumber: "", triggerType: "keyword", triggerValue: "" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  }

  const firstNum = (numbers as any[])[0]?.phone_number || "";

  return (
    <div className="space-y-5">
      <GuideBox
        title="How sequences work"
        steps={[
          "A sequence = a series of SMS messages sent automatically over days or weeks",
          "Step 1 fires immediately when triggered. Each step after waits the time you set.",
          "Trigger options: keyword (someone texts JOIN), manual (you enroll them), new contact",
          "Once active, every new trigger auto-enrolls that contact into the full sequence",
          "Contacts who reply STOP are automatically removed — no action needed from you",
          "Use AI Build: describe your goal in one sentence → AI writes all 5 steps → review → activate",
        ]}
        tip="Best practice: Step 1 = welcome + value. Steps 2-3 = education. Steps 4-5 = offer + follow-up."
      />

      {/* ── Main content ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* ── Left: list + controls ── */}
        <div className="space-y-3">

          {/* AI build input */}
          <div className="rounded-2xl border p-4 space-y-2.5" style={{ background: `${GOLD}06`, borderColor: `${GOLD}25` }}>
            <p className="text-xs font-black flex items-center gap-1.5" style={{ color: GOLD }}>
              <Sparkles className="w-3.5 h-3.5" /> AI Sequence Builder
            </p>
            <p className="text-[10px] text-zinc-500">Describe your goal — AI writes the full sequence in seconds</p>
            <textarea
              placeholder="e.g. Welcome new leads, build trust over 2 weeks, then pitch my coaching programme"
              value={aiGoal}
              onChange={e => setAiGoal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); buildWithAI(); } }}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-xs resize-none focus:outline-none focus:border-yellow-500/50 placeholder-zinc-600"
            />
            <button
              onClick={buildWithAI}
              disabled={!aiGoal.trim() || aiLoading}
              className="w-full py-2.5 rounded-xl text-xs font-black disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}
            >
              {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Building sequence...</> : <><Sparkles className="w-3.5 h-3.5" />Build with AI</>}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <button
            onClick={() => { setMode("manualCreate"); setSelected(null); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />Build manually
          </button>

          {/* Automation list */}
          <div className="space-y-2 pt-1">
            {(automations as any[]).length > 0 && (
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-1">Your sequences</p>
            )}
            {(automations as any[]).map((a: any) => (
              <button
                key={a.id}
                onClick={() => { setSelected(a.id); setMode("detail"); }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${selected === a.id && mode === "detail" ? "border-yellow-500/40 bg-zinc-900" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-xs font-bold truncate">{a.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{a.step_count || 0} steps · {a.enrolled_count || 0} enrolled</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${a.status === "active" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 bg-zinc-500/10"}`}>
                    {a.status}
                  </span>
                </div>
              </button>
            ))}
            {(automations as any[]).length === 0 && (
              <p className="text-xs text-zinc-700 text-center py-4">No sequences yet</p>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="col-span-2">

          {/* AI preview */}
          {mode === "aiPreview" && aiResult && (
            <div className="rounded-2xl border border-zinc-700 overflow-hidden" style={{ background: "#0a0a0c" }}>
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between" style={{ background: `${GOLD}08` }}>
                <div>
                  <h3 className="text-white font-black">{aiResult.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{(aiResult.steps || []).length} steps generated · review, then set trigger</p>
                </div>
                <button onClick={() => { setMode("list"); setAiResult(null); }} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Step preview */}
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3">Sequence Preview</p>
                  <StepTimeline steps={(aiResult.steps || []).map((s: any) => ({
                    message: s.message,
                    delay_minutes: s.delayMinutes || 0,
                    delay_unit: s.delayUnit || "days",
                  }))} />
                </div>

                {/* Trigger config */}
                <div className="rounded-xl border border-zinc-700 p-4 space-y-3" style={{ background: "#080810" }}>
                  <p className="text-xs font-black text-white">Set Trigger & Activate</p>
                  <select
                    value={trigger.fromNumber}
                    onChange={e => setTrigger(v => ({ ...v, fromNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none"
                  >
                    <option value="">Select phone number to send from</option>
                    {(numbers as any[]).map((n: any) => (
                      <option key={n.id} value={n.phone_number}>{n.phone_number} ({n.friendly_name})</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={trigger.triggerType}
                      onChange={e => setTrigger(v => ({ ...v, triggerType: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none"
                    >
                      <option value="keyword">Keyword (someone texts a word)</option>
                      <option value="manual">Manual (you enroll contacts)</option>
                      <option value="new_contact">New contact added</option>
                    </select>
                    {trigger.triggerType === "keyword" && (
                      <input
                        placeholder="Keyword e.g. JOIN"
                        value={trigger.triggerValue}
                        onChange={e => setTrigger(v => ({ ...v, triggerValue: e.target.value.toUpperCase() }))}
                        className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50"
                      />
                    )}
                  </div>
                  <button
                    onClick={createAndActivate}
                    disabled={!trigger.fromNumber || activating || (trigger.triggerType === "keyword" && !trigger.triggerValue)}
                    className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}
                  >
                    {activating
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Creating & activating...</>
                      : <><PlayCircle className="w-4 h-4" />Create Sequence & Activate</>
                    }
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center">
                    Creates all {(aiResult.steps || []).length} steps and activates immediately — contacts will start receiving messages the moment they trigger it
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual create */}
          {mode === "manualCreate" && (
            <div className="rounded-2xl border border-zinc-700 p-5 space-y-3" style={{ background: "#0a0a0c" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">New Sequence</h3>
                <button onClick={() => setMode("list")} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
              </div>
              <input
                placeholder="Sequence name — e.g. Welcome Series"
                value={manForm.name}
                onChange={e => setManForm(v => ({ ...v, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              />
              <select
                value={manForm.fromNumber}
                onChange={e => setManForm(v => ({ ...v, fromNumber: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none"
              >
                <option value="">Select number to send from</option>
                {(numbers as any[]).map((n: any) => <option key={n.id} value={n.phone_number}>{n.phone_number}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={manForm.triggerType}
                  onChange={e => setManForm(v => ({ ...v, triggerType: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none"
                >
                  <option value="keyword">Keyword trigger</option>
                  <option value="manual">Manual enroll</option>
                  <option value="new_contact">New contact</option>
                </select>
                <input
                  placeholder="Keyword (e.g. JOIN)"
                  value={manForm.triggerValue}
                  onChange={e => setManForm(v => ({ ...v, triggerValue: e.target.value.toUpperCase() }))}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50"
                />
              </div>
              <button
                onClick={() => createMut.mutate()}
                disabled={!manForm.name || !manForm.fromNumber || createMut.isPending}
                className="px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}
              >
                {createMut.isPending ? "Creating..." : "Create Sequence →"}
              </button>
            </div>
          )}

          {/* Detail / step editor */}
          {mode === "detail" && selected && detail && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden" style={{ background: "#0a0a0c" }}>
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold">{detail.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {detail.trigger_type === "keyword"
                      ? `Triggers when someone texts "${detail.trigger_value}"`
                      : detail.trigger_type === "new_contact"
                      ? "Triggers on new contact added"
                      : "Manual enroll"
                    }
                    {" · "}<span className="font-mono">{detail.from_number}</span>
                    {" · "}{detail.enrolled_count || 0} enrolled
                  </p>
                </div>
                <button
                  onClick={() => toggleMut.mutate({ id: detail.id, status: detail.status === "active" ? "paused" : "active" })}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    detail.status === "active"
                      ? "border border-zinc-700 text-zinc-300 hover:border-zinc-600"
                      : "text-black"
                  }`}
                  style={detail.status !== "active" ? { background: `linear-gradient(135deg, ${GOLD}, #b8962e)` } : {}}
                >
                  {detail.status === "active"
                    ? <><PauseCircle className="w-4 h-4" />Pause</>
                    : <><PlayCircle className="w-4 h-4" />Activate</>
                  }
                </button>
              </div>

              <div className="p-5 space-y-5">
                {(detail.steps || []).length > 0 ? (
                  <StepTimeline steps={detail.steps} editable onDelete={id => deleteStepMut.mutate(id)} />
                ) : (
                  <p className="text-zinc-600 text-sm text-center py-6">No steps yet — add your first message below.</p>
                )}

                {/* Add step form */}
                <div className="rounded-xl border border-dashed border-zinc-700 p-4 space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Add Step {(detail.steps || []).length + 1}
                  </p>
                  <div className="relative">
                    <textarea
                      placeholder="Message text (160 chars = 1 SMS). Include: Reply STOP to unsubscribe"
                      value={manStep.message}
                      onChange={e => setManStep(v => ({ ...v, message: e.target.value }))}
                      maxLength={1600}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm resize-none focus:outline-none focus:border-yellow-500/50"
                    />
                    <span className={`absolute bottom-3 right-3 text-[10px] ${manStep.message.length > 160 ? "text-amber-400" : "text-zinc-600"}`}>
                      {manStep.message.length}/160
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {(detail.steps || []).length > 0 && (
                      <>
                        <span className="text-xs text-zinc-500">Wait</span>
                        <input
                          type="number" min={0}
                          value={manStep.delayMinutes}
                          onChange={e => setManStep(v => ({ ...v, delayMinutes: parseInt(e.target.value) || 0 }))}
                          className="w-16 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none text-center"
                        />
                        <select
                          value={manStep.delayUnit}
                          onChange={e => setManStep(v => ({ ...v, delayUnit: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none"
                        >
                          <option value="minutes">minutes</option>
                          <option value="hours">hours</option>
                          <option value="days">days</option>
                        </select>
                        <span className="text-[10px] text-zinc-600">after previous step</span>
                      </>
                    )}
                    {(detail.steps || []).length === 0 && (
                      <span className="text-xs text-zinc-500">Step 1 always sends immediately when triggered</span>
                    )}
                    <button
                      onClick={() => addStepMut.mutate()}
                      disabled={!manStep.message || addStepMut.isPending}
                      className="ml-auto px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}
                    >
                      {addStepMut.isPending ? "..." : "+ Add Step"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {mode === "list" && (
            <div className="rounded-2xl border border-zinc-800 h-72 flex flex-col items-center justify-center gap-3 text-center px-8" style={{ background: "#0a0a0c" }}>
              <Zap className="w-10 h-10 text-zinc-800" />
              <p className="text-zinc-500 text-sm font-medium">Build your first sequence</p>
              <p className="text-xs text-zinc-700">Describe your goal in the AI builder on the left — it'll write all the messages for you. Or build manually step by step.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Keywords ──────────────────────────────────────────────────────────────────

function KeywordsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fromNumber: "", keyword: "", reply: "", action: "reply" });

  const { data: keywords = [] } = useQuery<any[]>({ queryKey: ["/api/sms/keywords"], queryFn: () => apiFetch("/api/sms/keywords") });
  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"], queryFn: () => apiFetch("/api/sms/numbers") });

  const addMut = useMutation({
    mutationFn: () => apiFetch("/api/sms/keywords", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Keyword saved" }); setOpen(false); setForm({ fromNumber: "", keyword: "", reply: "", action: "reply" }); qc.invalidateQueries({ queryKey: ["/api/sms/keywords"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: any) => apiFetch(`/api/sms/keywords/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/sms/keywords"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sms/keywords/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Keyword deleted" }); qc.invalidateQueries({ queryKey: ["/api/sms/keywords"] }); },
  });

  return (
    <div className="space-y-5">
      <GuideBox
        title="How keywords work"
        steps={[
          "A keyword is a word someone can text to your number to trigger an auto-reply",
          "Example: someone texts JOIN to your number → they get your welcome reply automatically",
          "STOP, START, and HELP are handled automatically by law — do not create these manually",
          "Set action to 'Subscribe to automation' to also enroll them in a drip sequence",
          "Keywords are case-insensitive — JOIN, join, and Join all work the same",
          "Your reply counts toward the 160-char limit — keep it short and clear",
        ]}
        tip="JOIN is the most popular keyword — it grows your list organically. Advertise it anywhere: social media, website, receipts, events."
      />

      <div className="rounded-xl border border-zinc-800 p-3 text-sm" style={{ background: "#0a0a0c" }}>
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
          <p className="text-zinc-400"><span className="text-white font-bold">Auto-handled (do not create manually):</span> STOP (unsubscribes), START (re-subscribes), HELP (info reply). These are required by law and are always active.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
          <Plus className="w-4 h-4" />Add Keyword
        </button>
      </div>

      {open && (
        <div className="rounded-2xl border border-zinc-700 p-5 space-y-3" style={{ background: "#0a0a0c" }}>
          <select value={form.fromNumber} onChange={e => setForm(v => ({ ...v, fromNumber: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none">
            <option value="">Select which number to attach this keyword to</option>
            {(numbers as any[]).map((n: any) => <option key={n.id} value={n.phone_number}>{n.phone_number}</option>)}
          </select>
          <input placeholder='Keyword — e.g. JOIN, INFO, VIP, PROMO (all caps automatically)' value={form.keyword} onChange={e => setForm(v => ({ ...v, keyword: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50" />
          <textarea placeholder="Auto-reply message — sent immediately when someone texts this keyword (max 160 chars)" value={form.reply} onChange={e => setForm(v => ({ ...v, reply: e.target.value }))} rows={3} maxLength={160} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm resize-none focus:outline-none focus:border-yellow-500/50" />
          <select value={form.action} onChange={e => setForm(v => ({ ...v, action: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none">
            <option value="reply">Auto-reply only (just send the reply message)</option>
            <option value="subscribe">Auto-reply + enroll in an automation</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => addMut.mutate()} disabled={!form.fromNumber || !form.keyword || !form.reply || addMut.isPending} className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {addMut.isPending ? "Saving..." : "Save Keyword"}
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(keywords as any[]).length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 p-16 text-center" style={{ background: "#0a0a0c" }}>
            <Hash className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">No keywords yet. Add JOIN first — it is the fastest way to grow your list.</p>
          </div>
        ) : (keywords as any[]).map((k: any) => (
          <div key={k.id} className="rounded-2xl border border-zinc-800 p-4 flex items-start justify-between gap-4" style={{ background: "#0a0a0c" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-white font-black text-xl">{k.keyword}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">{k.from_number}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${k.active ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 bg-zinc-500/10"}`}>{k.active ? "Active" : "Paused"}</span>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-2">Reply: "{k.reply}"</p>
              <p className="text-xs text-zinc-600 mt-1">{k.match_count} matches total</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleMut.mutate({ id: k.id, active: !k.active })} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title={k.active ? "Pause keyword" : "Activate keyword"}>
                {k.active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              </button>
              <button onClick={() => deleteMut.mutate(k.id)} className="p-1.5 rounded-lg text-red-400/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

function InboxSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [convId, setConvId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: convs = [] } = useQuery<any[]>({ queryKey: ["/api/sms/inbox"], queryFn: () => apiFetch("/api/sms/inbox"), refetchInterval: 10000 });
  const { data: thread } = useQuery({ queryKey: ["/api/sms/inbox", convId], queryFn: () => convId ? apiFetch(`/api/sms/inbox/${convId}/messages`) : null, enabled: !!convId, refetchInterval: 5000 });

  const sendMut = useMutation({
    mutationFn: () => apiFetch(`/api/sms/inbox/${convId}/send`, { method: "POST", body: JSON.stringify({ message: reply }) }),
    onSuccess: () => { setReply(""); setSuggestions([]); qc.invalidateQueries({ queryKey: ["/api/sms/inbox", convId] }); qc.invalidateQueries({ queryKey: ["/api/sms/inbox"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  async function getAISuggestions() {
    const msgs: any[] = thread?.messages || [];
    const last = [...msgs].reverse().find((m: any) => m.direction === "inbound");
    if (!last) return toast({ title: "No inbound message to reply to", variant: "destructive" });
    setAiLoading(true);
    try {
      const d = await apiFetch("/api/sms/ai/suggest-replies", { method: "POST", body: JSON.stringify({ inboundMessage: last.body }) });
      setSuggestions(d.replies || []);
    } catch { toast({ title: "AI suggestions failed", variant: "destructive" }); }
    finally { setAiLoading(false); }
  }

  const msgs: any[] = thread?.messages || [];
  const conv = thread?.conversation;

  return (
    <div className="space-y-5">
      <GuideBox
        title="How the inbox works"
        steps={[
          "Every time a contact replies to your SMS number, the conversation appears here",
          "Click any conversation on the left to see the full thread",
          "Type a reply at the bottom and press Enter or click Send",
          "Click 'AI Replies' to get 3 suggested responses based on what the contact said",
          "Unread replies show a gold badge — conversations auto-refresh every 5 seconds",
          "If a contact sends STOP, they are removed from all future sends automatically",
        ]}
        tip="AI Replies work best for common questions about your business, pricing, or how to join. Click a suggestion to fill in the reply box, then edit before sending."
      />

      <div className="rounded-2xl border border-zinc-800 overflow-hidden" style={{ height: "580px", background: "#0a0a0c" }}>
        <div className="grid grid-cols-3 h-full">
          <div className="border-r border-zinc-800 overflow-y-auto">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Conversations ({(convs as any[]).length})</p>
            </div>
            {(convs as any[]).length === 0 ? (
              <div className="text-center p-8">
                <Inbox className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-zinc-600 text-xs">No replies yet.<br />When contacts text back, they appear here.</p>
              </div>
            ) : (convs as any[]).map((c: any) => (
              <button key={c.id} onClick={() => setConvId(c.id)} className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors ${convId === c.id ? "bg-zinc-900" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-bold truncate">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.contact_phone}</p>
                    <p className="text-xs text-zinc-600 font-mono">{c.contact_phone}</p>
                    {c.last_message && <p className="text-xs text-zinc-500 truncate mt-0.5">{c.last_message}</p>}
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>{c.unread_count}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-2 flex flex-col">
            {!convId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2">
                <MessageCircle className="w-10 h-10 text-zinc-800" />
                <p className="text-sm">Select a conversation to start replying</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{conv ? ([conv.first_name, conv.last_name].filter(Boolean).join(" ") || conv.contact_phone) : ""}</p>
                    <p className="text-xs text-zinc-600 font-mono">{conv?.contact_phone} · via {conv?.from_number}</p>
                  </div>
                  <button onClick={getAISuggestions} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                    <Bot className="w-3 h-3" style={{ color: GOLD }} />{aiLoading ? "Thinking..." : "AI Replies"}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgs.map((m: any) => (
                    <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.direction === "outbound" ? "rounded-br-sm" : "rounded-bl-sm bg-zinc-800 text-white"}`} style={m.direction === "outbound" ? { background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" } : {}}>
                        <p>{m.body}</p>
                        <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-black/50" : "text-zinc-500"}`}>{new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                  {msgs.length === 0 && <p className="text-center text-zinc-700 text-sm py-8">No messages yet in this conversation.</p>}
                </div>

                {suggestions.length > 0 && (
                  <div className="px-4 pb-2 flex gap-2 flex-wrap border-t border-zinc-800 pt-2">
                    <span className="text-xs text-zinc-600 w-full mb-1">AI suggestions — click to use:</span>
                    {suggestions.map((s: any, i: number) => (
                      <button key={i} onClick={() => { setReply(s.text); setSuggestions([]); }} className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:border-yellow-500/40 hover:text-white transition-colors">{s.label}</button>
                    ))}
                  </div>
                )}

                <div className="p-3 border-t border-zinc-800 flex gap-2">
                  <textarea
                    placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (reply.trim()) sendMut.mutate(); } }}
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm resize-none focus:outline-none focus:border-yellow-500/50"
                  />
                  <button onClick={() => sendMut.mutate()} disabled={!reply.trim() || sendMut.isPending} className="px-4 rounded-xl font-bold disabled:opacity-50 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
                    <Send className="w-4 h-4" />
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

// ── Analytics ─────────────────────────────────────────────────────────────────

function SequenceStatsRow({ automation }: { automation: any }) {
  const { data: stats } = useQuery({
    queryKey: ["/api/sms/automations", automation.id, "stats"],
    queryFn: () => apiFetch(`/api/sms/automations/${automation.id}/stats`),
    staleTime: 60000,
  });

  const enrolled = stats?.enrolled || automation.enrolled_count || 0;
  const completed = stats?.completed || 0;
  const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">{automation.name}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {automation.trigger_type === "keyword" ? `Keyword: "${automation.trigger_value}"` : automation.trigger_type}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${automation.status === "active" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 bg-zinc-500/10"}`}>
          {automation.status}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-400 text-sm text-center">{automation.step_count || 0}</td>
      <td className="px-4 py-3 text-center">
        <span className="text-white text-sm font-bold">{enrolled}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-zinc-400 text-sm">{completed}</span>
      </td>
      <td className="px-4 py-3 text-center">
        {enrolled > 0 ? (
          <div className="flex items-center gap-2 justify-center">
            <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${completionRate}%`,
                  background: completionRate >= 60 ? "#22c55e" : completionRate >= 30 ? GOLD : "#ef4444",
                }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: completionRate >= 60 ? "#22c55e" : completionRate >= 30 ? GOLD : "#ef4444" }}>
              {completionRate}%
            </span>
          </div>
        ) : (
          <span className="text-zinc-700 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

function AnalyticsSection() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/sms/analytics"], queryFn: () => apiFetch("/api/sms/analytics") });
  const { data: automations = [] } = useQuery<any[]>({ queryKey: ["/api/sms/automations"], queryFn: () => apiFetch("/api/sms/automations") });
  const ov = data?.overview || {};
  if (isLoading) return <Loader state="Loading analytics..." />;

  return (
    <div className="space-y-5">
      <GuideBox
        title="Understanding your analytics"
        steps={[
          "Delivery Rate: % of sent messages that Twilio confirmed delivered. Above 95% is excellent.",
          "Opt-Out Rate: % of sends that resulted in a STOP reply. Under 2% is healthy.",
          "Failed sends are usually due to invalid phone numbers or carrier blocks — clean your list.",
          "Sequence Completion Rate: % of enrolled contacts who completed every step in a sequence.",
          "All numbers are real-time from Twilio delivery receipts, not estimates.",
        ]}
        tip="Sequences with under 30% completion rate usually have too-long delays or irrelevant step 3+ content. Review and tighten."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Contacts" value={ov.totalContacts?.toLocaleString() || "0"} />
        <StatCard icon={Send} label="Messages Sent" value={ov.totalMessagesSent?.toLocaleString() || "0"} color="#3b82f6" />
        <StatCard icon={Check} label="Delivered" value={ov.totalDelivered?.toLocaleString() || "0"} color="#22c55e" />
        <StatCard icon={TrendingUp} label="Delivery Rate" value={`${ov.deliveryRate || 0}%`} color="#22c55e" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Megaphone} label="Campaigns Sent" value={ov.totalCampaignsSent || "0"} color="#a855f7" />
        <StatCard icon={Zap} label="Active Sequences" value={(automations as any[]).filter((a: any) => a.status === "active").length.toString()} color={GOLD} />
        <StatCard icon={X} label="Failed Sends" value={ov.totalFailed || "0"} color="#ef4444" />
        <StatCard icon={AlertTriangle} label="Opt-Out Rate" value={`${ov.optOutRate || 0}%`} color="#f97316" />
      </div>

      {/* Sequence Performance */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden" style={{ background: "#0a0a0c" }}>
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: GOLD }} />Sequence Performance
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Enrollment + completion for all your automated sequences</p>
          </div>
        </div>
        {(automations as any[]).length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Zap className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
            <p className="text-zinc-600 text-sm">No sequences yet</p>
            <p className="text-xs text-zinc-700 mt-1">Build one in the Sequences tab — AI can write all the messages for you</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Sequence", "Status", "Steps", "Enrolled", "Completed", "Completion Rate"].map(h => (
                  <th key={h} className={`px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide ${h === "Sequence" ? "text-left" : "text-center"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(automations as any[]).map((a: any) => (
                <SequenceStatsRow key={a.id} automation={a} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Campaign Performance */}
      {data?.recentCampaigns?.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden" style={{ background: "#0a0a0c" }}>
          <div className="px-5 py-4 border-b border-zinc-800">
            <h3 className="text-white font-bold">Recent Campaign Performance</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Campaign", "Recipients", "Delivered", "Failed", "Date"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentCampaigns.map((c: any, i: number) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.recipients_count}</td>
                  <td className="px-4 py-3 text-emerald-400">{c.delivered_count}</td>
                  <td className="px-4 py-3 text-red-400">{c.failed_count}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── AI Tools ──────────────────────────────────────────────────────────────────

function AISection() {
  const { toast } = useToast();
  const [tool, setTool] = useState<"write" | "compliance" | "segment">("write");
  const [wForm, setWForm] = useState({ goal: "", tone: "friendly", audience: "", cta: "" });
  const [wResult, setWResult] = useState<any>(null);
  const [wLoading, setWLoading] = useState(false);
  const [cMsg, setCMsg] = useState(""); const [cResult, setCResult] = useState<any>(null); const [cLoading, setCLoading] = useState(false);
  const [sDesc, setSDesc] = useState(""); const [sResult, setSResult] = useState<any>(null); const [sLoading, setSLoading] = useState(false);

  async function write() {
    setWLoading(true);
    try { setWResult(await apiFetch("/api/sms/ai/write", { method: "POST", body: JSON.stringify(wForm) })); }
    catch { toast({ title: "AI write failed", variant: "destructive" }); }
    finally { setWLoading(false); }
  }

  async function compliance() {
    setCLoading(true);
    try { setCResult(await apiFetch("/api/sms/ai/compliance-check", { method: "POST", body: JSON.stringify({ message: cMsg }) })); }
    catch { toast({ title: "Check failed", variant: "destructive" }); }
    finally { setCLoading(false); }
  }

  async function segment() {
    setSLoading(true);
    try { setSResult(await apiFetch("/api/sms/ai/build-segment", { method: "POST", body: JSON.stringify({ description: sDesc }) })); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSLoading(false); }
  }

  return (
    <div className="grid grid-cols-4 gap-5">
      <div className="space-y-2">
        <GuideBox title="AI Tools guide" steps={["Copywriter: describe what you want to say and AI writes a compliant 160-char SMS", "Compliance Check: paste any message to scan for TCPA legal issues before sending", "Segment Builder: describe your audience in plain English and AI creates a contact filter"]} />
        {([
          { id: "write", icon: Sparkles, label: "AI Copywriter", desc: "Goal → SMS message" },
          { id: "compliance", icon: ShieldCheck, label: "Compliance Check", desc: "TCPA risk scan" },
          { id: "segment", icon: Tag, label: "Segment Builder", desc: "English → contact filter" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} className={`w-full text-left p-3 rounded-xl border transition-colors ${tool === t.id ? "border-yellow-500/40" : "border-zinc-800 hover:border-zinc-700"}`} style={{ background: tool === t.id ? "#0f0f11" : "#0a0a0c" }}>
            <t.icon className="w-4 h-4 mb-2" style={{ color: GOLD }} />
            <p className="text-white text-sm font-bold">{t.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="col-span-3">
        {tool === "write" && (
          <div className="rounded-2xl border border-zinc-800 p-5 space-y-4" style={{ background: "#0a0a0c" }}>
            <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-4 h-4" style={{ color: GOLD }} />AI SMS Copywriter</h3>
            <p className="text-xs text-zinc-500">Describe what you want to promote — AI writes a ready-to-send SMS under 160 characters.</p>
            <input placeholder="e.g. Promote 20% off sale this weekend only" value={wForm.goal} onChange={e => setWForm(v => ({ ...v, goal: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
            <div className="grid grid-cols-3 gap-3">
              <select value={wForm.tone} onChange={e => setWForm(v => ({ ...v, tone: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none">
                {["friendly", "urgent", "professional", "casual"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <input placeholder="Audience (e.g. VIP members)" value={wForm.audience} onChange={e => setWForm(v => ({ ...v, audience: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
              <input placeholder="CTA (e.g. Shop now at oravini.com)" value={wForm.cta} onChange={e => setWForm(v => ({ ...v, cta: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
            </div>
            <button onClick={write} disabled={!wForm.goal || wLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {wLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Generate SMS</>}
            </button>
            {wResult && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 space-y-3">
                <p className="text-white text-base leading-relaxed">{wResult.message}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${wResult.charCount > 160 ? "text-amber-400" : "text-zinc-500"}`}>{wResult.charCount} chars · {wResult.segments} SMS segment{wResult.segments !== 1 ? "s" : ""}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(wResult.message); toast({ title: "Copied to clipboard!" }); }} className="text-xs px-3 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">Copy</button>
                    <button onClick={write} className="text-xs px-3 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center gap-1"><RefreshCw className="w-3 h-3" />Regenerate</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tool === "compliance" && (
          <div className="rounded-2xl border border-zinc-800 p-5 space-y-4" style={{ background: "#0a0a0c" }}>
            <h3 className="text-white font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: GOLD }} />TCPA Compliance Check</h3>
            <p className="text-xs text-zinc-500">Paste any SMS message to scan for legal issues before you send it to thousands of people.</p>
            <textarea placeholder="Paste your SMS message here..." value={cMsg} onChange={e => setCMsg(e.target.value)} rows={5} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm resize-none focus:outline-none focus:border-yellow-500/50" />
            <button onClick={compliance} disabled={!cMsg || cLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {cLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" />Check Compliance</>}
            </button>
            {cResult && (
              <div className={`p-4 rounded-xl border space-y-3 ${cResult.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <div className="flex items-center gap-2">
                  {cResult.passed ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <span className={`font-bold text-sm ${cResult.passed ? "text-emerald-400" : "text-red-400"}`}>{cResult.passed ? "Compliant" : "Issues found"} · Risk level: {cResult.riskLevel}</span>
                </div>
                {cResult.issues?.map((issue: string, i: number) => <p key={i} className="text-sm text-red-300 flex items-start gap-2"><X className="w-3 h-3 mt-0.5 flex-shrink-0" />{issue}</p>)}
                {cResult.suggestions?.map((s: string, i: number) => <p key={i} className="text-sm text-zinc-400 flex items-start gap-2"><Check className="w-3 h-3 mt-0.5 flex-shrink-0 text-zinc-500" />{s}</p>)}
              </div>
            )}
          </div>
        )}

        {tool === "segment" && (
          <div className="rounded-2xl border border-zinc-800 p-5 space-y-4" style={{ background: "#0a0a0c" }}>
            <h3 className="text-white font-bold flex items-center gap-2"><Tag className="w-4 h-4" style={{ color: GOLD }} />AI Segment Builder</h3>
            <p className="text-xs text-zinc-500">Describe your target audience in plain English — AI converts it into a contact filter for your campaigns.</p>
            <input placeholder="e.g. customers who joined last month and have not bought yet" value={sDesc} onChange={e => setSDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:border-yellow-500/50" />
            <button onClick={segment} disabled={!sDesc || sLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
              {sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Tag className="w-4 h-4" />Build Segment</>}
            </button>
            {sResult && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2">
                <p className="text-white font-bold">{sResult.label}</p>
                <p className="text-sm text-zinc-400">{sResult.estimatedDescription}</p>
                <div className="text-xs text-zinc-500 space-y-1 pt-1 border-t border-zinc-800">
                  <p>Tags filter: {sResult.filters?.tags?.join(", ") || "any"}</p>
                  <p>Opted in: {sResult.filters?.optedIn ? "yes (only opted-in)" : "all contacts"}</p>
                  {sResult.filters?.source && <p>Source: {sResult.filters.source}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Floating AI Chatbot ───────────────────────────────────────────────────────

function SmsChatbot({ currentPage }: { currentPage: NavId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hey! I'm your SMS Marketing assistant. Ask me anything — how to set up automations, TCPA compliance, getting your first campaign out, anything.\n\nWhat do you need help with?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user" as const, content: text };
    setMessages(v => [...v, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const d = await apiFetch("/api/sms/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), context: currentPage }),
      });
      setMessages(v => [...v, { role: "assistant", content: d.reply }]);
    } catch {
      setMessages(v => [...v, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const quickQuestions = [
    "How do I get started?",
    "What is TCPA compliance?",
    "How do keywords work?",
    "How do I grow my list?",
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-50 transition-transform hover:scale-110"
        style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}
        title="SMS Assistant"
      >
        {open ? <X className="w-6 h-6 text-black" /> : <HelpCircle className="w-6 h-6 text-black" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 rounded-2xl border border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden" style={{ height: "460px", background: "#080810" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800" style={{ background: `${GOLD}10` }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}25` }}>
              <Bot className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-white text-sm font-bold">SMS Assistant</p>
              <p className="text-xs text-zinc-500">Ask anything about SMS marketing</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm bg-zinc-800 text-zinc-200"}`}
                  style={m.role === "user" ? { background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" } : {}}>
                  {m.content.split("\n").map((line, j) => <span key={j}>{line}{j < m.content.split("\n").length - 1 && <br />}</span>)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div className="space-y-1.5 mt-2">
                <p className="text-xs text-zinc-600">Quick questions:</p>
                {quickQuestions.map((q, i) => (
                  <button key={i} onClick={() => { setInput(q); }} className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors">{q}</button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              placeholder="Ask anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-xs focus:outline-none focus:border-yellow-500/50"
            />
            <button onClick={send} disabled={!input.trim() || loading} className="p-2 rounded-xl disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
              <Send className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SmsMarketing() {
  const { user } = useAuth();
  const [active, setActive] = useState<NavId>("overview");

  const { data: numbers = [] } = useQuery<any[]>({ queryKey: ["/api/sms/numbers"], queryFn: () => apiFetch("/api/sms/numbers"), enabled: hasSmsAccess(user?.plan) || !!(user as any)?.isAdmin });
  const { data: contactsData } = useQuery({ queryKey: ["/api/sms/contacts", "", 1], queryFn: () => apiFetch("/api/sms/contacts?limit=1"), enabled: hasSmsAccess(user?.plan) || !!(user as any)?.isAdmin });
  const { data: keywords = [] } = useQuery<any[]>({ queryKey: ["/api/sms/keywords"], queryFn: () => apiFetch("/api/sms/keywords"), enabled: hasSmsAccess(user?.plan) || !!(user as any)?.isAdmin });
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/sms/campaigns"], queryFn: () => apiFetch("/api/sms/campaigns"), enabled: hasSmsAccess(user?.plan) || !!(user as any)?.isAdmin });

  const hasNumber = (numbers as any[]).length > 0;
  const contactCount = (contactsData as any)?.total || 0;
  const keywordCount = (keywords as any[]).length;
  const campaignCount = (campaigns as any[]).filter((c: any) => c.status === "sent").length;

  const LOCKED_TABS: NavId[] = ["contacts", "campaigns", "automations", "keywords", "inbox", "analytics", "ai"];

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>;
  if (!hasSmsAccess(user.plan) && !(user as any).isAdmin) return <SmsTierGate plan={user.plan} />;

  return (
    <div className="min-h-screen flex" style={{ background: BG, color: "#fff" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col sticky top-0 h-screen" style={{ background: "#060608" }}>
        <div className="px-5 py-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <MessageSquare className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-white font-black text-sm">SMS Marketing</p>
              <p className="text-zinc-600 text-xs">{hasNumber ? `${(numbers as any[]).length} number${(numbers as any[]).length !== 1 ? "s" : ""}` : "Setup needed"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const isLocked = !hasNumber && LOCKED_TABS.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "" : isLocked ? "opacity-40 cursor-default" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"}`}
                style={isActive ? { background: `${GOLD}15`, color: GOLD } : {}}
                title={isLocked ? "Get a phone number first to unlock this" : ""}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </div>
                {isLocked && <Lock className="w-3 h-3 flex-shrink-0 text-zinc-600" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <a href="/dashboard" className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-black text-white">{NAV.find(n => n.id === active)?.label}</h1>
          </div>

          {/* Hard gate on locked tabs */}
          {!hasNumber && LOCKED_TABS.includes(active)
            ? <NumberGate onGo={() => setActive("numbers")} />
            : <>
              {active === "overview"    && <OverviewSection setActive={setActive} hasNumber={hasNumber} contactCount={contactCount} keywordCount={keywordCount} campaignCount={campaignCount} />}
              {active === "numbers"     && <NumbersSection />}
              {active === "contacts"    && <ContactsSection />}
              {active === "campaigns"   && <CampaignsSection />}
              {active === "automations" && <AutomationsSection />}
              {active === "keywords"    && <KeywordsSection />}
              {active === "inbox"       && <InboxSection />}
              {active === "analytics"   && <AnalyticsSection />}
              {active === "ai"          && <AISection />}
            </>
          }
        </div>
      </main>

      {/* Floating chatbot */}
      <SmsChatbot currentPage={active} />
    </div>
  );
}
