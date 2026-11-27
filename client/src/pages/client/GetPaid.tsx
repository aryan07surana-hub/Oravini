import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck, Wallet, Link2, PauseCircle, PlayCircle } from "lucide-react";
import ClientLayout from "@/components/layout/ClientLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";
const KEY = "/api/whop-platform/status";
const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };
const input = "w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500";

type CheckoutRow = {
  id: string; code: string; title: string; description: string | null; price: number; currency: string;
  feeCents: number; sellerReceivesCents: number; redirectUrl: string | null; buttonColor: string | null;
  webinarFunnelId: string | null; active: boolean; link: string; sales: number;
};
type Status = {
  enabled: boolean; sandbox: boolean; feePercent: number;
  account: { status: string } | null; checkouts: CheckoutRow[];
  totals: { sales: number; grossCents: number; feeCents: number };
};

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
// Same rule as the server: 1.5%, rounded to the cent, at least 1 cent.
const feeFor = (price: number) => Math.max(1, Math.round((Math.round(price * 100) * 150) / 10_000));
// Whop card fee shown as an estimate: 2.7% + $0.30 (domestic cards).
const whopFeeFor = (price: number) => Math.round(Math.round(price * 100) * 0.027) + 30;

async function post(method: string, url: string, body?: unknown) {
  // apiRequest already returns parsed JSON.
  return apiRequest(method, url, body);
}

export function FeeNotice({ compact }: { compact?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-xs leading-relaxed text-zinc-300" style={{ background: "rgba(212,180,97,0.08)", border: `1px solid ${GOLD}40` }} data-testid="fee-notice">
      <p className="font-semibold text-white mb-0.5">Fees, in plain words</p>
      <p>
        Oravini takes <b>1.5%</b> of every sale. Whop also charges its own card fee (about 2.7% + $0.30 in the US), paid from the seller's side.
        {!compact && " Buyers pay the price you set. The money goes straight to your Whop account. Oravini never holds it."}
      </p>
    </div>
  );
}

