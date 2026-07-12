import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { LandingPagesContent } from "./LandingPages";
import FunnelsContent from "./Funnels";
import { Layers, LayoutTemplate, Globe, ChevronRight, Edit3, CheckCircle2, XCircle, ShieldCheck, Loader2 } from "lucide-react";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

type Tab = "funnels" | "landing" | "domains";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "funnels", label: "Funnels",       icon: Layers },
  { id: "landing", label: "Landing Pages", icon: LayoutTemplate },
  { id: "domains", label: "Domains",       icon: Globe },
];

function DomainsPanel() {
  const [, nav] = useLocation();
  const { data: funnels = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/funnels"],
    queryFn: async () => {
      const r = await fetch("/api/funnels", { credentials: "include" });
      return r.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (funnels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
          <Globe className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <p className="text-white font-black text-lg">No funnels yet</p>
        <p className="text-zinc-500 text-sm">Create a funnel first, then connect a custom domain to it.</p>
        <button
          onClick={() => nav("/pages-hub")}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
          style={{ background: `${GOLD}14`, color: GOLD, border: `1px solid ${GOLD}28` }}
        >
          Go to Funnels
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-black text-white">Custom Domains</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Connect a custom domain to any funnel. Manage DNS & SSL per funnel.</p>
      </div>

      <div className="space-y-3">
        {funnels.map((funnel: any) => (
          <div
            key={funnel.id}
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background: CARD, border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                <Layers className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">{funnel.name}</p>
                <p className="text-zinc-600 text-xs mt-0.5">/f/{funnel.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {funnel.custom_domain ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: "#22c55e14", color: "#22c55e" }}>
                  <ShieldCheck className="w-3 h-3" />{funnel.custom_domain}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-zinc-600" style={{ background: "rgba(255,255,255,0.04)" }}>
                  No domain
                </span>
              )}
              <button
                onClick={() => nav(`/funnels/${funnel.id}/domain`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-white/10"
                style={{ color: GOLD }}
              >
                <Edit3 className="w-3.5 h-3.5" />Manage
                <ChevronRight className="w-3 h-3 opacity-50" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-zinc-700 text-center">
        Point your domain's CNAME to <span className="font-mono text-zinc-500">cname.oravini.com</span> then click Manage to verify.
      </p>
    </div>
  );
}

export default function PagesHub() {
  const [activeTab, setActiveTab] = useState<Tab>("funnels");

  return (
    <ClientLayout>
      <div className="min-h-screen" style={{ background: BG }}>
        {/* Tab bar */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: BG }}>
          <div className="flex items-center gap-1 px-6 pt-4">
            {TABS.map(t => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all relative"
                  style={{
                    color: active ? GOLD : "#71717a",
                    background: active ? `${GOLD}0d` : "transparent",
                    borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "funnels"  && <FunnelsContent />}
        {activeTab === "landing"  && <LandingPagesContent />}
        {activeTab === "domains"  && <DomainsPanel />}
      </div>
    </ClientLayout>
  );
}
