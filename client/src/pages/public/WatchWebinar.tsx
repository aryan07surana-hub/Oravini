import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, MessageSquare, Clock, Send, Loader2, WifiOff,
  MonitorPlay, Radio, HelpCircle, Hand, Wifi, WifiLow,
  Info, CheckCircle, ChevronRight, X, Zap,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80",              username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443",             username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

const REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}?autoplay=1`;
  return url;
}
function isDirectVideo(url: string): boolean {
  return /\.(mp4|mov|webm|ogg|mkv)(\?.*)?$/i.test(url);
}

type Phase = "register" | "waiting" | "live" | "ended";
type ConnState = "connecting" | "connected" | "poor" | "disconnected";

interface ChatMsg  { name: string; text: string; ts: string; isHost?: boolean; }
interface QAItem   { id: string; text: string; ts: string; answered?: boolean; }
interface FloatEmoji { id: string; emoji: string; x: number; }

export default function WatchWebinar() {
  const params = useParams<{ code: string }>();
  const code = params?.code;

  const [webinar,     setWebinar]     = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [phase,       setPhase]       = useState<Phase>("register");
  const [regForm,     setRegForm]     = useState({ name: "", email: "" });
  const [regLoading,  setRegLoading]  = useState(false);
  const [regError,    setRegError]    = useState("");
  const [streamReady, setStreamReady] = useState(false);
  const [connState,   setConnState]   = useState<ConnState>("connecting");
  const [viewerCount,  setViewerCount]  = useState(0);
  const [handRaised,   setHandRaised]   = useState(false);
  const [activeCta,    setActiveCta]    = useState<{title:string;url:string;buttonText:string}|null>(null);
  const [ctaDismissed, setCtaDismissed] = useState(false);
  const [activePoll,   setActivePoll]   = useState<{pollId:string;question:string;options:string[];votes:number[]}|null>(null);
  const [pollVoted,    setPollVoted]    = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "qa">("chat");
  const [showPanel,   setShowPanel]   = useState(true);

  const [chatMsg,      setChatMsg]      = useState("");
  const [messages,     setMessages]     = useState<ChatMsg[]>([]);
  const [qaInput,      setQaInput]      = useState("");
  const [qaQuestions,  setQaQuestions]  = useState<QAItem[]>([]);
  const [floatEmojis,  setFloatEmojis]  = useState<FloatEmoji[]>([]);
  const [countdown,    setCountdown]    = useState<{ h: number; m: number; s: number; past: boolean } | null>(null);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const wsRef         = useRef<WebSocket | null>(null);
  const pcRef         = useRef<RTCPeerConnection | null>(null);
  const vidRef        = useRef<string>(Math.random().toString(36).slice(2, 10));
  const chatEndRef    = useRef<HTMLDivElement>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Inject float animation ─────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "wr-float-anim";
    style.textContent = `
      @keyframes wrFloatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 80%{opacity:0.8;transform:translateY(-80px) scale(1.4)} 100%{opacity:0;transform:translateY(-120px) scale(1.6)} }
      .wr-float { animation: wrFloatUp 2.2s ease-out forwards; pointer-events:none; position:absolute; bottom:80px; font-size:2rem; z-index:50; }
    `;
    if (!document.getElementById("wr-float-anim")) document.head.appendChild(style);
    return () => { document.getElementById("wr-float-anim")?.remove(); };
  }, []);

  const addFloat = useCallback((emoji: string) => {
    const id = Math.random().toString(36).slice(2);
    const x = Math.random() * 55 + 10;
    setFloatEmojis(f => [...f, { id, emoji, x }]);
    setTimeout(() => setFloatEmojis(f => f.filter(e => e.id !== id)), 2300);
  }, []);

  // ── Fetch webinar ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    fetch(`/api/webinars/public/${code}`)
      .then(r => r.json())
      .then(d => { setWebinar(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code]);

  // ── Poll while waiting ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "waiting") { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(() => {
      if (!code) return;
      fetch(`/api/webinars/public/${code}`)
        .then(r => r.json())
        .then(d => {
          setWebinar(d);
          if (d.status === "live") setPhase("live");
          else if (d.status === "completed") setPhase("ended");
        }).catch(() => {});
    }, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, code]);

  // ── WebRTC viewer ──────────────────────────────────────────────────────
  const connectViewer = useCallback(() => {
    if (!webinar?.id) return;
    setConnState("connecting");
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({
      type: "wr_viewer_join",
      webinarId: webinar.id,
      viewerId: vidRef.current,
      name: regForm.name || "Anonymous",
    }));

    ws.onmessage = async (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "wr_viewer_ready":
            break;

          case "wr_offer": {
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            pcRef.current = pc;

            pc.ontrack = (evt) => {
              if (videoRef.current && evt.streams[0]) {
                videoRef.current.srcObject = evt.streams[0];
                setStreamReady(true);
                setConnState("connected");
              }
            };
            pc.oniceconnectionstatechange = () => {
              if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") setConnState("connected");
              else if (pc.iceConnectionState === "checking") setConnState("connecting");
              else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") setConnState("poor");
            };
            pc.onicecandidate = (evt) => {
              if (evt.candidate && ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: "wr_ice_viewer", webinarId: webinar.id, viewerId: vidRef.current, candidate: evt.candidate }));
            };

            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ type: "wr_answer", webinarId: webinar.id, viewerId: vidRef.current, sdp: pc.localDescription }));
            break;
          }

          case "wr_ice":
            if (pcRef.current && msg.candidate)
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
            break;

          case "wr_chat":
            setMessages(m => [...m, msg.message]);
            break;

          case "wr_reaction":
            addFloat(msg.emoji);
            break;

          case "wr_attendee_count":
            setViewerCount(msg.count);
            break;

          case "wr_hand_lowered":
            setHandRaised(false);
            break;

          case "wr_host_left":
            setPhase("ended");
            setConnState("disconnected");
            break;

          case "wr_cta_show":
            setActiveCta({ title: msg.title, url: msg.url, buttonText: msg.buttonText });
            setCtaDismissed(false);
            break;

          case "wr_cta_hidden":
            setActiveCta(null);
            setCtaDismissed(false);
            break;

          case "wr_poll_show":
            setActivePoll({ pollId: msg.pollId, question: msg.question, options: msg.options || [], votes: new Array((msg.options || []).length).fill(0) });
            setPollVoted(false);
            break;

          case "wr_poll_ended":
            setActivePoll(prev => prev ? { ...prev, votes: msg.votes || prev.votes } : null);
            setTimeout(() => setActivePoll(null), 8000);
            break;
        }
      } catch {}
    };

    ws.onclose = () => setConnState("disconnected");

    return () => { ws.close(); pcRef.current?.close(); };
  }, [webinar?.id, regForm.name, addFloat]);

  // ── HLS broadcast URL player ──────────────────────────────────────────
  useEffect(() => {
    const url = webinar?.broadcastUrl;
    if (phase !== "live" || !url || !videoRef.current) return;
    if (!url.includes(".m3u8")) return; // Non-HLS URLs handled via embed/direct video
    const video = videoRef.current;
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); setStreamReady(true); setConnState("connected"); });
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setConnState("poor"); });
      return () => { hls.destroy(); hlsRef.current = null; };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => { video.play().catch(() => {}); setStreamReady(true); setConnState("connected"); });
    }
  }, [phase, webinar?.broadcastUrl]);

  useEffect(() => {
    if (phase === "live" && webinar && webinar.webinarType !== "jic") {
      // For broadcast URL, still connect WS for chat/reactions but skip WebRTC
      const cleanup = connectViewer();
      return cleanup ?? undefined;
    }
    if (phase === "live" && webinar?.webinarType === "jic") setConnState("connected");
  }, [phase, webinar?.webinarType, webinar?.id, connectViewer]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (phase !== "waiting" || !webinar?.scheduledAt) {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }
    const tick = () => {
      const diff = new Date(webinar.scheduledAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ h: 0, m: 0, s: 0, past: true });
      } else {
        const totalSec = Math.floor(diff / 1000);
        setCountdown({ h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60, past: false });
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [phase, webinar?.scheduledAt]);

  useEffect(() => () => { wsRef.current?.close(); pcRef.current?.close(); if (pollRef.current) clearInterval(pollRef.current); if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email) { setRegError("Name and email are required"); return; }
    setRegLoading(true); setRegError("");
    try {
      const res = await fetch(`/api/register/${code}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const json = await res.json();
      if (!res.ok) { setRegError(json.message || "Registration failed"); return; }
      if (!webinar) return;
      if (webinar.status === "live") setPhase("live");
      else if (webinar.status === "completed") setPhase("ended");
      else setPhase("waiting");
    } catch { setRegError("Network error. Please try again."); }
    finally { setRegLoading(false); }
  };

  const sendChat = () => {
    if (!chatMsg.trim() || !webinar?.id) return;
    const msg: ChatMsg = { name: regForm.name || "You", text: chatMsg.trim(), ts: format(new Date(), "h:mm a") };
    setMessages(m => [...m, msg]);
    setChatMsg("");
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "wr_chat", webinarId: webinar.id, ...msg }));
  };

  const submitQuestion = () => {
    if (!qaInput.trim() || !webinar?.id) return;
    const q: QAItem = { id: Math.random().toString(36).slice(2), text: qaInput.trim(), ts: format(new Date(), "h:mm a") };
    setQaQuestions(arr => [...arr, q]);
    setQaInput("");
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "wr_qa", webinarId: webinar.id, id: q.id, name: regForm.name || "Anonymous", text: q.text, ts: q.ts }));
  };

  const sendReaction = (emoji: string) => {
    addFloat(emoji);
    if (wsRef.current?.readyState === WebSocket.OPEN && webinar?.id)
      wsRef.current.send(JSON.stringify({ type: "wr_reaction", webinarId: webinar.id, emoji, name: regForm.name || "Anonymous" }));
  };

  const toggleHand = () => {
    if (!webinar?.id) return;
    const next = !handRaised;
    setHandRaised(next);
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: next ? "wr_raise_hand" : "wr_lower_hand_self", webinarId: webinar.id, name: regForm.name || "Anonymous" }));
  };

  // ── Loading / not found ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
    </div>
  );
  if (!webinar || webinar.message) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#040406" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}20` }}>
        <MonitorPlay className="w-6 h-6" style={{ color: `${GOLD}60` }} />
      </div>
      <p className="text-zinc-400 font-semibold">Webinar not found</p>
      <p className="text-xs text-zinc-600">Double-check your link and try again.</p>
    </div>
  );

  const isJic = webinar.webinarType === "jic";

  // ── REGISTER ──────────────────────────────────────────────────────────
  if (phase === "register") return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#040406" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 120% 40% at 50% 0%, ${GOLD}08 0%, transparent 65%)` }} />
      <div className="relative z-10 flex items-center justify-between px-4 h-10 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}15` }}>
        <div className="flex gap-0.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-2 h-4 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}22` : "transparent", border: `1px solid ${GOLD}12` }} />
          ))}
        </div>
        <span className="text-[10px] font-black tracking-[0.3em]" style={{ color: GOLD }}>ORAVINI</span>
        <div className="flex gap-0.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-2 h-4 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}22` : "transparent", border: `1px solid ${GOLD}12` }} />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {isJic
                ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: `${GOLD}20`, color: GOLD }}>AUTOMATED WEBINAR</span>
                : <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />LIVE EVENT</span>
              }
            </div>
            <h1 className="text-3xl font-black text-white leading-tight mb-3">{webinar.title}</h1>
            {webinar.presenterName && (
              <p className="text-sm text-zinc-400 mb-2">Hosted by <span className="text-white font-semibold">{webinar.presenterName}</span></p>
            )}
            {webinar.scheduledAt && (
              <p className="text-sm font-semibold" style={{ color: GOLD }}>
                {format(new Date(webinar.scheduledAt), "EEEE, MMMM d · h:mm a")}
              </p>
            )}
            {webinar.description && (
              <p className="text-sm text-zinc-400 mt-4 leading-relaxed">{webinar.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Clock className="w-3.5 h-3.5" />{webinar.durationMinutes} min</span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Radio className="w-3.5 h-3.5" />Free to attend</span>
            </div>
          </div>

          <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-base font-black text-white">Reserve Your Free Spot</p>
            <form onSubmit={handleRegister} className="space-y-3">
              <Input placeholder="Your full name" value={regForm.name}
                onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                className="bg-zinc-800/70 border-zinc-700 text-white h-11 text-sm" />
              <Input type="email" placeholder="Email address" value={regForm.email}
                onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                className="bg-zinc-800/70 border-zinc-700 text-white h-11 text-sm" />
              {regError && <p className="text-xs text-red-400">{regError}</p>}
              <Button type="submit" disabled={regLoading} className="w-full h-12 font-black text-base gap-2" style={{ background: GOLD, color: "#000" }}>
                {regLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Register Free <ChevronRight className="w-5 h-5" /></>}
              </Button>
            </form>
          </div>

          <p className="text-[11px] text-zinc-600 text-center mt-4">No spam. Unsubscribe any time.</p>
        </div>
      </div>
    </div>
  );

  // ── WAITING ───────────────────────────────────────────────────────────
  if (phase === "waiting") {
    const pad = (n: number) => String(n).padStart(2, "0");
    const isStartingSoon = countdown?.past || (!countdown && !webinar.scheduledAt);
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden text-white" style={{ background: "#040406" }}>
        {/* Backdrop glows + grain */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Custom waiting room video background */}
          {webinar.waitingRoomVideoUrl && (
            <video
              className="absolute inset-0 w-full h-full object-cover opacity-20"
              src={webinar.waitingRoomVideoUrl}
              autoPlay muted loop playsInline
            />
          )}
          <div className="absolute inset-0" style={{ background: webinar.waitingRoomVideoUrl ? "rgba(4,4,6,0.65)" : `radial-gradient(ellipse 140% 55% at 50% -10%, ${GOLD}10 0%, transparent 65%)` }} />
          {!webinar.waitingRoomVideoUrl && (
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 140% 55% at 50% -10%, ${GOLD}10 0%, transparent 65%)` }} />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent)" }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
            <filter id="ww-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
            <rect width="100%" height="100%" filter="url(#ww-grain)"/>
          </svg>
        </div>

        {/* Film-strip header bar */}
        <div className="relative z-10 flex items-center justify-between px-5 h-10 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}15` }}>
          <div className="flex gap-0.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2.5 h-5 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}25` : "transparent", border: `1px solid ${GOLD}15` }} />
            ))}
          </div>
          <span className="text-[10px] font-black tracking-[0.3em]" style={{ color: GOLD }}>ORAVINI LIVE</span>
          <div className="flex gap-0.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2.5 h-5 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}25` : "transparent", border: `1px solid ${GOLD}15` }} />
            ))}
          </div>
        </div>

        {/* Content — cinematic layout: badge → countdown → divider → title → stats */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6">
          {/* Reserved badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider mb-6 uppercase"
            style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}35` }}>
            ✓ Seat Reserved
          </div>

          {/* Giant cinematic countdown — shown first, before title */}
          {webinar.scheduledAt && countdown && !isStartingSoon && (
            <div className="text-center mb-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] mb-5" style={{ color: `${GOLD}50` }}>— Begins in —</p>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[{ val: countdown.h }, { val: countdown.m }, { val: countdown.s }].map(({ val }, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="font-black tabular-nums" style={{
                      fontSize: "clamp(56px, 18vw, 80px)",
                      background: `linear-gradient(180deg, #fff 0%, ${GOLD} 100%)`,
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      lineHeight: 1, letterSpacing: "-0.04em",
                    }}>{pad(val)}</span>
                    {i < 2 && <span className="text-5xl font-black mb-2" style={{ color: `${GOLD}40` }}>:</span>}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-9 mt-2">
                {["hours", "minutes", "seconds"].map(l => (
                  <span key={l} className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${GOLD}40` }}>{l}</span>
                ))}
              </div>
            </div>
          )}

          {isStartingSoon && (
            <div className="rounded-2xl p-5 mb-6 text-center" style={{ background: `${GOLD}0c`, border: `1px solid ${GOLD}35` }}>
              <p className="text-base font-black" style={{ color: GOLD }}>Starting any moment now…</p>
              <p className="text-xs text-zinc-500 mt-1">{webinar.waitingRoomMessage || "The host is about to go live. Hang tight!"}</p>
            </div>
          )}

          {/* Cinematic divider */}
          <div className="w-24 h-px mb-6" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }} />

          {/* Webinar info — title, presenter, date */}
          <h2 className="text-xl font-black text-center leading-tight mb-1" style={{ letterSpacing: "-0.02em" }}>{webinar.title}</h2>
          {webinar.presenterName && <p className="text-[11px] font-semibold mb-1" style={{ color: `${GOLD}80` }}>with {webinar.presenterName}</p>}
          {webinar.scheduledAt && (
            <p className="text-[10px] text-zinc-600 mb-8">
              {format(new Date(webinar.scheduledAt), "EEEE, MMM d")} · {format(new Date(webinar.scheduledAt), "h:mm a")}
            </p>
          )}
          {!webinar.scheduledAt && <div className="mb-8" />}

          {/* Stats row — cinematic */}
          <div className="flex items-center gap-5 mb-8">
            {[
              { val: String(webinar.maxAttendees || "—"), label: "Registered" },
              { val: `${webinar.durationMinutes || 60}m`, label: "Runtime" },
              { val: "Free", label: "Access" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-5">
                <div className="text-center">
                  <p className="text-base font-black" style={{ color: GOLD }}>{stat.val}</p>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">{stat.label}</p>
                </div>
                {i < 2 && <div className="w-px h-6" style={{ background: `${GOLD}18` }} />}
              </div>
            ))}
          </div>

          {webinar.waitingRoomMessage && !isStartingSoon && (
            <div className="rounded-xl px-5 py-3 mb-6 text-center text-xs text-zinc-400 max-w-sm leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {webinar.waitingRoomMessage}
            </div>
          )}

          <p className="text-[10px] text-zinc-700 text-center mb-3">This page automatically opens the broadcast when live</p>
          <div className="flex justify-center gap-2">
            {[0,1,2,3].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GOLD, opacity: 0.25, animationDelay: `${i * 0.25}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ENDED ─────────────────────────────────────────────────────────────
  if (phase === "ended") return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#040406" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 100% 50% at 50% 0%, ${GOLD}07 0%, transparent 65%)` }} />
      <div className="text-center px-6 max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-zinc-800">
          <WifiOff className="w-7 h-7 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Webinar Ended</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Thank you for attending, <span className="text-white font-semibold">{regForm.name.split(" ")[0] || "friend"}</span>! A replay may be available soon.
        </p>
        {webinar.offerUrl && webinar.offerTitle && (
          <a href={webinar.offerUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-black"
            style={{ background: GOLD }}>
            {webinar.offerTitle} →
          </a>
        )}
      </div>
    </div>
  );

  // ── LIVE ──────────────────────────────────────────────────────────────
  const ConnIcon = connState === "connected" ? Wifi : connState === "poor" ? WifiLow : Loader2;
  const connColor = connState === "connected" ? "#22c55e" : connState === "poor" ? "#f59e0b" : "#71717a";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#040406", color: "#fff" }}>

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}14`, background: "rgba(4,4,6,0.98)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: GOLD }}>
            <MonitorPlay className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate max-w-48 md:max-w-80">{webinar.title}</p>
            {webinar.presenterName && <p className="text-[10px] text-zinc-500">with {webinar.presenterName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
          </span>
          {viewerCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Users className="w-3.5 h-3.5" />{viewerCount}
            </span>
          )}
          <ConnIcon className={`w-4 h-4 ${connState === "connecting" ? "animate-spin" : ""}`} style={{ color: connColor }} />
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">

        {/* VIDEO STAGE */}
        <div className="flex-1 relative bg-black overflow-hidden">

          {/* Floating reactions */}
          {floatEmojis.map(e => (
            <span key={e.id} className="wr-float" style={{ left: `${e.x}%` }}>{e.emoji}</span>
          ))}

          {isJic ? (
            webinar.replayVideoUrl ? (
              isDirectVideo(webinar.replayVideoUrl) ? (
                <video src={webinar.replayVideoUrl} className="w-full h-full object-contain" controls autoPlay playsInline />
              ) : (
                <iframe src={getEmbedUrl(webinar.replayVideoUrl)} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media" allowFullScreen title="webinar" />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500 text-sm">Video starting soon…</p>
              </div>
            )
          ) : webinar?.broadcastUrl && !webinar.broadcastUrl.includes(".m3u8") ? (
            isDirectVideo(webinar.broadcastUrl) ? (
              <video src={webinar.broadcastUrl} className="w-full h-full object-contain" autoPlay playsInline controls
                onCanPlay={() => { setStreamReady(true); setConnState("connected"); }} />
            ) : (
              <iframe src={getEmbedUrl(webinar.broadcastUrl)} className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media" allowFullScreen title="broadcast" />
            )
          ) : webinar?.broadcastUrl?.includes(".m3u8") ? (
            <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline controls />
          ) : streamReady ? (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: `${GOLD}40` }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
              </div>
              <p className="text-sm text-zinc-400 font-semibold">Connecting to live stream…</p>
              <p className="text-xs text-zinc-600">Waiting for host to start broadcasting</p>
            </div>
          )}

          {/* LIVE overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </div>

          {/* Live CTA Banner — host-triggered via WebSocket */}
          {activeCta && !ctaDismissed && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 cta-slide-up" style={{ minWidth: 280, maxWidth: 420 }}>
              <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
                style={{ background: "linear-gradient(135deg, #1a1500 0%, #0d0d11 100%)", border: `1.5px solid ${GOLD}`, boxShadow: `0 0 32px ${GOLD}35, 0 8px 32px #00000080` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
                  <Zap className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Special Offer</span>
                  <span className="text-xs font-bold text-white leading-tight truncate">{activeCta.title}</span>
                </div>
                <a
                  href={activeCta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (wsRef.current?.readyState === WebSocket.OPEN && webinar?.id)
                      wsRef.current.send(JSON.stringify({ type: "wr_cta_click", webinarId: webinar.id, name: regForm.name, url: activeCta.url }));
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-xl font-black text-xs text-black transition-transform hover:scale-105 cta-shimmer"
                  style={{ background: GOLD }}>
                  {activeCta.buttonText}
                </a>
                <button
                  onClick={() => setCtaDismissed(true)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors">
                  <X className="w-2.5 h-2.5 text-zinc-400" />
                </button>
              </div>
            </div>
          )}

          {/* Static offer CTA — only when no live CTA active */}
          {webinar.offerUrl && webinar.offerTitle && !activeCta && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <a href={webinar.offerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm text-black shadow-2xl transition-transform hover:scale-105"
                style={{ background: GOLD }}>
                {webinar.offerTitle} →
              </a>
            </div>
          )}

          {/* ── LIVE POLL OVERLAY ── */}
          {activePoll && (
            <div className="absolute bottom-24 left-3 z-30 w-64 rounded-2xl overflow-hidden"
              style={{ background: "rgba(12,12,16,0.97)", border: `1.5px solid ${GOLD}35`, boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.3)` }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: `${GOLD}12`, borderBottom: `1px solid ${GOLD}22` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Live Poll</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-white mb-3 leading-tight">{activePoll.question}</p>
                {!pollVoted ? (
                  <div className="space-y-2">
                    {activePoll.options.map((opt, i) => (
                      <button key={i}
                        onClick={() => {
                          if (wsRef.current?.readyState === WebSocket.OPEN && webinar?.id)
                            wsRef.current.send(JSON.stringify({ type: "wr_poll_vote", webinarId: webinar.id, pollId: activePoll.pollId, optionIndex: i, name: regForm.name }));
                          setPollVoted(true);
                          setActivePoll(prev => { if (!prev) return null; const v = [...prev.votes]; v[i] = (v[i] || 0) + 1; return { ...prev, votes: v }; });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {opt}
                      </button>
                    ))}
                    <p className="text-[10px] text-zinc-600 text-center mt-1">Tap to vote</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activePoll.options.map((opt, i) => {
                      const total = activePoll.votes.reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((activePoll.votes[i] || 0) / total * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-300 leading-tight">{opt}</span>
                            <span className="text-xs font-black ml-2 flex-shrink-0" style={{ color: GOLD }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}90)` }} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-zinc-600 text-center mt-1.5">✓ Vote recorded · {activePoll.votes.reduce((s, v) => s + v, 0)} votes total</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        {showPanel && (
          <div className="w-72 xl:w-80 flex flex-col flex-shrink-0" style={{ borderLeft: `1px solid ${GOLD}12`, background: "#0c0c10" }}>
            {/* Tabs */}
            <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
              {([["chat", "Chat", MessageSquare], ["qa", "Q&A", HelpCircle]] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setActivePanel(id)}
                  className="flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  style={{ color: activePanel === id ? GOLD : "rgba(255,255,255,0.3)", borderBottom: activePanel === id ? `2px solid ${GOLD}` : "2px solid transparent" }}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            {/* CHAT */}
            {activePanel === "chat" && <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {messages.length === 0 && (
                  <p className="text-xs text-zinc-600 text-center mt-8">No messages yet. Say hi! 👋</p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col gap-0.5 ${m.isHost ? "" : ""}`}>
                    <p className="text-[10px] font-bold" style={{ color: m.isHost ? GOLD : "#60a5fa" }}>
                      {m.isHost ? "🎤 Host" : m.name} <span className="text-zinc-700 font-normal">{m.ts}</span>
                    </p>
                    <div className="px-2.5 py-1.5 rounded-xl text-xs leading-relaxed"
                      style={{ background: m.isHost ? `${GOLD}15` : "rgba(255,255,255,0.06)", border: m.isHost ? `1px solid ${GOLD}25` : "none" }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-2.5 border-t border-zinc-800 flex gap-2 flex-shrink-0">
                <Input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                  placeholder="Say something…" className="bg-zinc-800 border-zinc-700 text-white text-xs h-9 flex-1" />
                <Button size="sm" onClick={sendChat} className="h-9 w-9 p-0 flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>}

            {/* Q&A */}
            {activePanel === "qa" && <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {qaQuestions.length === 0 && (
                  <div className="text-center py-8">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                    <p className="text-xs text-zinc-600">Ask the host a question</p>
                    <p className="text-[10px] text-zinc-700 mt-1">Your question is sent privately</p>
                  </div>
                )}
                {qaQuestions.map((q, i) => (
                  <div key={q.id} className="rounded-xl p-3 space-y-1"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs text-white leading-relaxed">{q.text}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> Sent · {q.ts}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-2.5 space-y-2 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}12` }}>
                <Input value={qaInput} onChange={e => setQaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submitQuestion(); }}
                  placeholder="Type your question…" className="bg-zinc-800 border-zinc-700 text-white text-xs h-9" />
                <Button onClick={submitQuestion} className="w-full h-8 text-xs font-bold gap-1.5" style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3.5 h-3.5" /> Submit Question
                </Button>
              </div>
            </>}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}12`, background: "rgba(4,4,6,0.98)", minHeight: "60px" }}>

        {/* Reactions */}
        <div className="flex items-center gap-1">
          {REACTIONS.map(emoji => (
            <button key={emoji} onClick={() => sendReaction(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-125 active:scale-95"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {emoji}
            </button>
          ))}
        </div>

        {/* Center actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggleHand}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: handRaised ? `${GOLD}25` : "rgba(255,255,255,0.07)", color: handRaised ? GOLD : "rgba(255,255,255,0.6)", border: handRaised ? `1px solid ${GOLD}50` : "1px solid rgba(255,255,255,0.1)" }}>
            <Hand className="w-4 h-4" />
            <span className="hidden sm:inline">{handRaised ? "Lower Hand" : "Raise Hand"}</span>
          </button>
        </div>

        {/* Toggle panel */}
        <button onClick={() => setShowPanel(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: showPanel ? `${GOLD}20` : "rgba(255,255,255,0.07)", color: showPanel ? GOLD : "rgba(255,255,255,0.5)", border: showPanel ? `1px solid ${GOLD}40` : "1px solid rgba(255,255,255,0.1)" }}>
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Chat</span>
        </button>
      </div>
    </div>
  );
}
