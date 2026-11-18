import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Globe, Link2, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";
const BORDER = "rgba(255,255,255,0.08)";

type DomainRow = {
  id: string; domain: string; status: "pending" | "verified" | "failed"; lastError: string | null; lastCheckedAt: string | null;
  renderStatus: string | null; renderAutoAttach: boolean;
  dns: { cname: { type: string; name: string; value: string }; txt: { type: string; name: string; value: string } };
  lastCheck?: { txt: { ok: boolean; error: string | null }; cname: { ok: boolean; error: string | null } } | null;
};
type ShareInfo = { slugPath: string; subdomain: string | null; subdomainUrl: string | null; wildcardEnabled: boolean; baseDomain: string; domains: DomainRow[] };

function CopyBtn({ value, testId }: { value: string; testId?: string }) {
  const { toast } = useToast();
  return (
    <button data-testid={testId} title="Copy" onClick={() => navigator.clipboard.writeText(value).then(() => toast({ title: "Copied", description: value })).catch(() => {})}
      className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
  );
}

async function api(method: string, url: string, body?: any) {
  const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `Request failed (${r.status})`);
  return data;
}

const STATUS_STYLE = {
  verified: { label: "Verified", color: "#34d399", Icon: CheckCircle2 },
  pending: { label: "Waiting for DNS", color: "#fbbf24", Icon: RefreshCw },
  failed: { label: "Not verified yet", color: "#f87171", Icon: AlertTriangle },
} as const;

