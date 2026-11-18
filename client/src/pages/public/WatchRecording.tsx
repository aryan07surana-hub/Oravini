import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Film, Loader2 } from "lucide-react";

const GOLD = "#d4b461";

type PublicRecording = {
  id: string;
  title: string;
  recordingUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string | null;
  webinarTitle: string | null;
  webinarDate: string | null;
};

/** Public replay page for a recording shared from the Recordings library (/r/:token). */
export default function WatchRecording() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery<PublicRecording>({
    queryKey: [`/api/public/recordings/${token}`],
    enabled: !!token,
    retry: false,
  });

  const date = data?.webinarDate || data?.createdAt;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#040406", color: "#fff" }}>
      <div className="absolute inset-x-0 top-0 h-80 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${GOLD}10 0%, transparent 70%)` }} />
      <main className="relative flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>
        ) : error || !data ? (
          <div className="text-center py-32">
            <Film className="w-10 h-10 mx-auto mb-4" style={{ color: `${GOLD}60` }} />
            <p className="text-lg font-black">This recording isn't available</p>
            <p className="text-sm text-zinc-500 mt-1">It may have been made private or removed.</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: `${GOLD}80` }}>Webinar replay</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">{data.title}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {data.webinarTitle && data.webinarTitle !== data.title ? `${data.webinarTitle} · ` : ""}
              {date ? format(new Date(date), "MMMM d, yyyy") : ""}
            </p>
            <div className="mt-8 rounded-3xl overflow-hidden" style={{ border: `1px solid ${GOLD}22`, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
              <video src={data.recordingUrl} poster={data.thumbnailUrl || undefined} controls playsInline className="w-full aspect-video bg-black" />
            </div>
          </>
        )}
      </main>
      <footer className="relative text-center text-[11px] text-zinc-600 pb-8">Hosted with Oravini</footer>
    </div>
  );
}
