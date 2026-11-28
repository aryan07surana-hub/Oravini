// Presenter control for the host page: push an attached offer to the live room, or hide it again.
// Uses the same owner-only endpoints as /get-paid. Viewers see the change within a few seconds.
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const KEY = "/api/whop-platform/status";
type Row = { id: string; title: string; price: number; buttonLabel: string; offerLive: boolean; active: boolean; webinarFunnelId: string | null };

export function LiveOfferControl({ funnelId }: { funnelId: string }) {
  const { data } = useQuery<{ enabled: boolean; checkouts: Row[] } | null>({ queryKey: [KEY], refetchInterval: 15_000 });
  const push = useMutation({
    mutationFn: (v: { id: string; live: boolean }) => apiRequest("POST", `/api/whop-platform/checkouts/${v.id}/push`, { live: v.live }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
  const offers = (data?.checkouts ?? []).filter((c) => c.webinarFunnelId === funnelId && c.active);
  if (!data?.enabled || offers.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111115] p-4 space-y-2" data-testid="live-offer-control">
      <p className="text-sm font-bold text-white flex items-center gap-2"><ShoppingBag className="w-4 h-4" style={{ color: "#2e78ef" }} />Live offer</p>
      <p className="text-xs text-zinc-400">Push an offer to viewers during the webinar. They see a button in the chat panel.</p>
      {offers.map((o) => (
        <div key={o.id} className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{o.title} <span className="text-zinc-400">· ${o.price.toFixed(2)}</span></p>
            <p className="text-[11px] text-zinc-400">Button: "{o.buttonLabel}"</p>
          </div>
          <button onClick={() => push.mutate({ id: o.id, live: !o.offerLive })} disabled={push.isPending} data-testid={`live-offer-${o.id}`}
            className="text-xs px-3 h-8 rounded-lg font-semibold text-white disabled:opacity-40" style={{ background: o.offerLive ? "#16a34a" : "#2e78ef" }}>
            {o.offerLive ? "Live now. Click to hide" : "Show to viewers"}
          </button>
        </div>
      ))}
    </div>
  );
}
