import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { LandingPagesContent } from "./LandingPages";
import FunnelsContent from "./Funnels";
import { Layers, LayoutTemplate, Globe, ChevronRight, Edit3, CheckCircle2, XCircle, ShieldCheck, Loader2, Sparkles, Radio, Plus, LayoutGrid, Wand2 } from "lucide-react";
import TemplateGallery from "@/components/pages/TemplateGallery";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";
const BG = "#040406";
const CARD = "#0c0c10";

type Tab = "all" | "funnels" | "landing" | "domains";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "all",     label: "All pages",     icon: LayoutGrid },
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

// ── Unified list: funnels, AI/classic landing pages and webinar pages in one place ──
type Entry = { id: string; kind: "funnel" | "ai_page" | "landing" | "webinar"; name: string; sub: string; live: boolean; href: string; alt?: { label: string; href: string }; created: string };

const KIND_META: Record<Entry["kind"], { label: string; color: string; icon: any }> = {
  funnel:  { label: "Funnel",        color: "#d4b461", icon: Layers },
  ai_page: { label: "AI page",       color: "#a78bfa", icon: Sparkles },
  landing: { label: "Landing page",  color: "#60a5fa", icon: LayoutTemplate },
  webinar: { label: "Webinar page",  color: "#f472b6", icon: Radio },
};

function AllPagesPanel({ onTab }: { onTab: (t: Tab) => void }) {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | Entry["kind"]>("all");
  const [gallery, setGallery] = useState(false);
  const [busy, setBusy] = useState(false);
  const get = (url: string) => async () => { const r = await fetch(url, { credentials: "include" }); return r.ok ? r.json() : []; };
  const { data: funnels = [], isLoading: l1 } = useQuery<any[]>({ queryKey: ["/api/funnels"], queryFn: get("/api/funnels") });
  const { data: pages = [], isLoading: l2 } = useQuery<any[]>({ queryKey: ["/api/marketing-landing-pages"], queryFn: get("/api/marketing-landing-pages") });
  const { data: webinars = [], isLoading: l3 } = useQuery<any[]>({ queryKey: ["/api/webinar-funnels"], queryFn: get("/api/webinar-funnels") });

  const entries: Entry[] = [
    ...(Array.isArray(funnels) ? funnels : []).map((f: any): Entry => ({ id: f.id, kind: "funnel", name: f.name, sub: `/f/${f.slug} · ${f.step_count || 0} steps`, live: f.status === "active", href: `/funnels/${f.id}/edit`, created: f.created_at })),
    ...(Array.isArray(pages) ? pages : []).map((p: any): Entry => p.theme
      ? { id: p.id, kind: "ai_page", name: p.title, sub: `/lp/${p.slug}`, live: !!p.published, href: `/pages/studio/${p.id}`, created: p.created_at }
      : { id: p.id, kind: "landing", name: p.title, sub: `/lp/${p.slug}`, live: !!p.published, href: `/landing-pages/${p.id}/edit`, alt: { label: "Open in AI Studio", href: `/pages/studio/${p.id}` }, created: p.created_at }),
    ...(Array.isArray(webinars) ? webinars : []).map((w: any): Entry => ({ id: w.id, kind: "webinar", name: w.title, sub: `/w/${w.slug} · ${w.registrationCount || 0} registrations`, live: w.status === "published", href: `/tools/webinars/${w.id}`, created: w.createdAt })),
  ].sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
  const shown = filter === "all" ? entries : entries.filter(e => e.kind === filter);

  const createFromTemplate = async (templateId: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/page-studio/from-template", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId }) });
      const page = await r.json();
      if (!r.ok) throw new Error(page.message);
      nav(`/pages/studio/${page.id}`);
    } catch (e: any) { toast({ title: "Couldn't create page", description: e.message, variant: "destructive" }); setBusy(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Create */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { icon: Wand2, label: "Generate with AI", desc: "Describe it — AI designs the page", color: "#a78bfa", onClick: () => nav("/pages/new"), testId: "hub-generate" },
          { icon: LayoutTemplate, label: "From a template", desc: "14 ready-made designs", color: "#60a5fa", onClick: () => setGallery(true), testId: "hub-template" },
          { icon: Layers, label: "New funnel", desc: "Multi-step: opt-in → offer → thank you", color: GOLD, onClick: () => onTab("funnels"), testId: "hub-funnel" },
          { icon: Radio, label: "New webinar", desc: "Registration + live + replay", color: "#f472b6", onClick: () => nav("/tools/webinars/new"), testId: "hub-webinar" },
        ].map(c => (
          <button key={c.label} data-testid={c.testId} onClick={c.onClick} className="text-left p-4 rounded-2xl transition-all hover:-translate-y-0.5" style={{ background: CARD, border: `1px solid ${c.color}30` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${c.color}18` }}><c.icon className="w-4 h-4" style={{ color: c.color }} /></div>
            <p className="text-white font-black text-sm flex items-center gap-1">{c.label}<Plus className="w-3.5 h-3.5 opacity-50" /></p>
            <p className="text-zinc-500 text-xs mt-0.5">{c.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["all", "funnel", "ai_page", "landing", "webinar"] as const).map(k => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: filter === k ? `${GOLD}1c` : "rgba(255,255,255,0.03)", color: filter === k ? GOLD : "#a1a1aa", border: `1px solid ${filter === k ? GOLD + "45" : "rgba(255,255,255,0.07)"}` }}>
            {k === "all" ? `Everything (${entries.length})` : `${KIND_META[k].label}s (${entries.filter(e => e.kind === k).length})`}
          </button>
        ))}
      </div>

      {(l1 || l2 || l3) ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>
        : shown.length === 0 ? <p className="text-center text-zinc-500 text-sm py-16">Nothing here yet — generate your first page above.</p>
        : (
          <div className="space-y-2" data-testid="hub-list">
            {shown.map(e => {
              const m = KIND_META[e.kind];
              return (
                <div key={`${e.kind}-${e.id}`} data-testid={`hub-entry-${e.kind}`} className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:bg-white/[0.03]" style={{ background: CARD, border: "1px solid rgba(255,255,255,0.07)" }} onClick={() => nav(e.href)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}14`, border: `1px solid ${m.color}30` }}><m.icon className="w-4 h-4" style={{ color: m.color }} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-sm truncate">{e.name}</p>
                    <p className="text-zinc-600 text-xs mt-0.5 truncate">{e.sub}</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${m.color}14`, color: m.color }}>{m.label}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold w-16" style={{ color: e.live ? "#34d399" : "#71717a" }}>{e.live ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{e.live ? "Live" : "Draft"}</span>
                  {e.alt && <button onClick={ev => { ev.stopPropagation(); nav(e.alt!.href); }} className="text-[11px] font-bold px-2 py-1 rounded-md hover:bg-white/10" style={{ color: "#a78bfa" }}>{e.alt.label}</button>}
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              );
            })}
          </div>
        )}
      <TemplateGallery open={gallery} onClose={() => setGallery(false)} busy={busy} confirmLabel="Create page" onSelect={t => createFromTemplate(t.id)} />
    </div>
  );
}

export default function PagesHub() {
  const [activeTab, setActiveTab] = useState<Tab>("all");

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
        {activeTab === "all"      && <AllPagesPanel onTab={setActiveTab} />}
        {activeTab === "funnels"  && <FunnelsContent />}
        {activeTab === "landing"  && <LandingPagesContent />}
        {activeTab === "domains"  && <DomainsPanel />}
      </div>
    </ClientLayout>
  );
}
