// Settings → Connections: lets any Oravini user connect (or disconnect) their own YouTube channel.
// Used by webinars (one-click YouTube Live) and the YouTube scheduler.
import { useEffect, useState } from "react";
import { Link2, Loader2, Unplug, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  YOUTUBE_STATUS_KEY, consumeYoutubeConnectResult, startYoutubeConnect, useYoutubeConnection,
} from "@/components/webinar-funnel/youtube";

export default function YoutubeConnectionCard() {
  const { toast } = useToast();
  const { data, isLoading } = useYoutubeConnection();
  const [busy, setBusy] = useState(false);

  // /settings/connections deep link → scroll to this card
  useEffect(() => {
    if (window.location.pathname === "/settings/connections") {
      document.querySelector('[data-testid="settings-connections"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  useEffect(() => {
    const result = consumeYoutubeConnectResult();
    if (!result) return;
    queryClient.invalidateQueries({ queryKey: YOUTUBE_STATUS_KEY });
    if (result.ok) toast({ title: "YouTube connected", description: "You can now create YouTube Live webinars in one click." });
    else toast({ title: "Couldn't connect YouTube", description: result.error, variant: "destructive" });
  }, []);

  const disconnect = async () => {
    setBusy(true);
    try {
      await apiRequest("DELETE", "/api/youtube/disconnect");
      await queryClient.invalidateQueries({ queryKey: YOUTUBE_STATUS_KEY });
      toast({ title: "YouTube disconnected" });
    } catch (e: any) {
      toast({ title: "Couldn't disconnect", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const notConfigured = data?.configured === false;

  return (
    <div className="mt-4" data-testid="settings-connections">
      <div className="rounded-2xl p-6" style={{ background: "rgba(220,38,38,0.035)", border: "1px solid rgba(220,38,38,0.14)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.22)" }}>
            <Link2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Connections</p>
            <p className="text-xs text-zinc-500">Accounts Oravini can use on your behalf</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {data?.connected && data.channelThumbnail ? (
            <img src={data.channelThumbnail} alt="" className="w-10 h-10 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.12)" }}>
              <Youtube className="w-5 h-5 text-red-500" />
            </div>
          )}
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-semibold text-white">YouTube</p>
            <p className="text-xs text-zinc-500" data-testid="settings-youtube-status">
              {isLoading ? "Checking…"
                : data?.connected ? <>Connected as <b className="text-zinc-300">{data.channelTitle || "your channel"}</b> · used for webinars &amp; scheduling</>
                : notConfigured ? "Not available yet — the server admin needs to configure YouTube."
                : "Create YouTube Live webinars and schedule uploads from your own channel."}
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          ) : data?.connected ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => startYoutubeConnect()} className="px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white" style={{ border: "1px solid rgba(255,255,255,0.1)" }} data-testid="settings-youtube-reconnect">
                Reconnect
              </button>
              <button type="button" onClick={disconnect} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-300 hover:text-red-200 disabled:opacity-50" style={{ border: "1px solid rgba(248,113,113,0.25)" }} data-testid="settings-youtube-disconnect">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />} Disconnect
              </button>
            </div>
          ) : !notConfigured ? (
            <button type="button" onClick={() => startYoutubeConnect()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black text-white hover:brightness-110" style={{ background: "#dc2626" }} data-testid="settings-youtube-connect">
              <Youtube className="w-3.5 h-3.5" /> Connect YouTube
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
