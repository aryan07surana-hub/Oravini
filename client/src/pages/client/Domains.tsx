import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Globe, Check, X, Loader2, Plus, Trash2, Shield,
  RefreshCw, Link2, AlertCircle, ChevronRight, Edit3,
  Copy, CheckCircle, ExternalLink, Zap, Clock, DollarSign,
  Server, Lock, ArrowRight, Settings, ToggleLeft, ToggleRight,
  GitBranch, FileText,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR = "#06060b";
const BORDER = "rgba(255,255,255,0.07)";
const GREEN = "#22c55e";

type Tab = "search" | "manage";
type DomainResult = { domain: string; tld: string; available: boolean; price: number };
type RegisteredDomain = {
  id: string; domain: string; tld: string; status: string;
  expires_at: string; auto_renew: boolean; funnel_id: string | null;
  funnel_name: string | null; funnel_slug: string | null;
  dns_records: DnsRecord[]; nameservers: string[];
  price_paid: number; created_at: string;
};
type DnsRecord = {
  type: string; name: string; value: string; ttl: number; priority?: number;
};

const TLD_POPULAR = ["com", "io", "co", "net", "org", "ai", "app", "dev"];

const TLD_COLORS: Record<string, string> = {
  com: "#d4b461", io: "#3b82f6", co: "#22c55e", net: "#a855f7",
  org: "#06b6d4", ai: "#f97316", app: "#ef4444", dev: "#22c55e",
  xyz: "#71717a", shop: "#f97316", me: "#a855f7", tech: "#3b82f6",
};

function badge(tld: string) { return TLD_COLORS[tld] || GOLD; }

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded transition-colors text-zinc-600 hover:text-white">
      {copied ? <CheckCircle className="w-3 h-3" style={{ color: GREEN }} /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Domain search result card ─────────────────────────────────────────────────

function ResultCard({ result, onBuy, buying }: {
  result: DomainResult;
  onBuy: (r: DomainResult) => void;
  buying: boolean;
}) {
  const color = badge(result.tld);
  const [parts] = [result.domain.split(".")];
  const sld = parts[0];
  const tld = "." + result.tld;

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-5 py-4 rounded-2xl"
      style={{ background: result.available ? `${color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${result.available ? `${color}25` : BORDER}` }}>

      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: result.available ? `${color}18` : "rgba(255,255,255,0.05)" }}>
        {result.available
          ? <Check className="w-4 h-4" style={{ color }} />
          : <X className="w-4 h-4 text-zinc-700" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-white">{sld}</span>
          <span className="text-sm font-black" style={{ color }}>{tld}</span>
        </div>
        <p className="text-[10px] text-zinc-700">{result.available ? "Available" : "Taken"}</p>
      </div>

      {result.available && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-black text-white">${result.price.toFixed(2)}</p>
            <p className="text-[9px] text-zinc-700">/year</p>
          </div>
          <button onClick={() => onBuy(result)} disabled={buying}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: BG }}>
            {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" />Buy</>}
          </button>
        </div>
      )}

      {!result.available && (
        <span className="text-[10px] text-zinc-700 flex-shrink-0">Unavailable</span>
      )}
    </motion.div>
  );
}

// ── Buy Modal ─────────────────────────────────────────────────────────────────

