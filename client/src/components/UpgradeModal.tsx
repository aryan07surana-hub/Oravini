import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ArrowUpRight, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getNextPlan, getPlanLabel, getPlanCredits, getPlanColor } from "@shared/planConfig";

const GOLD = "#d4b461";

const UPGRADE_PERKS: Record<string, string[]> = {
  starter: ["150 credits / month", "Full access to all tools", "AI Content Ideas & Coach", "Competitor Analysis", "Carousel Studio", "Content Analyser"],
  growth:  ["350 credits / month", "Everything in Starter", "Priority access to new tools", "AI Video Editor", "Brand Kit Builder", "ICP & SOP Generators"],
  pro:     ["700 credits / month", "Everything in Growth", "Maximum credit headroom", "Heaviest AI tools at scale", "Lead Magnet Generator", "Story Generator"],
};

export default function UpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handler = (e: Event) => {
      setDetail((e as CustomEvent).detail);
      setOpen(true);
    };
    window.addEventListener("oravini:credits-exhausted", handler);
    return () => window.removeEventListener("oravini:credits-exhausted", handler);
  }, []);

  const currentPlan = (user as any)?.plan ?? "free";
  const nextPlan = getNextPlan(currentPlan);
  const nextLabel = nextPlan ? getPlanLabel(nextPlan) : null;
  const nextCredits = nextPlan ? getPlanCredits(nextPlan) : null;
  const nextColor = nextPlan ? getPlanColor(nextPlan) : GOLD;
  const perks = nextPlan ? (UPGRADE_PERKS[nextPlan] ?? []) : [];
  const currentTotal = detail?.balance
    ? (detail.balance.monthlyCredits ?? 0) + (detail.balance.bonusCredits ?? 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border border-zinc-800 bg-zinc-950 text-white p-0 overflow-hidden">
        <div style={{ background: "linear-gradient(135deg, rgba(212,180,97,0.08) 0%, transparent 60%)", borderBottom: "1px solid rgba(212,180,97,0.15)" }} className="px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)" }}>
                <Zap className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Out of credits</DialogTitle>
                <p className="text-xs text-zinc-500 mt-0.5">You have {currentTotal} credit{currentTotal !== 1 ? "s" : ""} remaining</p>
              </div>
            </div>
          </DialogHeader>

          {detail?.message && (
            <p className="text-sm text-zinc-400 leading-relaxed">{detail.message}</p>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {nextPlan ? (
            <>
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${nextColor}30`, background: `${nextColor}08` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: nextColor }}>{nextLabel} Plan</span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${nextColor}15`, color: nextColor }}>
                    {nextCredits?.toLocaleString()} credits / mo
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: nextColor }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full font-semibold text-sm h-10"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#1a1200", border: "none" }}
                onClick={() => { setOpen(false); navigate("/settings/plan"); }}
                data-testid="upgrade-modal-upgrade-btn"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Upgrade to {nextLabel}
              </Button>
            </>
          ) : (
            <p className="text-sm text-zinc-400">You're on the highest plan. Top up with bonus credits to keep going.</p>
          )}

          <Button
            variant="outline"
            className="w-full font-medium text-sm h-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => { setOpen(false); navigate("/credits"); }}
            data-testid="upgrade-modal-buy-credits-btn"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy bonus credits instead
          </Button>

          <button
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
            onClick={() => setOpen(false)}
            data-testid="upgrade-modal-dismiss"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
