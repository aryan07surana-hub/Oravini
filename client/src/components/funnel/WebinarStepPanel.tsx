import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Radio, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatIST, parseYouTubeVideoId } from "@shared/webinarFunnel";
import {
  getFunnelWebinarPhase, hasOfferCta, isoToISTInput, istInputToIso,
  type FunnelWebinarSettings, type FunnelWebinarStatus,
} from "@shared/funnelWebinar";

const GOLD = "#d4b461";
const PANEL_BORDER = "rgba(255,255,255,0.07)";
const inputCls = "w-full px-3 py-2 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none";
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" as const };

/** Editable form state (youtube is free text; parsed on save). */
export type WebinarDraft = {
  title: string; scheduledLocal: string; youtube: string; hostName: string;
  replayAvailable: boolean; offerLabel: string; offerUrl: string;
};

export function draftFromSettings(w: FunnelWebinarSettings): WebinarDraft {
  return {
    title: w.title, scheduledLocal: isoToISTInput(w.scheduledAt), youtube: w.youtubeId || "", hostName: w.hostName || "",
    replayAvailable: w.replayAvailable, offerLabel: w.offerCta?.label || "", offerUrl: w.offerCta?.url || "",
  };
}

/** Draft merged over saved settings — used for the live canvas preview. */
export function previewSettings(saved: FunnelWebinarSettings, d: WebinarDraft): FunnelWebinarSettings {
  return {
    ...saved,
    title: d.title || saved.title,
    scheduledAt: istInputToIso(d.scheduledLocal) || saved.scheduledAt,
    youtubeId: d.youtube.trim() ? parseYouTubeVideoId(d.youtube) : null,
    hostName: d.hostName,
    replayAvailable: d.replayAvailable,
    offerCta: { label: d.offerLabel, url: d.offerUrl },
  };
}

const STATUS_OPTS: { id: FunnelWebinarStatus; label: string; color: string; hint: string }[] = [
  { id: "scheduled", label: "Scheduled", color: "#34d399", hint: "Registration + countdown, goes live automatically at the start time." },
  { id: "live", label: "Live", color: "#f87171", hint: "Stream + offer CTA, right now." },
  { id: "ended", label: "Ended", color: "#a78bfa", hint: "Replay (if enabled) + offer CTA. Registration closed." },
];

const PHASE_TEXT = {
  registration: "Registration — countdown + sign-up form",
  live: "Live — YouTube stream + offer CTA",
  replay: "Replay — recording + offer CTA",
  ended: "Ended — offer CTA only (no replay)",
} as const;

