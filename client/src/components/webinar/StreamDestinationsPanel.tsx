import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Radio, ToggleLeft, ToggleRight, Tv2 } from "lucide-react";

const GOLD = "#d4b461";

const PLATFORM_PRESETS: Record<string, { label: string; color: string; rtmpUrl: string }> = {
  youtube: { label: "YouTube Live", color: "#ff0000", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2" },
  facebook: { label: "Facebook Live", color: "#1877f2", rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp/" },
  linkedin: { label: "LinkedIn Live", color: "#0a66c2", rtmpUrl: "rtmp://rtmp-api.linkedin.com/rtmp/" },
  twitch: { label: "Twitch", color: "#9146ff", rtmpUrl: "rtmp://live.twitch.tv/app/" },
  custom: { label: "Custom RTMP", color: "#a1a1aa", rtmpUrl: "" },
};

interface Props {
  webinarId: string;
}

export function StreamDestinationsPanel({ webinarId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [platform, setPlatform] = useState("youtube");
  const [streamKey, setStreamKey] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState(PLATFORM_PRESETS.youtube.rtmpUrl);
  const [label, setLabel] = useState("");

  const { data: destinations = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/stream-destinations`],
  });

  const { data: simulcastStatus } = useQuery<any>({
    queryKey: [`/api/webinars/${webinarId}/simulcast/status`],
    refetchInterval: 5000,
  });

  const startSimulcastMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/simulcast/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/simulcast/status`] });
      toast({ title: "🔴 Simulcast started!" });
    },
    onError: (e: any) => toast({ title: "Simulcast failed", description: e.message, variant: "destructive" }),
  });

  const stopSimulcastMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/simulcast/stop`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/simulcast/status`] });
      toast({ title: "Simulcast stopped" });
    },
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/stream-destinations`, {
      platform, rtmpUrl, streamKey, label: label || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/stream-destinations`] });
      setShowAdd(false);
      setStreamKey("");
      setLabel("");
      toast({ title: "Stream destination added!" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/webinars/${webinarId}/stream-destinations/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/stream-destinations`] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webinars/${webinarId}/stream-destinations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/stream-destinations`] }),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>
            Simulcast ({destinations.length})
          </p>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="h-6 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed mb-2">
          Stream simultaneously to YouTube Live, Facebook, LinkedIn, Twitch, or custom RTMP.
        </p>

        {/* Start/Stop Simulcast */}
        {destinations.filter((d: any) => d.isActive).length > 0 && (
          simulcastStatus?.active ? (
            <Button size="sm" onClick={() => stopSimulcastMut.mutate()} disabled={stopSimulcastMut.isPending}
              className="w-full h-7 text-[10px] gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
              <Radio className="w-3 h-3" /> Stop Simulcast
            </Button>
          ) : (
            <Button size="sm" onClick={() => startSimulcastMut.mutate()} disabled={startSimulcastMut.isPending}
              className="w-full h-7 text-[10px] gap-1 font-bold border-0" style={{ background: GOLD, color: "#000" }}>
              <Radio className="w-3 h-3" /> Start Simulcast → {destinations.filter((d: any) => d.isActive).length} platform{destinations.filter((d: any) => d.isActive).length > 1 ? "s" : ""}
            </Button>
          )
        )}

        {simulcastStatus?.active && (
          <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] text-red-400 font-bold">Live on {destinations.filter((d: any) => d.isActive).length} platform{destinations.filter((d: any) => d.isActive).length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="p-3 space-y-2 flex-shrink-0" style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${GOLD}12` }}>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
              <button key={key} onClick={() => { setPlatform(key); setRtmpUrl(preset.rtmpUrl); }}
                className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: platform === key ? `${preset.color}20` : "rgba(255,255,255,0.04)",
                  color: platform === key ? preset.color : "rgba(255,255,255,0.4)",
                  border: `1px solid ${platform === key ? preset.color + "50" : "rgba(255,255,255,0.08)"}`,
                }}>
                {preset.label.split(" ")[0]}
              </button>
            ))}
          </div>
          {platform === "custom" && (
            <Input value={rtmpUrl} onChange={e => setRtmpUrl(e.target.value)}
              placeholder="RTMP URL" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
          )}
          <Input value={streamKey} onChange={e => setStreamKey(e.target.value)}
            placeholder="Stream key" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" type="password" />
          <Input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional)" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
          <Button size="sm" onClick={() => createMut.mutate()} disabled={!streamKey.trim() || !rtmpUrl.trim()}
            className="w-full h-7 text-xs font-bold" style={{ background: GOLD, color: "#000" }}>
            Add Destination
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {destinations.length === 0 ? (
          <div className="text-center py-8">
            <Tv2 className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">No stream destinations</p>
            <p className="text-[10px] text-zinc-700 mt-1">Add platforms to simulcast your webinar</p>
          </div>
        ) : (
          destinations.map((dest: any) => {
            const preset = PLATFORM_PRESETS[dest.platform] || PLATFORM_PRESETS.custom;
            return (
              <div key={dest.id} className="rounded-xl p-2.5" style={{
                background: dest.isActive ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                border: `1px solid ${dest.isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)"}`,
                opacity: dest.isActive ? 1 : 0.5,
              }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${preset.color}20` }}>
                    <Radio className="w-3 h-3" style={{ color: preset.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{preset.label}</p>
                    {dest.label && <p className="text-[10px] text-zinc-500">{dest.label}</p>}
                  </div>
                  <button onClick={() => toggleMut.mutate({ id: dest.id, isActive: !dest.isActive })}>
                    {dest.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
                  </button>
                  <button onClick={() => deleteMut.mutate(dest.id)} className="text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
