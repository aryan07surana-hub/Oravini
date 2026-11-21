import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation,useSearch } from "wouter";
import ClientLayout from "@/components/webinar-funnel/WebinarWorkspaceLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatIST } from "@shared/webinarFunnel";
import {
  Plus, Radio, Copy, ExternalLink, Trash2, Users, CalendarClock, ChevronRight,
} from "lucide-react";
import { funnelDisplayStatus, relativeStart } from "@/components/webinar-funnel/eventTime";
import { EmptyState, ErrorState, PageHeader, Skeleton, StatTile, StatusBadge, btn, focusRing, iconBtn } from "@/components/webinar-funnel/ui";

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
  const scope=new URLSearchParams(useSearch()).get("section");
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery<WebinarFunnelRow[] | null>({ queryKey: ["/api/webinar-funnels"] });
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

  const now = Date.now();
  const newWebinar = () => navigate("/tools/webinars/new");
  const openWebinar=(id:string)=>navigate(scope==="registration"?`/tools/webinars/${id}/registrations`:scope==="groups"?`/tools/webinars/${id}#community`:`/tools/webinars/${id}`);

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <PageHeader
          eyebrow="Tools"
          title={scope==="registration"?"Registration pages":scope==="groups"?"Funnel & optional groups":"Webinar Funnels"}
          description={scope==="registration"?"Manage each webinar's signup page and registrations.":scope==="groups"?"Choose the optional community step after signup for each webinar. No automatic email or SMS.":"YouTube Live webinars with a registration page, countdown and offer."}
          actions={
            <button data-testid="btn-new-webinar" onClick={newWebinar} className={btn("primary", "md")}>
              <Plus className="w-4 h-4" /> New webinar
            </button>
          }
        />

        {/* Stats */}
        {list.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" data-testid="webinar-stats">
            <StatTile label="Webinars" value={list.length} />
            <StatTile label="Published" value={published} />
            <StatTile label="Upcoming" value={upcoming} />
            <StatTile label="Registrations" value={totalRegs.toLocaleString()} />
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading webinars">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px]" />)}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load your webinars" description="Check your connection and try again." onRetry={() => refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            testid="webinars-empty"
            icon={Radio}
            title="No webinars yet"
            description="Schedule a YouTube Live, share the registration link, and capture every lead. The guided setup takes you through it step by step."
            action={<button onClick={newWebinar} className={btn("primary", "md")}><Plus className="w-4 h-4" /> Create your first webinar</button>}
          />
        ) : (
          <ul className="space-y-3" aria-label="Webinars">
            {list.map(w => {
              const ds = funnelDisplayStatus(w.status, w.scheduledAt, now);
              return (
                <li key={w.id} data-testid={`webinar-card-${w.id}`} className="rounded-xl border border-white/[0.08] bg-[#111115] hover:border-white/[0.14] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
                    <button type="button" onClick={() => openWebinar(w.id)} data-testid={`btn-open-${w.id}`}
                      className={`flex-1 min-w-0 text-left rounded-lg -m-1 p-1 group ${focusRing}`} aria-label={`Manage ${w.title}`}>
                      <div className="flex items-center gap-2 mb-1.5 min-w-0">
                        <StatusBadge status={ds} testid={`status-${w.id}`} />
                        <p className="text-[15px] font-semibold text-white truncate group-hover:text-[#e6cf8f] transition-colors">{w.title}</p>
                      </div>
                      <p className="text-[13px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                        <CalendarClock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span>{formatIST(w.scheduledAt)}</span>
                        {ds === "scheduled" && <span className="text-zinc-500">· {relativeStart(w.scheduledAt, now)}</span>}
                      </p>
                      <p className="text-xs text-zinc-600 truncate mt-1">/w/{w.slug}</p>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0 border-t border-white/[0.06] pt-3 sm:border-0 sm:pt-0">
                      <button
                        onClick={() => navigate(`/tools/webinars/${w.id}/registrations`)}
                        data-testid={`btn-registrations-${w.id}`}
                        className={btn("secondary", "sm")}
                        title="View registrations"
                        aria-label={`${w.registrationCount} registrations — view list`}
                      >
                        <Users className="w-3.5 h-3.5" /> <span className="tabular-nums">{w.registrationCount}</span>
                      </button>
                      <button onClick={() => copyLink(w)} data-testid={`btn-copy-link-${w.id}`} title="Copy public link" aria-label="Copy public link" className={iconBtn()}>
                        <Copy className="w-4 h-4" />
                      </button>
                      {w.status !== "draft" && (
                        <a href={`/w/${w.slug}`} target="_blank" rel="noopener noreferrer" title="Open public page" aria-label="Open public page in a new tab" className={iconBtn()}>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => { if (confirm(`Delete "${w.title}" and all ${w.registrationCount} registrations? This can't be undone.`)) deleteMutation.mutate(w.id); }}
                        title="Delete" aria-label={`Delete ${w.title}`} data-testid={`btn-delete-${w.id}`}
                        className={iconBtn("danger")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="flex-1 sm:hidden" />
                      <button onClick={() => openWebinar(w.id)} title="Edit" data-testid={`btn-edit-${w.id}`} className={btn("secondary", "sm")}>
                        {scope==="registration"?"Registrations":scope==="groups"?"Configure flow":"Manage"} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ClientLayout>
  );
}
