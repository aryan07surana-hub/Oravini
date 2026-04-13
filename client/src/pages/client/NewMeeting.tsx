import { useState, useRef } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Upload, FileText, Loader2, Mic, X, CheckCircle } from "lucide-react";

const GOLD = "#d4b461";

export default function NewMeeting() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ".mp3,.mp4,.m4a,.wav,.ogg,.webm,.mov";

  async function handleSubmit() {
    if (!title.trim()) { toast({ title: "Please enter a meeting title", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      let result: any;
      if (tab === "upload") {
        if (!file) { toast({ title: "Please select an audio or video file", variant: "destructive" }); setSubmitting(false); return; }
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("title", title.trim());
        if (participants) formData.append("participants", participants.trim());
        if (meetingDate) formData.append("meetingDate", meetingDate);
        const res = await fetch("/api/meetings/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        result = await res.json();
      } else {
        if (!transcript.trim()) { toast({ title: "Please paste a transcript", variant: "destructive" }); setSubmitting(false); return; }
        result = await apiRequest("POST", "/api/meetings/transcript", {
          title: title.trim(),
          transcript: transcript.trim(),
          participants: participants.trim() || undefined,
          meetingDate: meetingDate || undefined,
        });
      }
      toast({ title: "Meeting logged — AI is generating notes…" });
      navigate(`/meetings/${result.id}`);
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
      setSubmitting(false);
    }
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* Back */}
          <button
            onClick={() => navigate("/meetings")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-8"
            data-testid="btn-back-meetings"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Meetings
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-5 h-5" style={{ color: GOLD }} />
              <h1 className="text-xl font-black text-white">Log a Meeting</h1>
            </div>
            <p className="text-zinc-500 text-sm">Upload your recording or paste a transcript — AI does the rest.</p>
          </div>

          {/* Meeting details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Meeting title <span style={{ color: GOLD }}>*</span></label>
              <input
                data-testid="input-meeting-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sales Call with John Smith"
                className="w-full text-sm text-white placeholder-zinc-600 outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 16px" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Date</label>
                <input
                  data-testid="input-meeting-date"
                  type="date"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-full text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 16px", colorScheme: "dark" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Participants</label>
                <input
                  data-testid="input-participants"
                  value={participants}
                  onChange={e => setParticipants(e.target.value)}
                  placeholder="John, Sarah, Mike…"
                  className="w-full text-sm text-white placeholder-zinc-600 outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 16px" }}
                />
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {([
              { key: "upload", label: "Upload Recording", icon: Upload },
              { key: "paste", label: "Paste Transcript", icon: FileText },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                data-testid={`tab-${key}`}
                onClick={() => setTab(key)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
                style={tab === key
                  ? { background: GOLD, color: "#000" }
                  : { color: "rgba(255,255,255,0.4)" }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Upload tab */}
          {tab === "upload" && (
            <div>
              {!file ? (
                <button
                  data-testid="btn-file-select"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl transition-all hover:border-opacity-40"
                  style={{ border: "2px dashed rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15` }}>
                    <Upload className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white mb-1">Click to upload your recording</p>
                    <p className="text-xs text-zinc-500">MP3, MP4, M4A, WAV, OGG, WebM — up to 50 MB</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          {/* Paste tab */}
          {tab === "paste" && (
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Transcript</label>
              <textarea
                data-testid="input-transcript"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Paste the full call transcript here — from Otter.ai, Google Meet captions, Zoom export, or any other source…"
                rows={12}
                className="w-full text-sm text-white placeholder-zinc-600 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "14px 16px", lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* Submit */}
          <button
            data-testid="btn-submit-meeting"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 mt-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: GOLD, color: "#000" }}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><Mic className="w-4 h-4" />Generate Notes</>}
          </button>

        </div>
      </div>
    </ClientLayout>
  );
}
