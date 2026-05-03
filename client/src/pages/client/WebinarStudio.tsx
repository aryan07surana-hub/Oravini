import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Mic, MicOff, Video, VideoOff, MonitorPlay, Square, Play,
  Users, MessageSquare, Copy, Check, ArrowLeft, Radio,
  Clock, Link2, Settings, Zap, Info, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-zinc-400 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function ChatMessage({ msg }: { msg: { name: string; text: string; ts: string } }) {
  return (
    <div className="flex flex-col gap-0.5 mb-3">
      <span className="text-[11px] font-semibold" style={{ color: GOLD }}>{msg.name}</span>
      <span className="text-sm text-zinc-200 leading-relaxed">{msg.text}</span>
      <span className="text-[10px] text-zinc-600">{msg.ts}</span>
    </div>
  );
}

export default function WebinarStudio() {
  const params = useParams<{ id: string }>();
  const webinarId = params?.id;
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState<{ name: string; text: string; ts: string }[]>([
    { name: "System", text: "Webinar studio is ready. Go live when you're set.", ts: format(new Date(), "h:mm a") },
  ]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: webinar, isLoading } = useQuery<any>({
    queryKey: [`/api/webinars/${webinarId}`],
    enabled: !!webinarId,
  });

  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/registrations`],
    enabled: !!webinarId,
  });

  const startMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "You are now LIVE!" });
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    },
  });

  const endMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "Webinar ended. Recording saved." });
      if (timerRef.current) clearInterval(timerRef.current);
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setMessages(m => [...m, { name: "Host (You)", text: chatMsg.trim(), ts: format(new Date(), "h:mm a") }]);
    setChatMsg("");
  };

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const baseUrl = window.location.origin;
  const joinLink = webinar?.meetingCode ? `${baseUrl}/join/${webinar.meetingCode}` : "";
  const isLive = webinar?.status === "live";
  const isJic = webinar?.webinarType === "jic";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#09090b" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#09090b" }}>
        <p className="text-zinc-400">Webinar not found.</p>
        <Button onClick={() => nav("/video-marketing")} variant="ghost" className="text-zinc-400">Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#09090b", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => nav("/video-marketing")} className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-bold text-white truncate max-w-[300px]">{webinar.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE · {formatElapsed(elapsed)}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  {webinar.scheduledAt ? format(new Date(webinar.scheduledAt), "MMM d, h:mm a") : "Not scheduled"}
                </span>
              )}
              {isJic && (
                <Badge className="text-[10px] px-2 py-0 h-4" style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}>
                  JIC Automated
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            {registrations.length} registered
          </div>
          {!isLive ? (
            <Button
              size="sm"
              className="gap-1.5 font-bold text-sm px-5"
              style={{ background: "#ef4444", color: "#fff" }}
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
            >
              <Radio className="w-4 h-4" /> Go Live
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 font-semibold bg-zinc-700 hover:bg-zinc-600 text-white"
              onClick={() => endMut.mutate()}
              disabled={endMut.isPending}
            >
              <Square className="w-4 h-4" /> End Webinar
            </Button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stage / video area */}
        <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">

          {/* JIC Info banner */}
          {isJic && (
            <div className="rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor: `${GOLD}33`, background: `${GOLD}08` }}>
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: GOLD }}>JIC (Just-In-Case) Automated Webinar</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  This webinar plays your pre-recorded video to attendees as if it's live. Registrants join at the scheduled time and watch your replay with real-time chat. When you click "Go Live", attendees can join and the video starts.
                  {webinar.replayVideoUrl && (
                    <span className="block mt-1">Replay: <a href={webinar.replayVideoUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: GOLD }}>{webinar.replayVideoUrl}</a></span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Video preview */}
          {isJic && webinar.replayVideoUrl ? (
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video w-full">
              <iframe
                src={webinar.replayVideoUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Webinar replay"
              />
            </div>
          ) : (
            <div
              className="rounded-2xl border border-zinc-800 flex items-center justify-center aspect-video w-full relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0e0e10, #1a1a1d)" }}
            >
              <div className="text-center">
                <MonitorPlay className="w-14 h-14 mx-auto mb-3" style={{ color: `${GOLD}40` }} />
                <p className="text-sm text-zinc-500">Your camera preview will appear here</p>
                <p className="text-xs text-zinc-700 mt-1">Use an external streaming tool (OBS, Streamyard, Zoom) and share your screen</p>
              </div>
              {isLive && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setMicOn(m => !m)}
              className="w-12 h-12 rounded-full flex items-center justify-center border transition-all"
              style={{
                background: micOn ? "rgba(255,255,255,0.06)" : "#ef4444",
                borderColor: micOn ? "rgba(255,255,255,0.12)" : "#ef4444",
              }}
            >
              {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={() => setCamOn(c => !c)}
              className="w-12 h-12 rounded-full flex items-center justify-center border transition-all"
              style={{
                background: camOn ? "rgba(255,255,255,0.06)" : "#ef4444",
                borderColor: camOn ? "rgba(255,255,255,0.12)" : "#ef4444",
              }}
            >
              {camOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
            </button>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500">Registered</p>
                  <p className="text-lg font-bold text-white">{registrations.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
                <div>
                  <p className="text-xs text-zinc-500">Duration</p>
                  <p className="text-lg font-bold text-white">{webinar.durationMinutes}m</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <p className="text-lg font-bold text-white capitalize">{webinar.status}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Join link */}
          {joinLink && (
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> Attendee Join Link
                </p>
                <div className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2.5">
                  <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{joinLink}</span>
                  <CopyBtn text={joinLink} />
                  <a href={joinLink} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registrations */}
          {registrations.length > 0 && (
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Registrations
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {registrations.map((r: any, i: number) => (
                    <div key={r.id || i} className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">{r.name || "Anonymous"}</span>
                      <span className="text-zinc-500 text-xs">{r.email}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat panel */}
        <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-950">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: GOLD }} />
            <p className="text-sm font-semibold text-white">Live Chat</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <ChatMessage key={i} msg={m} />
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <Input
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
              placeholder="Send a message…"
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
            <Button size="sm" className="h-9 px-3 font-semibold" style={{ background: GOLD, color: "#000" }} onClick={sendChat}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
