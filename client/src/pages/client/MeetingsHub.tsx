import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Mic, Plus, Calendar, Clock, Users, ChevronRight, Trash2, FileText, CheckCircle, Loader2, AlertCircle
} from "lucide-react";

const GOLD = "#d4b461";

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
      <CheckCircle className="w-2.5 h-2.5" /> Ready
    </span>
  );
  if (status === "processing") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${GOLD}18`, color: GOLD }}>
      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
      <AlertCircle className="w-2.5 h-2.5" /> Failed
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function MeetingsHub() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: meetings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/meetings"],
  });

  const deleteMeeting = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting deleted" });
    },
  });

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <Mic className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <h1 className="text-2xl font-black text-white">Meetings</h1>
              </div>
              <p className="text-zinc-500 text-sm">AI-powered call notes, summaries &amp; action items</p>
            </div>
            <button
              data-testid="btn-new-meeting"
              onClick={() => navigate("/meetings/new")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: GOLD, color: "#000" }}
            >
              <Plus className="w-4 h-4" />
              New Meeting
            </button>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Mic className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-white font-bold text-lg mb-1">No meetings yet</p>
              <p className="text-zinc-500 text-sm mb-6">Upload a recording or paste a transcript to get started</p>
              <button
                onClick={() => navigate("/meetings/new")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: GOLD, color: "#000" }}
              >
                <Plus className="w-4 h-4" />
                Log your first meeting
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((m: any) => (
                <div
                  key={m.id}
                  data-testid={`meeting-card-${m.id}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer hover:scale-[1.005]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => navigate(`/meetings/${m.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}12` }}>
                    <FileText className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate">{m.title}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      {m.meetingDate && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(m.meetingDate)}</span>
                      )}
                      {m.participants && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{m.participants}</span>
                      )}
                      {m.summary && (
                        <span className="hidden sm:block truncate max-w-xs">{m.summary.slice(0, 80)}…</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      data-testid={`btn-delete-meeting-${m.id}`}
                      onClick={e => { e.stopPropagation(); if (confirm("Delete this meeting?")) deleteMeeting.mutate(m.id); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </ClientLayout>
  );
}