function NewCheckout({ funnels, onDone }: { funnels: { id: string; title: string }[]; onDone: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [buttonColor, setButtonColor] = useState("#d4b461");
  const [funnelId, setFunnelId] = useState("");
  const p = Number(price);
  const valid = title.trim().length >= 2 && Number.isFinite(p) && p >= 1 && p <= 5000;
  const fee = valid ? feeFor(p) : 0;
  const whop = valid ? whopFeeFor(p) : 0;
  const create = useMutation({
    mutationFn: () => post("POST", "/api/whop-platform/checkouts", {
      title: title.trim(), description: description.trim() || null, price: p,
      redirectUrl: redirectUrl.trim() || "", buttonColor, webinarFunnelId: funnelId || "",
    }),
    onSuccess: (r: any) => {
      if (!r?.checkout) throw new Error(r?.message || "Could not save");
      queryClient.invalidateQueries({ queryKey: [KEY] });
      setTitle(""); setDescription(""); setPrice(""); setRedirectUrl(""); setFunnelId("");
      toast({ title: "Checkout link created", description: "Copy it from the list below." });
      onDone();
    },
    onError: (e: any) => toast({ title: "Could not create", description: e?.message, variant: "destructive" }),
  });
  return (
    <div className="rounded-2xl p-5 space-y-4" style={card} data-testid="new-checkout">
      <p className="text-sm font-bold text-white">New checkout link</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs text-zinc-400 space-y-1">Product name
          <input className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="VIP coaching call" data-testid="input-checkout-title" />
        </label>
        <label className="text-xs text-zinc-400 space-y-1">Price (USD, one-time)
          <input className={input} value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="97" data-testid="input-checkout-price" />
        </label>
      </div>
      <label className="text-xs text-zinc-400 space-y-1 block">Description (shown to the buyer)
        <textarea className={input} rows={2} value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
      </label>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-xs text-zinc-400 space-y-1 sm:col-span-2">After payment, send buyers to (optional https link)
          <input className={input} value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://yourpage.com/thanks" />
        </label>
        <label className="text-xs text-zinc-400 space-y-1">Button colour
          <input type="color" className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-700" value={buttonColor} onChange={e => setButtonColor(e.target.value)} />
        </label>
      </div>
      {funnels.length > 0 && (
        <label className="text-xs text-zinc-400 space-y-1 block">Show as an offer banner in this webinar's live room (optional)
          <select className={input} value={funnelId} onChange={e => setFunnelId(e.target.value)} data-testid="select-checkout-webinar">
            <option value="">Not attached to a webinar</option>
            {funnels.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </label>
      )}
      {valid && (
        <div className="rounded-xl p-3 text-xs text-zinc-300 space-y-1" style={{ background: "rgba(255,255,255,0.03)" }} data-testid="fee-breakdown">
          <div className="flex justify-between"><span>Buyer pays</span><b className="text-white">{usd(Math.round(p * 100))}</b></div>
          <div className="flex justify-between"><span>Oravini fee (1.5%)</span><span>-{usd(fee)}</span></div>
          <div className="flex justify-between"><span>Whop card fee (estimate)</span><span>-{usd(whop)}</span></div>
          <div className="flex justify-between border-t border-zinc-800 pt-1"><span>You keep about</span><b className="text-emerald-400">{usd(Math.round(p * 100) - fee - whop)}</b></div>
        </div>
      )}
      <FeeNotice compact />
      <button disabled={!valid || create.isPending} onClick={() => create.mutate()} data-testid="button-create-checkout"
        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-40" style={{ background: GOLD }}>
        {create.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Create checkout link"}
      </button>
    </div>
  );
}

function Row({ c, funnels }: { c: CheckoutRow; funnels: { id: string; title: string }[] }) {
  const { toast } = useToast();
  const patch = useMutation({
    mutationFn: (b: any) => post("PATCH", `/api/whop-platform/checkouts/${c.id}`, b),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
    onError: () => toast({ title: "Could not update", variant: "destructive" }),
  });
  const copy = async () => { try { await navigator.clipboard.writeText(c.link); toast({ title: "Link copied" }); } catch { toast({ title: c.link }); } };
  return (
    <div className={`rounded-xl p-4 space-y-2 ${c.active ? "" : "opacity-60"}`} style={card} data-testid={`checkout-${c.code}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{c.title} <span className="text-zinc-500 font-normal">· ${c.price.toFixed(2)}</span></p>
          <p className="text-[11px] text-zinc-500">{c.sales} sale{c.sales === 1 ? "" : "s"} · fee to Oravini {usd(c.feeCents)} each · you receive {usd(c.sellerReceivesCents)} before Whop's fee</p>
        </div>
        <button onClick={copy} className="text-xs px-3 h-8 rounded-lg border border-zinc-700 text-zinc-200 flex items-center gap-1.5" data-testid={`copy-${c.code}`}><Copy className="w-3.5 h-3.5" />Copy link</button>
        <button onClick={() => patch.mutate({ active: !c.active })} className="text-xs px-3 h-8 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1.5">
          {c.active ? <><PauseCircle className="w-3.5 h-3.5" />Pause</> : <><PlayCircle className="w-3.5 h-3.5" />Resume</>}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 break-all flex items-center gap-1"><Link2 className="w-3 h-3" />{c.link}</p>
      {funnels.length > 0 && (
        <label className="text-[11px] text-zinc-500 flex items-center gap-2">Webinar banner:
          <select className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white" value={c.webinarFunnelId ?? ""}
            onChange={e => patch.mutate({ webinarFunnelId: e.target.value })}>
            <option value="">None</option>
            {funnels.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

export default function GetPaid() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<Status>({ queryKey: [KEY] });
  const { data: funnelData } = useQuery<{ id: string; title: string }[] | null>({ queryKey: ["/api/webinar-funnels"] });
  const funnels = useMemo(() => (funnelData ?? []).map(f => ({ id: f.id, title: f.title })), [funnelData]);
  const [busy, setBusy] = useState(false);

  // Back from Whop onboarding: mark connected, then clean the URL.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected") === "1") {
      post("POST", "/api/whop-platform/connected").then(() => queryClient.invalidateQueries({ queryKey: [KEY] })).catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const go = async (url: string) => {
    setBusy(true);
    try {
      const r = await post("POST", url);
      if (r?.url) { window.location.href = r.url; return; }
      toast({ title: "Could not continue", description: r?.message, variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Could not continue", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const acct = data?.account;
  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-5" data-testid="get-paid-page">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Wallet className="w-6 h-6" style={{ color: GOLD }} />Get paid</h1>
          <p className="text-sm text-zinc-400 mt-1">Connect your own Whop account, make checkout links, and sell inside your webinars.</p>
        </div>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
        {data && !data.enabled && (
          <div className="rounded-xl p-4 text-sm text-zinc-300" style={card}>Payments are not switched on yet. This page works as soon as Oravini turns them on.</div>
        )}
        {data?.sandbox && data.enabled && (
          <div className="rounded-xl p-3 text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10">Test mode: no real money moves. Use Whop's test cards.</div>
        )}
        <FeeNotice />

        <div className="rounded-2xl p-5 space-y-3" style={card} data-testid="connect-card">
          <div className="flex items-center gap-2">
            {acct ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldCheck className="w-5 h-5 text-zinc-400" />}
            <p className="text-sm font-bold text-white">{acct ? "Your Whop account is connected" : "Connect your Whop account"}</p>
          </div>
          <p className="text-xs text-zinc-400">
            {acct ? "Buyers pay your Whop account directly. Finish identity checks and add your payout method on Whop so you can withdraw."
              : "Whop opens a secure page to verify your identity and add a payout method. Oravini never sees your card or bank details."}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button disabled={busy || !data?.enabled} onClick={() => go("/api/whop-platform/connect")} data-testid="button-connect-whop"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-40" style={{ background: GOLD }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : acct ? "Finish setup on Whop" : "Connect with Whop"}
            </button>
            {acct && (
              <button disabled={busy} onClick={() => go("/api/whop-platform/payouts-link")} className="px-4 py-2.5 rounded-xl text-sm text-zinc-200 border border-zinc-700 flex items-center gap-1.5">
                Payouts and balance <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-3 gap-3" data-testid="totals">
            <div className="rounded-xl p-3" style={card}><p className="text-[10px] text-zinc-500 uppercase">Sales</p><p className="text-xl font-bold text-white">{data.totals.sales}</p></div>
            <div className="rounded-xl p-3" style={card}><p className="text-[10px] text-zinc-500 uppercase">Gross</p><p className="text-xl font-bold text-white">{usd(data.totals.grossCents)}</p></div>
            <div className="rounded-xl p-3" style={card}><p className="text-[10px] text-zinc-500 uppercase">Oravini fee (1.5%)</p><p className="text-xl font-bold text-white">{usd(data.totals.feeCents)}</p></div>
          </div>
        )}

        {acct && <NewCheckout funnels={funnels} onDone={() => {}} />}

        {data && data.checkouts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-white">Your checkout links</p>
            {data.checkouts.map(c => <Row key={c.id} c={c} funnels={funnels} />)}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
