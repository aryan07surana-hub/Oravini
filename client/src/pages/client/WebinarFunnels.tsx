import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatIST } from "@shared/webinarFunnel";
import {
  Plus, Radio, Copy, ExternalLink, Trash2, Users, CalendarClock, CheckCircle2, Clock, Pencil, DollarSign,
} from "lucide-react";

const GOLD = "#d4b461";

export type WebinarFunnelRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  hostName: string | null;
  scheduledAt: string;
  youtubeVideoId: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  status: "draft" | "published" | "ended";
  createdAt: string;
  registrationCount: number;
};

export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  published: { label: "● Published", className: "bg-emerald-500/15 text-emerald-400" },
  draft: { label: "Draft", className: "bg-zinc-800 text-zinc-500" },
  ended: { label: "Ended", className: "bg-indigo-500/15 text-indigo-300" },
};

export default function WebinarFunnels() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<WebinarFunnelRow[] | null>({ queryKey: ["/api/webinar-funnels"] });
  const list = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webinar-funnels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinar-funnels"] });
      toast({ title: "Webinar deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const publicUrl = (slug: string) => `${window.location.origin}/w/${slug}`;

  const copyLink = async (w: WebinarFunnelRow) => {
    const url = publicUrl(w.slug);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: w.status === "draft" ? `${url} — publish the webinar so visitors can open it.` : url,
      });
    } catch {
      toast({ title: "Couldn't copy", description: url, variant: "destructive" });
    }
  };

  const totalRegs = list.reduce((s, w) => s + (w.registrationCount || 0), 0);
  const published = list.filter(w => w.status === "published").length;
  const upcoming = list.filter(w => new Date(w.scheduledAt).getTime() > Date.now()).length;

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
              <Radio className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Webinar Funnels</h1>
              <p className="text-xs text-zinc-500">YouTube Live webinars with a registration page, countdown & CTA</p>
            </div>
          </div>
          <button
            data-testid="btn-new-webinar"
            onClick={() => navigate("/tools/webinars/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
          >
            <Plus className="w-4 h-4" /> New Webinar
          </button>
        </div>

        {/* Stats */}
        {list.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Webinars", value: list.length, icon: Radio, color: GOLD },
              { label: "Published", value: published, icon: CheckCircle2, color: "#34d399" },
              { label: "Upcoming", value: upcoming, icon: Clock, color: "#818cf8" },
              { label: "Registrations", value: totalRegs, icon: Users, color: "#f472b6" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
                <p className="text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(212,180,97,0.08)", border: "1px solid rgba(212,180,97,0.15)" }}>
              <Radio className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <p className="text-white font-bold text-lg mb-2">No webinars yet</p>
            <p className="text-zinc-500 text-sm mb-6">Schedule a YouTube Live, share the registration link, and capture every lead.</p>
            <button onClick={() => navigate("/tools/webinars/new")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
              <Plus className="w-4 h-4" /> Create your first webinar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(w => {
              const st = STATUS_STYLES[w.status] || STATUS_STYLES.draft;
              return (
                <div key={w.id} data-testid={`webinar-card-${w.id}`} className="rounded-2xl p-5 flex items-center gap-4 flex-wrap sm:flex-nowrap" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
                    <Radio className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/tools/webinars/${w.id}`)}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{w.title}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${st.className}`}>{st.label}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {formatIST(w.scheduledAt)}</p>
                    <p className="text-[11px] text-zinc-600 truncate mt-0.5">/w/{w.slug}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/tools/webinars/${w.id}/registrations`)}
                      data-testid={`btn-registrations-${w.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)", color: "#f472b6" }}
                      title="View registrations"
                    >
                      <Users className="w-3.5 h-3.5" /> {w.registrationCount}
                    </button>
                    <button
                      onClick={() => navigate(`/tools/webinars/${w.id}/revenue`)}
                      data-testid={`btn-revenue-${w.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}35`, color: GOLD }}
                      title="Revenue dashboard"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Revenue
                    </button>
                    <button onClick={() => copyLink(w)} data-testid={`btn-copy-link-${w.id}`} title="Copy public link"
                      className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {w.status !== "draft" && (
                      <a href={`/w/${w.slug}`} target="_blank" rel="noopener noreferrer" title="Open public page"
                        className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => navigate(`/tools/webinars/${w.id}`)} title="Edit"
                      className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${w.title}" and all ${w.registrationCount} registrations? This can't be undone.`)) deleteMutation.mutate(w.id); }}
                      title="Delete" data-testid={`btn-delete-${w.id}`}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
