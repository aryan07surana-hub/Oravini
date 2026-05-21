import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Mail, Check } from "lucide-react";
import { OraviniBadge } from "@/components/video-marketing/OraviniBadge";

const GOLD = "#d4b461";

export default function ChannelView() {
  const params = useParams<{ slug: string }>();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const { data: channel, isLoading } = useQuery<any>({
    queryKey: [`/api/channel/${params.slug}`],
    queryFn: () => fetch(`/api/channel/${params.slug}`).then(r => r.ok ? r.json() : null),
  });

  const subscribeMut = useMutation({
    mutationFn: (data: { email: string; name?: string }) => fetch(`/api/channel/${channel.id}/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => setSubscribed(true),
  });

  // Need to fetch videos for episodes
  const { data: allVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events"],
    enabled: !!channel,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /></div>;
  if (!channel) return <div className="min-h-screen flex items-center justify-center bg-black"><p className="text-zinc-500">Channel not found</p></div>;

  const isLight = channel.theme === "light";
  const accent = channel.accentColor || GOLD;
  const bg = isLight ? "#fafafa" : "#040406";
  const cardBg = isLight ? "#fff" : "#0c0c10";
  const fg = isLight ? "#0a0a0a" : "#fff";
  const muted = isLight ? "#71717a" : "rgba(255,255,255,0.5)";

  // Group episodes by section
  const episodesBySection: Record<string, any[]> = {};
  for (const ep of channel.episodes || []) {
    const section = ep.section || "Episodes";
    if (!episodesBySection[section]) episodesBySection[section] = [];
    const vid = allVideos.find((v: any) => v.id === ep.videoEventId);
    episodesBySection[section].push({ ...ep, video: vid });
  }

  return (
    <div className="min-h-screen" style={{ background: bg, color: fg }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: "60vh", minHeight: 400 }}>
        <div className="absolute inset-0" style={{ background: channel.coverUrl ? `url(${channel.coverUrl}) center/cover` : `linear-gradient(135deg, ${bg}, ${accent}20)` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${bg} 0%, transparent 60%)` }} />
        <div className="absolute inset-0 max-w-6xl mx-auto px-8 flex flex-col justify-end pb-12">
          {channel.logoUrl && <img src={channel.logoUrl} alt="" className="h-12 object-contain mb-4 drop-shadow-2xl" style={{ alignSelf: "flex-start" }} />}
          <h1 className="text-5xl font-black mb-3" style={{ color: fg, textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>{channel.name}</h1>
          {channel.description && <p className="text-base max-w-xl mb-5" style={{ color: muted }}>{channel.description}</p>}
          {channel.subscribable && !subscribed && (
            <div className="flex flex-wrap gap-2 max-w-md">
              <input type="text" placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} className="flex-1 px-4 py-2.5 rounded-lg text-sm" style={{ background: cardBg, color: fg, border: `1px solid ${accent}30` }} />
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 px-4 py-2.5 rounded-lg text-sm" style={{ background: cardBg, color: fg, border: `1px solid ${accent}30` }} />
              <button onClick={() => email && subscribeMut.mutate({ email, name })} disabled={!email || subscribeMut.isPending} className="px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all" style={{ background: accent, color: isLight ? "#fff" : "#000", boxShadow: `0 0 30px ${accent}40` }}>
                <Mail className="w-3.5 h-3.5 inline mr-1.5" />Subscribe
              </button>
            </div>
          )}
          {subscribed && (
            <div className="px-4 py-2.5 rounded-lg text-sm font-bold inline-flex items-center gap-2" style={{ background: "#22c55e15", color: "#22c55e", border: "1px solid #22c55e30" }}>
              <Check className="w-4 h-4" /> Subscribed! Check your inbox.
            </div>
          )}
        </div>
      </div>

      {/* Episodes */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        {Object.entries(episodesBySection).map(([section, eps]) => (
          <div key={section} className="mb-10">
            <h2 className="text-xl font-black mb-4" style={{ color: fg }}>{section}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {eps.map((ep: any) => (
                <a key={ep.id} href={`/watch-video/${ep.videoEventId}`} className="rounded-xl overflow-hidden group transition-all hover:scale-[1.02]" style={{ background: cardBg, border: `1px solid ${accent}15` }}>
                  <div className="relative" style={{ aspectRatio: "16/9", background: ep.video?.thumbnailUrl ? `url(${ep.video.thumbnailUrl}) center/cover` : `linear-gradient(135deg, ${cardBg}, ${accent}10)` }}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: accent, color: isLight ? "#fff" : "#000" }}>
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold truncate" style={{ color: fg }}>{ep.video?.title || "Episode"}</p>
                    {ep.video?.duration && <p className="text-[10px] mt-0.5" style={{ color: muted }}>{ep.video.duration}m</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(episodesBySection).length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: muted }}>No episodes yet — check back soon</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs" style={{ color: muted, borderTop: `1px solid ${accent}10` }}>
        Powered by Oravini · {channel.subscriberCount || 0} subscriber{(channel.subscriberCount || 0) !== 1 ? "s" : ""}
      </div>

      {/* Floating Oravini badge — visible on every channel page */}
      <OraviniBadge variant="page" position="bottom-right" />
    </div>
  );
}
