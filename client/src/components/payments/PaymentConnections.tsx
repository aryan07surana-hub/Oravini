import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ProviderId = "stripe" | "whop";

export interface PaymentConnection {
  provider: ProviderId;
  last4: string;
  mode: string | null;
  accountRef: string | null;
  connectedAt?: string;
}

export const PROVIDER_META: Record<ProviderId, { name: string; color: string }> = {
  stripe: { name: "Stripe", color: "#7c7ff0" },
  whop: { name: "Whop", color: "#dd6f22" },
};

export const CONNECTIONS_KEY = "/api/payments/connections";
export const REVENUE_KEY = "/api/payments/revenue";

export function usePaymentConnections() {
  return useQuery<{ connections: PaymentConnection[]; vaultReady: boolean }>({
    queryKey: [CONNECTIONS_KEY],
    staleTime: 30_000,
  });
}

function invalidatePayments() {
  queryClient.invalidateQueries({ queryKey: [CONNECTIONS_KEY] });
  queryClient.invalidateQueries({ queryKey: [REVENUE_KEY] });
}

const inputCls =
  "w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors";

function ConnectedRow({ conn }: { conn: PaymentConnection }) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const meta = PROVIDER_META[conn.provider];
  const disconnect = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/payments/${conn.provider}`),
    onSuccess: () => {
      invalidatePayments();
      toast({ title: `${meta.name} disconnected`, description: "The saved key was deleted." });
    },
    onError: (e: any) => toast({ title: "Could not disconnect", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40" data-testid={`payments-connected-${conn.provider}`}>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          {meta.name} connected <span className="font-mono text-zinc-400">****{conn.last4}</span>
        </p>
        <p className="text-xs text-zinc-500">
          {conn.provider === "stripe" && conn.mode === "test" && "Test mode key · "}
          {conn.provider === "whop" && conn.accountRef && `${conn.accountRef} · `}
          Read-only access
        </p>
      </div>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={disconnect.isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors disabled:opacity-50"
        data-testid={`payments-disconnect-${conn.provider}`}
      >
        {disconnect.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Disconnect
      </button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {meta.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The saved {meta.name} key (****{conn.last4}) will be deleted right away and your {meta.name} revenue will stop showing. You can connect again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => disconnect.mutate()} className="bg-red-600 hover:bg-red-700">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StripeConnectForm() {
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const connect = useMutation({
    mutationFn: () => apiRequest("POST", "/api/payments/stripe/connect", { key: key.trim() }),
    onSuccess: (r: any) => {
      setKey("");
      invalidatePayments();
      toast({ title: `Stripe connected ****${r?.connection?.last4 ?? ""}` });
    },
    onError: (e: any) => toast({ title: "Stripe key not saved", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3" data-testid="payments-connect-stripe">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Connect Stripe</p>
        <button onClick={() => setShowGuide(v => !v)} className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
          How to get a restricted key {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {showGuide && (
        <ol className="text-xs text-zinc-400 space-y-1 list-decimal pl-4">
          <li>In your Stripe dashboard, open <span className="text-zinc-200">Developers → API keys</span>.</li>
          <li>Click <span className="text-zinc-200">Create restricted key</span> and give it a name such as "Oravini".</li>
          <li>Set <span className="text-zinc-200">Read</span> permission on <span className="text-zinc-200">Charges</span>, <span className="text-zinc-200">Balance</span> and <span className="text-zinc-200">Payouts</span>. Leave everything else as None.</li>
          <li>Create the key, copy it (it starts with <span className="font-mono text-zinc-200">rk_live_</span> or <span className="font-mono text-zinc-200">rk_test_</span>) and paste it below.</li>
        </ol>
      )}
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="rk_live_..."
        className={inputCls}
        data-testid="input-stripe-key"
      />
      <button
        onClick={() => connect.mutate()}
        disabled={!key.trim() || connect.isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: PROVIDER_META.stripe.color }}
        data-testid="button-connect-stripe"
      >
        {connect.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {connect.isPending ? "Checking key with Stripe…" : "Save Stripe key"}
      </button>
    </div>
  );
}

function WhopConnectForm() {
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const connect = useMutation({
    mutationFn: () => apiRequest("POST", "/api/payments/whop/connect", { key: key.trim(), companyId: companyId.trim() }),
    onSuccess: (r: any) => {
      setKey("");
      setCompanyId("");
      invalidatePayments();
      toast({ title: `Whop connected ****${r?.connection?.last4 ?? ""}` });
    },
    onError: (e: any) => toast({ title: "Whop key not saved", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3" data-testid="payments-connect-whop">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Connect Whop</p>
        <button onClick={() => setShowGuide(v => !v)} className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
          How to get an API key {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {showGuide && (
        <ol className="text-xs text-zinc-400 space-y-1 list-decimal pl-4">
          <li>In your Whop dashboard, open your business's <span className="text-zinc-200">Developer</span> settings.</li>
          <li>Create an API key with the <span className="font-mono text-zinc-200">stats:read</span> permission. Add <span className="font-mono text-zinc-200">payment:basic:read</span> to also see individual payments.</li>
          <li>Copy the key, plus your company ID (it starts with <span className="font-mono text-zinc-200">biz_</span>), and paste both below.</li>
        </ol>
      )}
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="Whop API key"
        className={inputCls}
        data-testid="input-whop-key"
      />
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={companyId}
        onChange={e => setCompanyId(e.target.value)}
        placeholder="biz_..."
        className={inputCls}
        data-testid="input-whop-company"
      />
      <button
        onClick={() => connect.mutate()}
        disabled={!key.trim() || !companyId.trim() || connect.isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: PROVIDER_META.whop.color }}
        data-testid="button-connect-whop"
      >
        {connect.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {connect.isPending ? "Checking key with Whop…" : "Save Whop key"}
      </button>
    </div>
  );
}

/** Connect / disconnect controls for Stripe and Whop. Used in Settings and on /payments. */
export default function PaymentConnections({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = usePaymentConnections();
  const connections = data?.connections ?? [];
  const has = (p: ProviderId) => connections.some(c => c.provider === p);

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-start gap-2 text-xs text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>Keys are encrypted and only used on our server to read your revenue. Only you can see this data.</span>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
      ) : (
        <>
          {connections.map(c => <ConnectedRow key={c.provider} conn={c} />)}
          <div className={`grid gap-3 ${!has("stripe") && !has("whop") ? "sm:grid-cols-2" : ""}`}>
            {!has("stripe") && <StripeConnectForm />}
            {!has("whop") && <WhopConnectForm />}
          </div>
        </>
      )}
    </div>
  );
}

export function PaymentsIcon(props: { className?: string; style?: React.CSSProperties }) {
  return <CreditCard {...props} />;
}
