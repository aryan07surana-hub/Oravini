import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Globe, Link2, CheckCircle2, XCircle, Loader2,
  Copy, ExternalLink, Trash2, RefreshCw, AlertTriangle, Info,
  ShieldCheck, Zap,
} from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";
const SIDEBAR_BG = "#06060b";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

type DomainRecord = {
  id: string;
  funnel_id: string;
  domain: string;
  dns_verified: boolean;
  ssl_status: string;
  verified_at: string | null;
  created_at: string;
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
      style={{ background: "rgba(255,255,255,0.06)", color: copied ? "#22c55e" : "#71717a" }}>
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StatusBadge({ verified, sslStatus }: { verified: boolean; sslStatus: string }) {
  if (verified && sslStatus === "active") return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: "#22c55e14", color: "#22c55e" }}>
      <ShieldCheck className="w-3 h-3" />Live · SSL Active
    </span>
  );
  if (verified) return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: `${GOLD}14`, color: GOLD }}>
      <CheckCircle2 className="w-3 h-3" />DNS Verified
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
      <XCircle className="w-3 h-3" />Pending Verification
    </span>
  );
}

export default function FunnelDomain() {
  const [, params] = useRoute("/funnels/:id/domain");
  const id = params?.id ?? "";
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const { data: funnel } = useQuery<any>({
    queryKey: [`/api/funnels/${id}`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!id,
  });

  const { data: domain, isLoading } = useQuery<DomainRecord | null>({
    queryKey: [`/api/funnels/${id}/domain`],
    queryFn: async () => {
      const r = await fetch(`/api/funnels/${id}/domain`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [`/api/funnels/${id}/domain`] });

  const saveMut = useMutation({
    mutationFn: async (domain: string) => {
      const r = await fetch(`/api/funnels/${id}/domain`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: () => { invalidate(); setDomainInput(""); },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await fetch(`/api/funnels/${id}/domain`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => { invalidate(); setVerifyResult(null); },
  });

  const verifyMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/funnels/${id}/domain/verify`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: (data) => { setVerifyResult(data); invalidate(); },
  });

  const appHost = window.location.hostname;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Topbar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: PANEL_BORDER, background: SIDEBAR_BG }}>
        <button onClick={() => nav(`/funnels/${id}/edit`)} className="text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-black text-white">{funnel?.name || "Funnel"}</p>
          <p className="text-[10px] text-zinc-600">Custom Domain</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Current domain card */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : domain ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl space-y-5" style={{ background: CARD, border: `1px solid ${domain.dns_verified ? `${GOLD}25` : PANEL_BORDER}` }}>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: domain.dns_verified ? `${GOLD}14` : "rgba(255,255,255,0.05)" }}>
                  <Globe className="w-5 h-5" style={{ color: domain.dns_verified ? GOLD : "#52525b" }} />
                </div>
                <div>
                  <p className="text-base font-black text-white">{domain.domain}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    Added {new Date(domain.created_at).toLocaleDateString()}
                    {domain.verified_at && ` · Verified ${new Date(domain.verified_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <StatusBadge verified={domain.dns_verified} sslStatus={domain.ssl_status} />
            </div>

            {domain.dns_verified && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#22c55e08", border: "1px solid #22c55e18" }}>
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-400">Domain is live</p>
                  <p className="text-[10px] text-zinc-600">Visitors to <span className="text-white font-bold">https://{domain.domain}</span> see your funnel</p>
                </div>
                <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">
                  <ExternalLink className="w-3 h-3" />Visit
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => verifyMut.mutate()} disabled={verifyMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-colors"
                style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}25`, color: GOLD }}>
                {verifyMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {domain.dns_verified ? "Re-verify DNS" : "Verify DNS"}
              </button>
              <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                {deleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove
              </button>
            </div>

            {/* Verify result */}
            <AnimatePresence>
              {verifyResult && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl"
                  style={{ background: verifyResult.ok ? "#22c55e08" : "rgba(239,68,68,0.08)", border: `1px solid ${verifyResult.ok ? "#22c55e20" : "rgba(239,68,68,0.2)"}` }}>
                  <div className="flex items-start gap-2">
                    {verifyResult.ok
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-xs font-black" style={{ color: verifyResult.ok ? "#22c55e" : "#f87171" }}>
                        {verifyResult.ok ? "Verified!" : "DNS not found"}
                      </p>
                      {verifyResult.error && <p className="text-[10px] text-zinc-500 mt-0.5">{verifyResult.error}</p>}
                      {verifyResult.message && <p className="text-[10px] text-zinc-400 mt-0.5">{verifyResult.message}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Add domain form */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}14` }}>
                <Link2 className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Connect a Custom Domain</p>
                <p className="text-[10px] text-zinc-600">Serve your funnel from your own domain or subdomain</p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${PANEL_BORDER}` }}>
                  <span className="text-zinc-700 text-sm mr-1">https://</span>
                  <input
                    value={domainInput}
                    onChange={e => setDomainInput(e.target.value)}
                    placeholder="funnel.yourdomain.com"
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                    onKeyDown={e => e.key === "Enter" && domainInput && saveMut.mutate(domainInput)}
                  />
                </div>
              </div>
              <button onClick={() => saveMut.mutate(domainInput)} disabled={!domainInput || saveMut.isPending}
                className="px-5 py-3 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}cc)`, color: BG }}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </button>
            </div>
            {saveMut.isError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />{(saveMut.error as Error).message}
              </p>
            )}
          </motion.div>
        )}

        {/* DNS Setup Instructions */}
        <div className="p-6 rounded-2xl space-y-4" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4" style={{ color: GOLD }} />
            <p className="text-sm font-black text-white">DNS Setup Instructions</p>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            Add a <span className="text-white font-bold">CNAME record</span> in your DNS provider pointing your domain to this server. Use Cloudflare (recommended) for automatic SSL — enable the orange cloud proxy.
          </p>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PANEL_BORDER}` }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${PANEL_BORDER}` }}>
                  {["Type", "Name", "Value", "TTL"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-black" style={{ background: "#3b82f614", color: "#3b82f6" }}>CNAME</span></td>
                  <td className="px-4 py-3 text-white font-bold">{domain?.domain?.split(".")[0] || "funnel"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-300">{appHost}</span>
                      <CopyBtn text={appHost} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">Auto</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SSL options */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              {
                icon: "🟠",
                title: "Cloudflare (Recommended)",
                desc: "Free SSL/TLS, DDoS protection, CDN. Enable Proxied (orange cloud) on your CNAME record.",
                color: "#f97316",
              },
              {
                icon: "🔒",
                title: "Other DNS Providers",
                desc: "Use Let's Encrypt via Caddy or Certbot on your server. Point CNAME then configure your reverse proxy.",
                color: "#a855f7",
              },
            ].map(opt => (
              <div key={opt.title} className="p-3 rounded-xl" style={{ background: `${opt.color}08`, border: `1px solid ${opt.color}18` }}>
                <p className="text-xs font-black text-white mb-1">{opt.icon} {opt.title}</p>
                <p className="text-[10px] text-zinc-600 leading-relaxed">{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How custom domain routing works */}
        <div className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${PANEL_BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: GOLD }} />
            <p className="text-xs font-black text-white">How it works</p>
          </div>
          <div className="space-y-2">
            {[
              { step: "1", text: "Visitor goes to your custom domain" },
              { step: "2", text: "Browser resolves CNAME → Oravini server" },
              { step: "3", text: "Server identifies your funnel by domain" },
              { step: "4", text: "First funnel step loads automatically at /" },
              { step: "5", text: "Step navigation uses /:stepSlug paths" },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: `${GOLD}14`, color: GOLD }}>{s.step}</div>
                <p className="text-xs text-zinc-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Default URL always works */}
        <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${PANEL_BORDER}` }}>
          <Info className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Your funnel always works at{" "}
            <span className="text-zinc-400 font-bold">{window.location.origin}/f/{funnel?.slug || "your-slug"}</span>{" "}
            — the custom domain is an optional alias that works in parallel.
          </p>
        </div>
      </div>
    </div>
  );
}
