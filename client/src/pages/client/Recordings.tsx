import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Film, Play, Link2, Check, BarChart2, Trash2, Globe, Lock, Clock, Eye, Search, Download, Calendar, Loader2,
} from "lucide-react";

const GOLD = "#d4b461";

type Recording = {
  id: string;
  webinarId: string | null;
  title: string;
  recordingUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  fileSize: string | null;
  shareToken: string | null;
  views: number;
  isPublic: boolean;
  createdAt: string | null;
  webinarTitle?: string | null;
  webinarDate?: string | null;
};

function fmtDuration(secs: number | null | undefined): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtSize(size: string | null): string | null {
  if (!size) return null;
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return size;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  return `${Math.round(n / 1e3)} KB`;
}

function shareUrl(rec: Recording): string | null {
  if (!rec.shareToken) return null;
  return `${window.location.origin}/r/${rec.shareToken}`;
}

/** Thumbnail if we have one; otherwise the first frame of the video itself. */
function Thumb({ rec }: { rec: Recording }) {
  const [failed, setFailed] = useState(false);
  if (rec.thumbnailUrl && !failed) {
    return <img src={rec.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />;
  }
  if (!failed) {
    return (
      <video
        src={`${rec.recordingUrl}#t=1`}
        preload="metadata"
        muted
        playsInline
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(circle at 30% 20%, ${GOLD}18, transparent 60%), #0b0b0f` }}>
      <Film className="w-10 h-10" style={{ color: `${GOLD}50` }} />
    </div>
  );
}

function RecordingCard({
  rec, onWatch, onTogglePublic, onDelete, toggling,
}: {
  rec: Recording;
  onWatch: () => void;
  onTogglePublic: () => void;
  onDelete: () => void;
  toggling: boolean;
}) {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = shareUrl(rec);
  const date = rec.webinarDate || rec.createdAt;

  const copy = async () => {
    if (!rec.isPublic || !url) {
      toast({ title: "Recording is private", description: "Make it public first to share a link." });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Couldn't copy", description: url });
    }
  };

  return (
    <div className="group rounded-3xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "linear-gradient(180deg, #0f0f14 0%, #0a0a0e 100%)", border: `1px solid ${GOLD}16` }}>
      {/* Thumbnail */}
      <button onClick={onWatch} className="relative aspect-video overflow-hidden bg-black text-left" aria-label={`Watch ${rec.title}`}>
        <Thumb rec={rec} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl" style={{ background: GOLD }}>
            <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
        <span className="absolute bottom-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>
          {fmtDuration(rec.duration)}
        </span>
        <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-full"
          style={rec.isPublic
            ? { background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }
            : { background: "rgba(0,0,0,0.6)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.1)" }}>
          {rec.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {rec.isPublic ? "Public" : "Private"}
        </span>
      </button>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-white font-black tracking-tight leading-snug line-clamp-2">{rec.title}</h3>
        {rec.webinarTitle && rec.webinarTitle !== rec.title && (
          <p className="text-[11px] text-zinc-500 mt-1 truncate">from {rec.webinarTitle}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap mt-3 text-[11px] text-zinc-500">
          {date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(date), "MMM d, yyyy")}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(rec.duration)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{rec.views ?? 0}</span>
          {fmtSize(rec.fileSize) && <span>{fmtSize(rec.fileSize)}</span>}
        </div>

        <div className="mt-auto pt-5 flex items-center gap-2 flex-wrap">
          <button onClick={onWatch}
            className="flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl"
            style={{ background: GOLD, color: "#0a0a0a" }}>
            <Play className="w-3.5 h-3.5" fill="currentColor" /> Watch
          </button>
          <button onClick={copy}
            title={rec.isPublic ? "Copy public share link" : "Make public to share"}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            style={{
              background: rec.isPublic ? `${GOLD}14` : "rgba(255,255,255,0.03)",
              color: rec.isPublic ? GOLD : "#52525b",
              border: `1px solid ${rec.isPublic ? `${GOLD}30` : "rgba(255,255,255,0.06)"}`,
            }}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Share link"}
          </button>
          {rec.webinarId && (
            <button onClick={() => nav(`/webinar-studio/${rec.webinarId}/analytics`)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-zinc-300 hover:text-white"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <BarChart2 className="w-3.5 h-3.5" /> View analytics
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={onTogglePublic} disabled={toggling}
            className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400 hover:text-white disabled:opacity-50">
            <span className="relative w-8 h-[18px] rounded-full transition-colors" style={{ background: rec.isPublic ? GOLD : "rgba(255,255,255,0.12)" }}>
              <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all" style={{ left: rec.isPublic ? 16 : 2 }} />
            </span>
            {rec.isPublic ? "Anyone with the link can watch" : "Only you can watch"}
          </button>
          <div className="flex items-center gap-1">
            <a href={rec.recordingUrl} target="_blank" rel="noopener noreferrer" download
              className="p-2 rounded-lg text-zinc-500 hover:text-white" aria-label="Download">
              <Download className="w-3.5 h-3.5" />
            </a>
            <button onClick={onDelete} className="p-2 rounded-lg text-zinc-600 hover:text-red-400" aria-label="Delete recording">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Recordings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const [query, setQuery] = useState("");
  const [watching, setWatching] = useState<Recording | null>(null);

  const { data: recordings = [], isLoading } = useQuery<Recording[]>({ queryKey: ["/api/recordings"] });

  const togglePublic = useMutation({
    mutationFn: (rec: Recording) => apiRequest("PATCH", `/api/recordings/${rec.id}`, { isPublic: !rec.isPublic }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/recordings"] }),
    onError: (e: any) => toast({ title: "Couldn't update recording", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/recordings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recordings"] });
      toast({ title: "Recording deleted" });
    },
    onError: (e: any) => toast({ title: "Couldn't delete recording", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recordings;
    return recordings.filter(r => `${r.title} ${r.webinarTitle || ""}`.toLowerCase().includes(q));
  }, [recordings, query]);

  const totalSeconds = recordings.reduce((s, r) => s + (r.duration || 0), 0);
  const totalViews = recordings.reduce((s, r) => s + (r.views || 0), 0);
  const publicCount = recordings.filter(r => r.isPublic).length;

  return (
    <ClientLayout>
      <div className="min-h-screen relative" style={{ background: "#040406" }}>
        <div className="absolute inset-x-0 top-0 h-80 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${GOLD}0e 0%, transparent 70%)` }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: `${GOLD}80` }}>Storage room</p>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">Recordings</h1>
              <p className="text-sm text-zinc-500 mt-2 max-w-xl">
                Every webinar replay in one place. Watch, share a public link, or jump into the session's analytics.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Recordings", value: recordings.length },
                { label: "Hours stored", value: (totalSeconds / 3600).toFixed(1) },
                { label: "Public / views", value: `${publicCount} / ${totalViews}` },
              ].map(s => (
                <div key={s.label} className="rounded-2xl px-4 py-3 min-w-[110px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}14` }}>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{s.label}</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: GOLD }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {recordings.length > 0 && (
            <div className="relative max-w-sm mb-8">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search recordings…"
                className="pl-9 bg-white/[0.02] border-white/10 text-white placeholder:text-zinc-600" />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : recordings.length === 0 ? (
            <div className="rounded-3xl p-14 text-center" style={{ border: `1px dashed ${GOLD}30`, background: "rgba(255,255,255,0.01)" }}>
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                <Film className="w-6 h-6" style={{ color: GOLD }} />
              </div>
              <p className="text-white font-black text-lg">No recordings yet</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
                Recordings show up here after a webinar — uploaded from the studio, or recorded automatically when LiveKit recording storage is configured.
              </p>
              <button onClick={() => nav("/video-marketing")}
                className="mt-6 text-xs font-black px-4 py-2.5 rounded-xl" style={{ background: GOLD, color: "#0a0a0a" }}>
                Go to webinars
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 py-16 text-center">No recordings match "{query}".</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(rec => (
                <RecordingCard
                  key={rec.id}
                  rec={rec}
                  onWatch={() => setWatching(rec)}
                  onTogglePublic={() => togglePublic.mutate(rec)}
                  toggling={togglePublic.isPending && togglePublic.variables?.id === rec.id}
                  onDelete={() => {
                    if (window.confirm(`Delete "${rec.title}"? This can't be undone.`)) remove.mutate(rec.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Replay player */}
      <Dialog open={!!watching} onOpenChange={open => { if (!open) setWatching(null); }}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-0" style={{ background: "#07070a", boxShadow: `0 0 0 1px ${GOLD}22, 0 30px 80px rgba(0,0,0,0.7)` }}>
          {watching && (
            <div>
              <video key={watching.id} src={watching.recordingUrl} controls autoPlay playsInline className="w-full aspect-video bg-black" />
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <DialogTitle className="text-white font-black truncate">{watching.title}</DialogTitle>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {(watching.webinarDate || watching.createdAt) ? format(new Date((watching.webinarDate || watching.createdAt)!), "MMMM d, yyyy") : ""}
                    {watching.duration ? ` · ${fmtDuration(watching.duration)}` : ""}
                  </p>
                </div>
                {watching.webinarId && (
                  <button onClick={() => nav(`/webinar-studio/${watching.webinarId}/analytics`)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0"
                    style={{ background: `${GOLD}14`, color: GOLD, border: `1px solid ${GOLD}30` }}>
                    <BarChart2 className="w-3.5 h-3.5" /> View analytics
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