export function ShareDomainPanel({ targetType, targetId, published }: { targetType: "landing_page" | "funnel"; targetId: string; published: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = [`/api/page-share/${targetType}/${targetId}`];
  const { data, isLoading, error } = useQuery<ShareInfo>({ queryKey: key, queryFn: () => api("GET", key[0]) });
  const [domainInput, setDomainInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>;
  if (error || !data) return <p className="p-4 text-sm text-red-400">Couldn't load share settings: {(error as any)?.message}</p>;

  const shareUrl = `${window.location.origin}${data.slugPath}`;
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const addDomain = async () => {
    setBusy("add");
    try { await api("POST", "/api/page-domains", { targetType, targetId, domain: domainInput }); setDomainInput(""); refresh(); toast({ title: "Domain added", description: "Add the DNS records below, then click Verify." }); }
    catch (e: any) { toast({ title: "Couldn't add domain", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const verify = async (id: string) => {
    setBusy(id);
    try {
      const row: DomainRow = await api("POST", `/api/page-domains/${id}/verify`);
      refresh();
      toast(row.status === "verified" ? { title: "Domain verified 🎉", description: row.domain } : { title: "Not verified yet", description: row.lastError || "DNS records not found", variant: "destructive" });
    } catch (e: any) { toast({ title: "Verification failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    if (!confirm("Disconnect this domain from the page?")) return;
    setBusy(id);
    try { await api("DELETE", `/api/page-domains/${id}`); refresh(); } catch (e: any) { toast({ title: "Couldn't remove", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6 text-sm" data-testid="share-panel">
      {/* Default link */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />Share link</p>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
          <span data-testid="share-url" className="flex-1 truncate font-mono text-xs text-white">{shareUrl}</span>
          <CopyBtn value={shareUrl} testId="share-copy" />
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10"><ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
        {!published && <p className="text-[11px] text-amber-400 mt-1.5">Publish the page to make this link live.</p>}
        {data.wildcardEnabled && data.subdomainUrl && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mt-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
            <span data-testid="share-subdomain-url" className="flex-1 truncate font-mono text-xs text-white">{data.subdomainUrl}</span>
            <CopyBtn value={data.subdomainUrl} />
          </div>
        )}
      </div>

      {/* Custom domains */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Custom domain <span className="normal-case font-semibold text-zinc-600">(optional — bring your own)</span></p>
        {data.domains.map(d => {
          const st = STATUS_STYLE[d.status] || STATUS_STYLE.pending;
          return (
            <div key={d.id} data-testid={`domain-${d.domain}`} className="rounded-xl p-4 mb-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-white font-bold flex-1 truncate">{d.domain}</span>
                <span data-testid="domain-status" className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: `${st.color}18`, color: st.color }}><st.Icon className="w-3 h-3" />{st.label}</span>
                <button onClick={() => remove(d.id)} disabled={busy === d.id} className="p-1.5 rounded-md text-zinc-500 hover:text-red-400" title="Disconnect"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {d.status !== "verified" && (
                <>
                  <p className="text-xs text-zinc-400">Add these two records at your domain registrar (GoDaddy, Namecheap, Cloudflare…), then click <b>Verify</b>. DNS changes can take up to an hour.</p>
                  <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${BORDER}` }}>
                    <table className="w-full text-xs" data-testid="dns-instructions">
                      <thead><tr className="text-zinc-500 text-left"><th className="p-2">Type</th><th className="p-2">Name / Host</th><th className="p-2">Value / Points to</th></tr></thead>
                      <tbody>
                        {[d.dns.cname, d.dns.txt].map(r => (
                          <tr key={r.type} className="border-t" style={{ borderColor: BORDER }}>
                            <td className="p-2 font-black text-white">{r.type}</td>
                            <td className="p-2"><div className="flex items-center gap-1"><span className="font-mono text-zinc-300 break-all">{r.name}</span><CopyBtn value={r.name} /></div></td>
                            <td className="p-2"><div className="flex items-center gap-1"><span className="font-mono text-zinc-300 break-all">{r.value}</span><CopyBtn value={r.value} /></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-zinc-600">Root domains (yourbrand.com) usually can't use CNAME — connect a subdomain like <span className="font-mono">www</span> or use your registrar's ALIAS/ANAME record.</p>
                </>
              )}
              {d.lastError && d.status !== "verified" && (
                <div data-testid="domain-error" className="flex gap-2 p-2.5 rounded-lg text-xs" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}>
                  <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{d.lastError}</span>
                </div>
              )}
              {d.status === "verified" && (
                <p className="text-xs text-emerald-400">Live at <a className="underline" href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer">https://{d.domain}</a>
                  {d.renderStatus === "attached" ? " · SSL provisioning automatically." : d.renderStatus?.startsWith("error") ? <span className="text-red-400"> · Hosting attach failed: {d.renderStatus.slice(7)}</span> : " · SSL: an Oravini admin adds this domain to hosting (manual step)."}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button data-testid="domain-verify" onClick={() => verify(d.id)} disabled={busy === d.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black disabled:opacity-50" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
                  {busy === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{d.status === "verified" ? "Re-check" : "Verify"}
                </button>
                {d.lastCheckedAt && <span className="text-[11px] text-zinc-600">Last checked {new Date(d.lastCheckedAt).toLocaleString()}</span>}
              </div>
            </div>
          );
        })}
        <div className="flex gap-2">
          <input data-testid="domain-input" value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="www.yourbrand.com"
            className="flex-1 px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }} />
          <button data-testid="domain-add" onClick={addDomain} disabled={!domainInput.trim() || busy === "add"}
            className="px-3 py-2 rounded-lg text-xs font-black disabled:opacity-40" style={{ background: GOLD, color: "#0a0910" }}>{busy === "add" ? "Adding…" : "Connect"}</button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1.5">We never buy domains for you — connect one you already own.</p>
      </div>
    </div>
  );
}

export function ShareDomainModal({ open, onClose, ...props }: { open: boolean; onClose: () => void; targetType: "landing_page" | "funnel"; targetId: string; published: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-xl max-h-[85vh] overflow-auto rounded-2xl p-5" style={{ background: "#0a0a12", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center mb-4"><p className="font-black text-white flex-1">Share & domain</p><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
        <ShareDomainPanel {...props} />
      </div>
    </div>
  );
}