function BuyModal({ result, onClose, onSuccess }: {
  result: DomainResult;
  onClose: () => void;
  onSuccess: (domain: any) => void;
}) {
  const [years, setYears] = useState(1);
  const [step, setStep]   = useState<"checkout" | "processing" | "done">("checkout");
  const color = badge(result.tld);
  const total = (result.price * years).toFixed(2);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/domains/register", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: result.domain, years }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    },
    onSuccess: (data) => { setStep("done"); setTimeout(() => onSuccess(data), 1200); },
  });

  const buy = () => { setStep("processing"); mut.mutate(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#08080e", border: `1px solid ${color}35` }}>

        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
            <Globe className="w-4 h-4" style={{ color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">{result.domain}</p>
            <p className="text-[10px] text-zinc-600">Domain Registration</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {step === "checkout" && (
          <div className="p-6 space-y-5">
            {/* What's included */}
            <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              {[
                { icon: Shield,  text: "WHOIS privacy protection — free" },
                { icon: Lock,    text: "SSL certificate included" },
                { icon: Server,  text: "DNS management panel" },
                { icon: Zap,     text: "One-click funnel connect" },
                { icon: RefreshCw, text: "Auto-renew available" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <f.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <p className="text-xs text-zinc-400">{f.text}</p>
                </div>
              ))}
            </div>

            {/* Registration period */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Registration Period</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map(y => (
                  <button key={y} onClick={() => setYears(y)}
                    className="flex-1 py-2 rounded-xl text-xs font-black transition-colors"
                    style={{
                      background: years === y ? `${color}18` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${years === y ? `${color}40` : BORDER}`,
                      color: years === y ? color : "#71717a",
                    }}>
                    {y}yr{y > 1 ? "s" : ""}
                    {y >= 3 && <span className="block text-[8px]">{y >= 5 ? "Best value" : "Save 10%"}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-zinc-500">{result.domain} × {years} year{years > 1 ? "s" : ""}</p>
                <p className="text-xs text-zinc-400">${result.price.toFixed(2)}/yr</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm font-black text-white">Total</p>
                <p className="text-lg font-black" style={{ color }}>${total}</p>
              </div>
            </div>

            {mut.isError && <p className="text-xs text-red-400">{(mut.error as Error).message}</p>}

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={buy}
                className="flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: BG }}>
                <DollarSign className="w-3.5 h-3.5" />Buy for ${total}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${color}15`, border: `1px solid ${color}35` }}>
              <Loader2 className="w-7 h-7 animate-spin" style={{ color }} />
            </div>
            <p className="text-base font-black text-white">Registering {result.domain}</p>
            <p className="text-xs text-zinc-600">Setting up DNS, SSL, and privacy protection…</p>
          </div>
        )}

        {step === "done" && (
          <div className="p-10 flex flex-col items-center gap-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
              <Check className="w-8 h-8" style={{ color: GREEN }} />
            </motion.div>
            <p className="text-base font-black text-white">{result.domain} is yours!</p>
            <p className="text-xs text-zinc-600">Opening domain manager…</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── DNS Record Row ────────────────────────────────────────────────────────────

function DnsRow({ record, onDelete, onEdit }: {
  record: DnsRecord & { _id?: string };
  onDelete: () => void;
  onEdit: (r: DnsRecord) => void;
}) {
  const TYPE_COLORS: Record<string, string> = {
    A: "#22c55e", AAAA: "#3b82f6", CNAME: "#a855f7", MX: "#f97316",
    TXT: "#d4b461", NS: "#06b6d4", SRV: "#ef4444", CAA: "#71717a",
  };
  const color = TYPE_COLORS[record.type] || GOLD;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl group"
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}>
      <span className="text-[10px] font-black w-10 text-center py-0.5 rounded flex-shrink-0"
        style={{ background: `${color}18`, color }}>{record.type}</span>
      <span className="text-xs text-zinc-400 w-16 truncate flex-shrink-0 font-mono">{record.name}</span>
      <span className="text-xs text-zinc-500 flex-1 truncate font-mono">{record.value}</span>
      <span className="text-[9px] text-zinc-700 flex-shrink-0">{record.ttl}s</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyBtn text={record.value} />
        <button onClick={() => onEdit(record)} className="p-1 text-zinc-600 hover:text-white"><Edit3 className="w-3 h-3" /></button>
        <button onClick={onDelete} className="p-1 text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

// ── Domain Detail Panel ───────────────────────────────────────────────────────

function DomainDetail({ domain, funnels, onClose, onUpdate }: {
  domain: RegisteredDomain;
  funnels: any[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "dns" | "connect">("overview");
  const [showAddDns, setShowAddDns] = useState(false);
  const [dnsForm, setDnsForm] = useState({ type: "A", name: "@", value: "", ttl: 3600, priority: 10 });
  const qc = useQueryClient();
  const color = badge(domain.tld);

  const daysUntilExpiry = Math.ceil((new Date(domain.expires_at).getTime() - Date.now()) / 86400000);
  const records: DnsRecord[] = Array.isArray(domain.dns_records) ? domain.dns_records : [];

  const dnsMut = useMutation({
    mutationFn: async (records: DnsRecord[]) => {
      const r = await fetch(`/api/domains/registered/${domain.id}/dns`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dns_records: records }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { onUpdate(); setShowAddDns(false); },
  });

  const connectMut = useMutation({
    mutationFn: async (funnel_id: string | null) => {
      const r = await fetch(`/api/domains/registered/${domain.id}/connect-funnel`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnel_id }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => onUpdate(),
  });

  const autoRenewMut = useMutation({
    mutationFn: async (val: boolean) => {
      const r = await fetch(`/api/domains/registered/${domain.id}/auto-renew`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_renew: val }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => onUpdate(),
  });

  const addRecord = () => {
    const newRecord = { ...dnsForm };
    dnsMut.mutate([...records, newRecord]);
    setDnsForm({ type: "A", name: "@", value: "", ttl: 3600, priority: 10 });
  };

  const removeRecord = (i: number) => {
    const next = records.filter((_, idx) => idx !== i);
    dnsMut.mutate(next);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-xl h-full overflow-y-auto flex flex-col"
        style={{ background: SIDEBAR, borderLeft: `1px solid ${BORDER}` }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b sticky top-0 z-10"
          style={{ borderColor: BORDER, background: SIDEBAR }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
            <Globe className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-black text-white">{domain.domain}</p>
              <CopyBtn text={domain.domain} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
              <p className="text-[10px] text-zinc-600 capitalize">{domain.status} · expires {new Date(domain.expires_at).toLocaleDateString()}</p>
              {daysUntilExpiry < 30 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                  {daysUntilExpiry}d left!
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b px-6 gap-1" style={{ borderColor: BORDER }}>
          {[
            { id: "overview" as const, label: "Overview", icon: Globe },
            { id: "dns" as const, label: "DNS Records", icon: Server },
            { id: "connect" as const, label: "Connect Funnel", icon: Zap },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-black transition-colors relative"
              style={{ color: activeTab === t.id ? GOLD : "#52525b" }}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
              {activeTab === t.id && (
                <motion.div layoutId="domain-tab" className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: GOLD }} />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 space-y-4">

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Status", value: domain.status, color: GREEN },
                  { label: "Expires", value: `${daysUntilExpiry}d`, color: daysUntilExpiry < 30 ? "#ef4444" : GOLD },
                  { label: "Paid", value: `$${domain.price_paid}`, color: color },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <p className="text-sm font-black capitalize" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] text-zinc-700 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Nameservers */}
              <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Nameservers</p>
                  <span className="text-[9px] text-zinc-700">Point your domain here</span>
                </div>
                {(Array.isArray(domain.nameservers) ? domain.nameservers : ["ns1.oravini.com", "ns2.oravini.com"]).map((ns: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono flex-1">{ns}</span>
                    <CopyBtn text={ns} />
                  </div>
                ))}
              </div>

              {/* Auto-renew */}
              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <div>
                  <p className="text-xs font-black text-white">Auto-Renew</p>
                  <p className="text-[10px] text-zinc-600">Renew automatically before expiry</p>
                </div>
                <button onClick={() => autoRenewMut.mutate(!domain.auto_renew)}>
                  {domain.auto_renew
                    ? <ToggleRight className="w-8 h-8" style={{ color: GREEN }} />
                    : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
                </button>
              </div>

              {/* SSL & Privacy */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Lock, label: "SSL Certificate", status: "Active", color: GREEN },
                  { icon: Shield, label: "WHOIS Privacy", status: "Protected", color: GREEN },
                ].map((f, i) => (
                  <div key={i} className="p-3 rounded-xl flex items-center gap-2"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <f.icon className="w-4 h-4 flex-shrink-0" style={{ color: f.color }} />
                    <div>
                      <p className="text-[10px] font-black text-white">{f.label}</p>
                      <p className="text-[9px]" style={{ color: f.color }}>{f.status}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* View site */}
              <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-black transition-colors"
                style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}>
                <ExternalLink className="w-4 h-4" />Visit {domain.domain}
              </a>
            </div>
          )}

          {/* DNS tab */}
          {activeTab === "dns" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">DNS Records ({records.length})</p>
                <button onClick={() => setShowAddDns(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black"
                  style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}25`, color: GOLD }}>
                  <Plus className="w-3 h-3" />Add Record
                </button>
              </div>

              {/* Add record form */}
              <AnimatePresence>
                {showAddDns && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}25` }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-zinc-600 mb-1 font-bold">Type</p>
                          <select value={dnsForm.type} onChange={e => setDnsForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-white border outline-none"
                            style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}>
                            {["A","AAAA","CNAME","MX","TXT","NS","SRV","CAA"].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-600 mb-1 font-bold">Name</p>
                          <input value={dnsForm.name} onChange={e => setDnsForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-xs text-white border outline-none font-mono"
                            style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} placeholder="@" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 mb-1 font-bold">Value</p>
                        <input value={dnsForm.value} onChange={e => setDnsForm(f => ({ ...f, value: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-xs text-white border outline-none font-mono"
                          style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} placeholder="e.g. 76.76.21.21" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-zinc-600 mb-1 font-bold">TTL (seconds)</p>
                          <input type="number" value={dnsForm.ttl} onChange={e => setDnsForm(f => ({ ...f, ttl: +e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-xs text-white border outline-none font-mono"
                            style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} />
                        </div>
                        {dnsForm.type === "MX" && (
                          <div>
                            <p className="text-[9px] text-zinc-600 mb-1 font-bold">Priority</p>
                            <input type="number" value={dnsForm.priority} onChange={e => setDnsForm(f => ({ ...f, priority: +e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-xs text-white border outline-none font-mono"
                              style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddDns(false)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold text-zinc-500"
                          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>Cancel</button>
                        <button onClick={addRecord} disabled={!dnsForm.value || dnsMut.isPending}
                          className="flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-40"
                          style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                          {dnsMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" />Add</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Records list */}
              <div className="space-y-1.5">
                {records.map((r, i) => (
                  <DnsRow key={i} record={r}
                    onDelete={() => removeRecord(i)}
                    onEdit={() => {}} />
                ))}
                {records.length === 0 && (
                  <p className="text-xs text-zinc-700 text-center py-8">No DNS records yet. Add one above.</p>
                )}
              </div>
            </div>
          )}

          {/* Connect tab */}
          {activeTab === "connect" && (
            <div className="space-y-4">
              {domain.funnel_id && (
                <div className="p-4 rounded-xl flex items-center gap-3"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: GREEN }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white">Connected to "{domain.funnel_name}"</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">/{domain.funnel_slug}</p>
                  </div>
                  <button onClick={() => connectMut.mutate(null)}
                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors font-bold">Disconnect</button>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-3">
                  {domain.funnel_id ? "Switch to a different funnel" : "Select a funnel to connect"}
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {funnels.map((f: any) => (
                    <button key={f.id} onClick={() => connectMut.mutate(f.id)}
                      disabled={connectMut.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: f.id === domain.funnel_id ? "rgba(212,180,97,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${f.id === domain.funnel_id ? `${GOLD}35` : BORDER}`,
                      }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: f.id === domain.funnel_id ? `${GOLD}20` : "rgba(255,255,255,0.06)" }}>
                        {f.is_page ? <FileText className="w-3.5 h-3.5" style={{ color: GOLD }} /> : <GitBranch className="w-3.5 h-3.5" style={{ color: GOLD }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">{f.name}</p>
                        <p className="text-[9px] text-zinc-600 font-mono">/f/{f.slug}</p>
                      </div>
                      {f.id === domain.funnel_id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />}
                      {connectMut.isPending && f.id !== domain.funnel_id && <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />}
                    </button>
                  ))}
                  {funnels.length === 0 && (
                    <p className="text-xs text-zinc-700 text-center py-8">No funnels yet. Create one first.</p>
                  )}
                </div>
              </div>

              {domain.funnel_id && (
                <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">DNS Instructions</p>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Add this CNAME record at your domain registrar to point <strong className="text-white">{domain.domain}</strong> to your funnel:
                  </p>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg font-mono text-[10px]"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
                    <span className="text-zinc-500 flex-shrink-0">CNAME</span>
                    <span className="text-zinc-400 flex-shrink-0">@</span>
                    <span className="text-white flex-1">app.oravini.com</span>
                    <CopyBtn text="app.oravini.com" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Managed domain card ───────────────────────────────────────────────────────

function ManagedCard({ domain, onClick, onDelete }: {
  domain: RegisteredDomain;
  onClick: () => void;
  onDelete: () => void;
}) {
  const color = badge(domain.tld);
  const daysLeft = Math.ceil((new Date(domain.expires_at).getTime() - Date.now()) / 86400000);
  const expiring = daysLeft < 30;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden cursor-pointer group"
      style={{ background: CARD, border: `1px solid ${expiring ? "rgba(239,68,68,0.3)" : `${color}22`}` }}
      onClick={onClick}>
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}50)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Globe className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-black text-white">{domain.domain}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
                <p className="text-[9px] text-zinc-600 capitalize">{domain.status}</p>
              </div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-xl text-center" style={{ background: expiring ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)" }}>
            <p className="text-xs font-black" style={{ color: expiring ? "#ef4444" : "white" }}>{daysLeft}d</p>
            <p className="text-[9px] text-zinc-700">Expiry</p>
          </div>
          <div className="p-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs font-black text-white">{(Array.isArray(domain.dns_records) ? domain.dns_records : []).length}</p>
            <p className="text-[9px] text-zinc-700">DNS</p>
          </div>
          <div className="p-2 rounded-xl text-center" style={{ background: domain.funnel_id ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)" }}>
            <p className="text-xs font-black" style={{ color: domain.funnel_id ? GREEN : "white" }}>{domain.funnel_id ? "✓" : "–"}</p>
            <p className="text-[9px] text-zinc-700">Funnel</p>
          </div>
        </div>

        {domain.funnel_name && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <Zap className="w-3 h-3" style={{ color: GREEN }} />
            <p className="text-[10px] font-bold text-zinc-400 truncate">{domain.funnel_name}</p>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            className="flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: `${color}14`, border: `1px solid ${color}22`, color }}>
            <Settings className="w-3 h-3" />Manage
          </button>
          <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="py-2 px-2.5 rounded-xl text-zinc-500 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Domains() {
  const qc = useQueryClient();
  const [tab, setTab]           = useState<Tab>("search");
  const [query, setQuery]       = useState("");
  const [submitted, setSubmitted] = useState("");
  const [buyTarget, setBuyTarget] = useState<DomainResult | null>(null);
  const [detailDomain, setDetailDomain] = useState<RegisteredDomain | null>(null);
  const [buyingDomain, setBuyingDomain] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchData, isFetching: searching } = useQuery<{ query: string; results: DomainResult[] }>({
    queryKey: ["/api/domains/search", submitted],
    queryFn: async () => {
      if (!submitted) return { query: "", results: [] };
      const r = await fetch(`/api/domains/search?q=${encodeURIComponent(submitted)}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!submitted,
    staleTime: 60000,
  });

  const { data: registered = [], isLoading: loadingManaged } = useQuery<RegisteredDomain[]>({
    queryKey: ["/api/domains/registered"],
    queryFn: async () => {
      const r = await fetch("/api/domains/registered", { credentials: "include" });
      return r.json();
    },
  });

  const { data: allFunnels = [] } = useQuery<any[]>({
    queryKey: ["/api/funnels-all-for-domains"],
    queryFn: async () => {
      const [fr, pr] = await Promise.all([
        fetch("/api/funnels", { credentials: "include" }).then(r => r.json()),
        fetch("/api/pages", { credentials: "include" }).then(r => r.json()),
      ]);
      return [...(fr || []), ...(pr || [])];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/domains/registered/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/domains/registered"] }),
  });

  const handleSearch = () => {
    const q = query.trim().toLowerCase().replace(/\..*$/, "");
    if (!q) return;
    setSubmitted(q);
    setTab("search");
  };

  const results = searchData?.results || [];
  const available  = results.filter(r => r.available);
  const taken      = results.filter(r => !r.available);

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* Header */}
      <div className="border-b" style={{ borderColor: BORDER, background: SIDEBAR }}>
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xl font-black text-white">Domain Manager</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Search, register, and manage your domains</p>
            </div>
            {registered.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Globe className="w-4 h-4" style={{ color: GREEN }} />
                <p className="text-sm font-black" style={{ color: GREEN }}>{registered.length} domain{registered.length !== 1 ? "s" : ""} owned</p>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${submitted ? `${GOLD}40` : BORDER}` }}>
              <Globe className="w-5 h-5 text-zinc-500 flex-shrink-0" />
              <input ref={inputRef} value={query}
                onChange={e => setQuery(e.target.value.replace(/\s/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search for a domain name… e.g. mybusiness"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none font-bold" />
              {query && (
                <button onClick={() => { setQuery(""); setSubmitted(""); inputRef.current?.focus(); }}
                  className="text-zinc-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button onClick={handleSearch} disabled={!query || searching}
              className="px-6 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2 disabled:opacity-40 transition-all"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Quick TLD pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TLD_POPULAR.map(tld => (
              <button key={tld} onClick={() => { const q = query || ""; setQuery(q); setSubmitted(q || "example"); }}
                className="text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: badge(tld) }}>
                .{tld}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: "search" as Tab, label: "Search Results", count: results.length },
              { id: "manage" as Tab, label: "My Domains", count: registered.length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black transition-all relative"
                style={{ color: tab === t.id ? GOLD : "#52525b" }}>
                {t.label}
                {t.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: tab === t.id ? `${GOLD}18` : "rgba(255,255,255,0.06)", color: tab === t.id ? GOLD : "#52525b" }}>
                    {t.count}
                  </span>
                )}
                {tab === t.id && (
                  <motion.div layoutId="domain-main-tab" className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: GOLD }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Search tab */}
        {tab === "search" && (
          <div>
            {!submitted && !searching && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🌐</div>
                <p className="text-lg font-black text-white mb-2">Find your perfect domain</p>
                <p className="text-sm text-zinc-600 mb-6">Search for availability across 12+ extensions</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["yourname.com", "getresults.io", "mybusiness.co", "agency.ai"].map(ex => (
                    <button key={ex} onClick={() => { const q = ex.split(".")[0]; setQuery(q); setSubmitted(q); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                      style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25`, color: GOLD }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searching && (
              <div className="flex flex-col items-center py-16 gap-4">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
                <p className="text-sm text-zinc-500">Checking availability across 12 extensions…</p>
              </div>
            )}

            {!searching && submitted && results.length > 0 && (
              <div className="space-y-6">
                {/* Available */}
                {available.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="w-4 h-4" style={{ color: GREEN }} />
                      <p className="text-sm font-black text-white">{available.length} available</p>
                    </div>
                    <div className="space-y-2">
                      {available.map((r, i) => (
                        <motion.div key={r.domain} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                          <ResultCard result={r} buying={buyingDomain === r.domain}
                            onBuy={r => setBuyTarget(r)} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Taken */}
                {taken.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <X className="w-4 h-4 text-zinc-600" />
                      <p className="text-sm font-black text-zinc-600">{taken.length} unavailable</p>
                    </div>
                    <div className="space-y-2">
                      {taken.map(r => (
                        <ResultCard key={r.domain} result={r} buying={false} onBuy={() => {}} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage tab */}
        {tab === "manage" && (
          loadingManaged
            ? <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} /></div>
            : registered.length === 0
              ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <div className="text-5xl mb-4">🌐</div>
                  <p className="text-lg font-black text-white mb-2">No domains yet</p>
                  <p className="text-sm text-zinc-600 mb-6">Search and register your first domain above</p>
                  <button onClick={() => setTab("search")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
                    <Search className="w-4 h-4" />Search Domains
                  </button>
                </div>
              )
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {registered.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <ManagedCard domain={d}
                        onClick={() => setDetailDomain(d)}
                        onDelete={() => deleteMut.mutate(d.id)} />
                    </motion.div>
                  ))}
                </div>
              )
        )}
      </div>

      {/* Buy modal */}
      <AnimatePresence>
        {buyTarget && (
          <BuyModal result={buyTarget}
            onClose={() => setBuyTarget(null)}
            onSuccess={(domain) => {
              setBuyTarget(null);
              qc.invalidateQueries({ queryKey: ["/api/domains/registered"] });
              setTab("manage");
              setDetailDomain(domain);
            }} />
        )}
      </AnimatePresence>

      {/* Domain detail panel */}
      <AnimatePresence>
        {detailDomain && (
          <DomainDetail domain={detailDomain} funnels={allFunnels}
            onClose={() => setDetailDomain(null)}
            onUpdate={() => {
              qc.invalidateQueries({ queryKey: ["/api/domains/registered"] }).then(() => {
                // Refresh the detail domain data
              });
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}
