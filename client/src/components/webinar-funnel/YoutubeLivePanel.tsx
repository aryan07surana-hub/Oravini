import YoutubeAccessDisclosure from "./YoutubeAccessDisclosure";
// Editor panel: the host's connected YouTube channel, broadcast status, stream key (masked),
// Studio link and "Fetch replay" once the webinar has ended.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Film, Loader2, Radio, RefreshCw, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GOLD, type WebinarFunnelFull } from "./hostUtils";
import {
  LIFECYCLE_LABELS, SecretField, YOUTUBE_STATUS_KEY, startYoutubeConnect, useYoutubeConnection,
  type YoutubeBroadcastInfo, type YoutubeLiveStatus,
} from "./youtube";

export function YoutubeLivePanel({ webinar, onLinked, onReplay }: {
  webinar: WebinarFunnelFull;
  onLinked: (watchUrl: string) => void;
  onReplay: (videoId: string) => void;
}) {
  const { toast } = useToast();
  const yt = useYoutubeConnection();
  const connected = !!yt.data?.connected;
  const hasBroadcast = !!webinar.youtubeBroadcastId;
  const statusKey = [`/api/webinar-funnels/${webinar.id}/youtube/status`];
  const status = useQuery<YoutubeLiveStatus>({
    queryKey: statusKey,
    enabled: connected && hasBroadcast,
    refetchInterval: (q) => (q.state.data?.lifeCycleStatus === "complete" ? false : 20_000),
    retry: false,
  });
  const [creating, setCreating] = useState(false);
  const [fetchingReplay, setFetchingReplay] = useState(false);

  if (yt.isLoading || yt.data?.configured === false) return null;

  const refreshWebinar = () => queryClient.invalidateQueries({ queryKey: [`/api/webinar-funnels/${webinar.id}`] });

  const create = async () => {
    setCreating(true);
    try {
      const info: YoutubeBroadcastInfo = await apiRequest("POST", `/api/webinar-funnels/${webinar.id}/youtube/broadcast`, {});
      onLinked(info.watchUrl);
      await refreshWebinar();
      queryClient.invalidateQueries({ queryKey: statusKey });
      toast({ title: "Stream created on YouTube", description: "Your YouTube link is filled in and saved." });
    } catch (e: any) {
      if (e?.data?.code === "youtube_not_connected") queryClient.invalidateQueries({ queryKey: YOUTUBE_STATUS_KEY });
      toast({ title: "Couldn't create the YouTube stream", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const fetchReplay = async () => {
    setFetchingReplay(true);
    try {
      const r: { replayVideoId: string; processing: string | null } = await apiRequest("POST", `/api/webinar-funnels/${webinar.id}/youtube/replay`, {});
      onReplay(r.replayVideoId);
      await refreshWebinar();
      toast({ title: "Replay linked", description: r.processing ? "YouTube is still processing the recording — it may take a little while to play." : "Your replay page now plays the recording." });
    } catch (e: any) {
      toast({ title: "Couldn't fetch the replay", description: e.message, variant: "destructive" });
    } finally {
      setFetchingReplay(false);
    }
  };

  const st = status.data;
  const life = st?.lifeCycleStatus ? LIFECYCLE_LABELS[st.lifeCycleStatus] || { label: st.lifeCycleStatus, color: "#a1a1aa" } : null;
  const ended = webinar.status === "ended" || st?.lifeCycleStatus === "complete";

  return (
    <div className="rounded-xl p-4 space-y-3.5" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.18)" }} data-testid="yt-live-panel">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] font-bold text-white flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          {connected ? <>YouTube · <span className="text-zinc-300 font-semibold" data-testid="yt-channel-name">{yt.data?.channelTitle || "Connected channel"}</span></> : "YouTube Live"}
        </p>
        {life && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: life.color, background: `${life.color}18`, border: `1px solid ${life.color}40` }} data-testid="yt-lifecycle">
            {life.label}
          </span>
        )}
      </div>

      {!connected ? (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[12px] text-zinc-400 flex-1 min-w-[200px]">Connect your channel to create the stream from here and fetch the replay automatically.</p>
          <YoutubeAccessDisclosure/>
          <button type="button" onClick={() => startYoutubeConnect()} data-testid="btn-editor-connect-youtube"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black text-white hover:brightness-110" style={{ background: "#dc2626" }}>
            <Youtube className="w-3.5 h-3.5" /> Connect YouTube
          </button>
        </div>
      ) : !hasBroadcast ? (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[12px] text-zinc-400 flex-1 min-w-[200px]">Create an unlisted YouTube Live using this webinar's saved title and time. Save any changes first.</p>
          <button type="button" onClick={create} disabled={creating} data-testid="btn-editor-create-stream"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black disabled:opacity-50" style={{ background: GOLD, color: "#0a0910" }}>
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />} Create stream on YouTube
          </button>
        </div>
      ) : status.isLoading ? (
        <p className="text-[12px] text-zinc-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking YouTube…</p>
      ) : status.isError ? (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[12px] text-red-400 flex-1">{(status.error as any)?.message || "Couldn't reach YouTube."}</p>
          <button type="button" onClick={() => status.refetch()} className="text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retry</button>
        </div>
      ) : st ? (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-zinc-400">
            <span>Stream: <b className="text-zinc-200" data-testid="yt-stream-status">{st.streamStatus || "—"}</b></span>
            <span>Health: <b className="text-zinc-200">{st.healthStatus || "—"}</b></span>
            {st.replayVideoId && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Replay linked</span>}
          </div>
          {st.ingestionAddress && st.streamKey && (
            <div className="grid sm:grid-cols-2 gap-3">
              <SecretField label="Server (ingestion URL)" value={st.ingestionAddress} testid="editor-yt-ingestion" />
              <SecretField label="Stream key" value={st.streamKey} testid="editor-yt-stream-key" />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {st.studioUrl && (
              <a href={st.studioUrl} target="_blank" rel="noopener noreferrer" data-testid="link-yt-studio"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white hover:brightness-110" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Open YouTube Studio <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
            {ended && (
              <button type="button" onClick={fetchReplay} disabled={fetchingReplay} data-testid="btn-fetch-replay"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black disabled:opacity-50" style={{ background: GOLD, color: "#0a0910" }}>
                {fetchingReplay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />} Fetch replay
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
