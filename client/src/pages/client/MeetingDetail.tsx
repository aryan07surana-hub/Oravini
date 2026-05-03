import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { ArrowLeft, Calendar, Users, CheckSquare, Zap, FileText, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

const GOLD = "#d4b461";

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function MeetingDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const { data: meeting, isLoading } = useQuery<any>({
    queryKey: ["/api/meetings", id],
    queryFn: () => fetch(`/api/meetings/${id}`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: (data) => (data as any)?.status === "processing" ? 3000 : false,
  });

  if (isLoading) return (
    <ClientLayout>
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
      </div>
    </ClientLayout>
  );

  if (!meeting || meeting.message) return (
    <ClientLayout>
      <div className="min-h-screen flex items-center justify-center text-zinc-500">Meeting not found</div>
    </ClientLayout>
  );

  const processing = meeting.status === "processing";
  const failed = meeting.status === "failed";
  const actionItems: string[] = meeting.actionItems || [];
  const keyMoments: { text: string }[] = meeting.keyMoments || [];

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Back */}
          <button
            onClick={() => navigate("/meetings")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-8"
            data-testid="btn-back-meetings"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Meetings
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-3">{meeting.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              {meeting.meetingDate && (
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(meeting.meetingDate)}</span>
              )}
              {meeting.participants && (
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{meeting.participants}</span>
              )}
            </div>
          </div>

          {/* Processing / Failed states */}
          {processing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${GOLD}15` }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
              </div>
              <p className="text-white font-bold mb-1">Generating your notes…</p>
              <p className="text-zinc-500 text-sm">This usually takes 15–30 seconds. The page will update automatically.</p>
            </div>
          )}

          {failed && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(248,113,113,0.1)" }}>
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-white font-bold mb-1">Processing failed</p>
              <p className="text-zinc-500 text-sm">The AI couldn't process this meeting. Please try again with a clearer recording or transcript.</p>
            </div>
          )}

          {meeting.status === "ready" && (
            <div className="space-y-5">

              {/* Summary */}
              {meeting.summary && (
                <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4" style={{ color: GOLD }} />
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Summary</p>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{meeting.summary}</p>
                </div>
              )}

              {/* Action Items */}
              {actionItems.length > 0 && (
                <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Action Items</p>
                  </div>
                  <ul className="space-y-2.5">
                    {actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                          <span className="text-[9px] font-bold text-emerald-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Moments */}
              {keyMoments.length > 0 && (
                <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-violet-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Key Moments</p>
                  </div>
                  <div className="space-y-3">
                    {keyMoments.map((km, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: "#a78bfa" }} />
                        <p className="text-sm text-zinc-300 leading-relaxed">{km.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript toggle */}
              {meeting.rawTranscript && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <button
                    data-testid="btn-toggle-transcript"
                    onClick={() => setTranscriptOpen(o => !o)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Full Transcript</p>
                    </div>
                    <ChevronDown
                      className="w-4 h-4 text-zinc-600 transition-transform duration-200"
                      style={{ transform: transcriptOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  {transcriptOpen && (
                    <div className="px-6 pb-6 pt-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono">{meeting.rawTranscript}</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </ClientLayout>
  );
}