async function patchWebinar(funnelId: string, stepId: string, webinar: Record<string, unknown>) {
  const r = await fetch(`/api/funnels/${funnelId}/steps/${stepId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ webinar }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || "Save failed");
  return data;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">{children}</p>;
}

export function WebinarStepPanel({ funnelId, stepId, stepName, saved, draft, setDraft, onSaved }: {
  funnelId: string;
  stepId: string;
  stepName: string;
  saved: FunnelWebinarSettings | null;
  draft: WebinarDraft | null;
  setDraft: (d: WebinarDraft) => void;
  onSaved: (row: any) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState<FunnelWebinarStatus | null>(null);

  if (!saved || !draft) {
    return (
      <div className="p-4 text-center">
        <Radio className="w-8 h-8 mx-auto mb-3" style={{ color: `${GOLD}60` }} />
        <p className="text-sm font-black text-white mb-1">Turn this step into a webinar room</p>
        <p className="text-xs text-zinc-500 mb-4">Registration, countdown, live stream and replay with your offer — all on this one funnel step.</p>
        <button data-testid="btn-enable-webinar" disabled={saving}
          onClick={async () => {
            setSaving(true);
            try { onSaved(await patchWebinar(funnelId, stepId, { title: stepName })); toast({ title: "Webinar room set up" }); }
            catch (e: any) { toast({ title: "Couldn't set up webinar", description: e.message, variant: "destructive" }); }
            finally { setSaving(false); }
          }}
          className="px-4 py-2 rounded-xl text-xs font-black disabled:opacity-50" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
          {saving ? "Setting up…" : "Set up webinar"}
        </button>
      </div>
    );
  }

  const set = (patch: Partial<WebinarDraft>) => setDraft({ ...draft, ...patch });
  const scheduledIso = istInputToIso(draft.scheduledLocal);
  const videoId = draft.youtube.trim() ? parseYouTubeVideoId(draft.youtube) : null;
  const ytInvalid = draft.youtube.trim() !== "" && !videoId;
  const urlInvalid = draft.offerUrl.trim() !== "" && !/^https?:\/\/\S+$/i.test(draft.offerUrl.trim());
  const dirty = JSON.stringify(draftFromSettings(saved)) !== JSON.stringify(draft);
  const phase = getFunnelWebinarPhase(saved);

  const save = async () => {
    if (!draft.title.trim()) return toast({ title: "Webinar title is required", variant: "destructive" });
    if (!scheduledIso) return toast({ title: "Pick a date and time", variant: "destructive" });
    if (ytInvalid) return toast({ title: "That doesn't look like a YouTube link", variant: "destructive" });
    if (urlInvalid) return toast({ title: "Offer URL must start with https://", variant: "destructive" });
    setSaving(true);
    try {
      const row = await patchWebinar(funnelId, stepId, {
        title: draft.title, scheduledAt: scheduledIso, youtubeUrl: draft.youtube.trim() || null, hostName: draft.hostName,
        replayAvailable: draft.replayAvailable, offerCta: { label: draft.offerLabel, url: draft.offerUrl.trim() },
      });
      onSaved(row);
      toast({ title: "Webinar settings saved" });
    } catch (e: any) {
      toast({ title: "Couldn't save webinar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Status flips persist immediately and only send { status } (other unsaved edits are kept).
  const flipStatus = async (status: FunnelWebinarStatus) => {
    if (status === saved.status) return;
    setStatusSaving(status);
    try {
      const row = await patchWebinar(funnelId, stepId, { status });
      onSaved(row);
      toast({ title: status === "live" ? "Webinar is LIVE" : status === "ended" ? "Webinar ended" : "Webinar scheduled",
        description: PHASE_TEXT[getFunnelWebinarPhase(row.webinar)] });
    } catch (e: any) {
      toast({ title: "Couldn't change status", description: e.message, variant: "destructive" });
    } finally { setStatusSaving(null); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: PANEL_BORDER }}>
        <Radio className="w-4 h-4" style={{ color: GOLD }} />
        <p className="text-xs font-black text-white flex-1">Webinar settings</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${PANEL_BORDER}` }}>
            {STATUS_OPTS.map(o => {
              const active = saved.status === o.id;
              return (
                <button key={o.id} data-testid={`webinar-status-${o.id}`} disabled={!!statusSaving} onClick={() => flipStatus(o.id)}
                  className="py-1.5 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-colors disabled:opacity-60"
                  style={{ background: active ? `${o.color}20` : "transparent", color: active ? o.color : "#71717a", border: `1px solid ${active ? o.color + "50" : "transparent"}` }}>
                  {statusSaving === o.id && <Loader2 className="w-3 h-3 animate-spin" />}{o.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-zinc-600 mt-1.5">{STATUS_OPTS.find(o => o.id === saved.status)?.hint} Saves instantly.</p>
          <p data-testid="webinar-visitor-phase" className="text-[11px] mt-1.5 text-zinc-400">
            <b style={{ color: GOLD }}>Visitors see:</b> {PHASE_TEXT[phase]}
          </p>
        </div>

        <div>
          <Label>Webinar title *</Label>
          <input data-testid="webinar-title" value={draft.title} onChange={e => set({ title: e.target.value })} maxLength={200} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <Label>Date &amp; time (IST) *</Label>
          <input data-testid="webinar-scheduled" type="datetime-local" value={draft.scheduledLocal} onChange={e => set({ scheduledLocal: e.target.value })} className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-zinc-600 mt-1">{scheduledIso ? formatIST(scheduledIso) : "India Standard Time (UTC+5:30)"}</p>
        </div>
        <div>
          <Label>YouTube Live URL or video ID</Label>
          <input data-testid="webinar-youtube" value={draft.youtube} onChange={e => set({ youtube: e.target.value })} placeholder="https://youtube.com/live/…" className={inputCls}
            style={ytInvalid ? { ...inputStyle, border: "1px solid rgba(248,113,113,0.5)" } : inputStyle} />
          <p className="text-[10px] mt-1">
            {draft.youtube.trim() === "" ? <span className="text-zinc-600">Used for the live stream and the replay.</span>
              : videoId ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Video ID: {videoId}</span>
              : <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" /> No video ID found</span>}
          </p>
        </div>
        <div>
          <Label>Host name</Label>
          <input data-testid="webinar-host" value={draft.hostName} onChange={e => set({ hostName: e.target.value })} maxLength={120} placeholder="Your name" className={inputCls} style={inputStyle} />
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>
            <span className="block text-xs font-bold text-white">Replay available</span>
            <span className="block text-[10px] text-zinc-600">After you mark it ended, visitors can watch the recording.</span>
          </span>
          <input data-testid="webinar-replay" type="checkbox" checked={draft.replayAvailable} onChange={e => set({ replayAvailable: e.target.checked })} className="w-4 h-4 accent-[#d4b461]" />
        </label>
        <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${PANEL_BORDER}` }}>
          <Label>Offer CTA (live + replay)</Label>
          <input data-testid="webinar-offer-label" value={draft.offerLabel} onChange={e => set({ offerLabel: e.target.value })} maxLength={120} placeholder="e.g. Join the program" className={inputCls} style={inputStyle} />
          <input data-testid="webinar-offer-url" value={draft.offerUrl} onChange={e => set({ offerUrl: e.target.value })} placeholder="https://…" className={inputCls}
            style={urlInvalid ? { ...inputStyle, border: "1px solid rgba(248,113,113,0.5)" } : inputStyle} />
          {urlInvalid && <p className="text-[10px] text-red-400">Must start with http:// or https://</p>}
          {!hasOfferCta(saved) && !draft.offerLabel && <p className="text-[10px] text-zinc-600">Leave empty to hide the button.</p>}
        </div>
      </div>

      <div className="p-3 border-t" style={{ borderColor: PANEL_BORDER }}>
        <button data-testid="webinar-save" onClick={save} disabled={saving || !dirty}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-40"
          style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : dirty ? "Save webinar settings" : "Saved"}
        </button>
      </div>
    </div>
  );
}
