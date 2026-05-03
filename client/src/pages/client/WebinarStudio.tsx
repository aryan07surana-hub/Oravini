import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Mic, MicOff, Video, VideoOff, Square,
  Users, MessageSquare, Copy, Check, ArrowLeft, Radio,
  Link2, Info, ExternalLink, Monitor, MonitorOff,
  HelpCircle, BookOpen, Settings2, BarChart2, Clock,
  X, Send, CheckCircle, AlertCircle, Circle, Zap,
  BarChart3, Plus, Trash2, Hand,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const QUALITY_PRESETS = {
  "720p":  { width: 1280,  height: 720,  frameRate: 30, label: "720p HD",       badge: "HD"  },
  "1080p": { width: 1920,  height: 1080, frameRate: 30, label: "1080p Full HD", badge: "FHD" },
  "4k":    { width: 3840,  height: 2160, frameRate: 30, label: "4K Ultra HD",   badge: "4K"  },
};
type Quality = keyof typeof QUALITY_PRESETS;

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80",               username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443",              username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}?autoplay=1`;
  return url;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|mov|webm|ogg|mkv)(\?.*)?$/i.test(url);
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-400 hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}


export default function WebinarStudio() {
  const params = useParams<{ id: string }>();
  const webinarId = params?.id;
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const pipRef     = useRef<HTMLVideoElement>(null);
  const camStream    = useRef<MediaStream | null>(null);
  const scrStream    = useRef<MediaStream | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [activeTab,     setActiveTab]     = useState<"chat"|"qa"|"attendees"|"notes"|"polls">("chat");
  const [showSettings,  setShowSettings]  = useState(false);
  const [cameraReady,   setCameraReady]   = useState(false);
  const [cameraError,   setCameraError]   = useState<string|null>(null);
  const [micOn,         setMicOn]         = useState(true);
  const [camOn,         setCamOn]         = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [quality,       setQuality]       = useState<Quality>("1080p");
  const [cameras,       setCameras]       = useState<MediaDeviceInfo[]>([]);
  const [mics,          setMics]          = useState<MediaDeviceInfo[]>([]);
  const [selCam,        setSelCam]        = useState("");
  const [selMic,        setSelMic]        = useState("");
  const [elapsed,       setElapsed]       = useState(0);
  const [chatMsg,       setChatMsg]       = useState("");
  const [messages,      setMessages]      = useState<{name:string;text:string;ts:string;isHost?:boolean}[]>([
    { name: "System", text: "Studio ready. Start your camera to preview, then click Go Live.", ts: format(new Date(), "h:mm a") },
  ]);
  const [qaItems,      setQaItems]      = useState<{id:string;name:string;question:string;answered:boolean;ts:string}[]>([]);
  const [attendees,    setAttendees]    = useState<{id:string;name:string;raisedHand?:boolean}[]>([]);
  const [liveCount,    setLiveCount]    = useState(0);
  const [notes,        setNotes]        = useState("");
  const [floatReacts,  setFloatReacts]  = useState<{id:string;emoji:string;x:number}[]>([]);
  const [recording,    setRecording]    = useState(false);
  const [recordingMs,  setRecordingMs]  = useState(0);
  const [uploadingRec, setUploadingRec] = useState(false);
  const mediaRecorder   = useRef<MediaRecorder | null>(null);
  const recordChunks    = useRef<Blob[]>([]);
  const [ctaActive,     setCtaActive]     = useState(false);
  const [ctaTitle,      setCtaTitle]      = useState("");
  const [ctaUrl,        setCtaUrl]        = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("Get Access Now →");
  const [showCtaPanel,  setShowCtaPanel]  = useState(false);
  const [ctaClickCount, setCtaClickCount] = useState(0);
  // ── Polls state ────────────────────────────────────────────────────────
  const [pollQuestion,  setPollQuestion]  = useState("");
  const [pollOptions,   setPollOptions]   = useState(["", ""]);
  const [activePollId,  setActivePollId]  = useState<string|null>(null);
  const [pollResults,   setPollResults]   = useState<Record<string, number[]>>({});
  const recordTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const hostConnected   = useRef(false);

  const { data: webinar, isLoading } = useQuery<any>({ queryKey: [`/api/webinars/${webinarId}`], enabled: !!webinarId });
  const { data: registrations = [] }  = useQuery<any[]>({ queryKey: [`/api/webinars/${webinarId}/registrations`], enabled: !!webinarId });
  const { data: polls = [], refetch: refetchPolls } = useQuery<any[]>({ queryKey: [`/api/webinars/${webinarId}/polls`], enabled: !!webinarId });

  const createPollMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/webinars/${webinarId}/polls`, data),
    onSuccess: () => { refetchPolls(); setPollQuestion(""); setPollOptions(["", ""]); toast({ title: "Poll created!" }); },
  });
  const deletePollMut = useMutation({
    mutationFn: (pollId: string) => apiRequest("DELETE", `/api/webinars/${webinarId}/polls/${pollId}`),
    onSuccess: () => { refetchPolls(); },
  });

  const addSys = (text: string) =>
    setMessages(m => [...m, { name: "System", text, ts: format(new Date(), "h:mm a") }]);

  // ── Floating reaction helper ─────────────────────────────────────────────
  const addFloatReact = useCallback((emoji: string) => {
    const id = Math.random().toString(36).slice(2);
    const x = Math.random() * 60 + 10;
    setFloatReacts(r => [...r, { id, emoji, x }]);
    setTimeout(() => setFloatReacts(r => r.filter(rx => rx.id !== id)), 2300);
  }, []);

  // ── WebRTC broadcasting ──────────────────────────────────────────────────
  const connectHost = useCallback(() => {
    if (!webinarId) return;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const doCreatePeer = async (viewerId: string) => {
      const videoStream = scrStream.current || camStream.current;
      const audioStream = camStream.current || scrStream.current;
      if (!videoStream) { addSys("A viewer joined but no active stream — start your camera first."); return; }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnsRef.current.set(viewerId, pc);
      videoStream.getVideoTracks().forEach(t => pc.addTrack(t, videoStream));
      audioStream?.getAudioTracks().forEach(t => pc.addTrack(t, audioStream));

      pc.onicecandidate = (evt) => {
        if (evt.candidate && ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: "wr_ice_host", webinarId, viewerId, candidate: evt.candidate }));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "wr_offer", webinarId, viewerId, sdp: pc.localDescription }));
    };

    ws.onopen = () => ws.send(JSON.stringify({ type: "wr_host_join", webinarId }));

    ws.onmessage = async (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "wr_host_ready":
            addSys("Broadcasting ready — share your watch link so attendees can join.");
            break;
          case "wr_viewer_joined": {
            await doCreatePeer(msg.viewerId);
            addSys(`${msg.name || "A viewer"} joined the live stream.`);
            break;
          }
          case "wr_answer": {
            const pc = peerConnsRef.current.get(msg.viewerId);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(() => {});
            break;
          }
          case "wr_ice": {
            const pc = peerConnsRef.current.get(msg.viewerId);
            if (pc && msg.candidate)
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
            break;
          }
          case "wr_viewer_left": {
            const pc = peerConnsRef.current.get(msg.viewerId);
            pc?.close();
            peerConnsRef.current.delete(msg.viewerId);
            break;
          }
          case "wr_chat":
            setMessages(m => [...m, msg.message]);
            break;
          case "wr_qa":
            setQaItems(q => [...q, { id: msg.question.id, name: msg.question.name, question: msg.question.text, answered: false, ts: msg.question.ts }]);
            break;
          case "wr_reaction":
            addFloatReact(msg.emoji);
            break;
          case "wr_raise_hand":
            addSys(`✋ ${msg.name} raised their hand.`);
            break;
          case "wr_attendee_update":
            setLiveCount(msg.count);
            setAttendees(msg.list || []);
            break;
          case "wr_cta_clicked":
            setCtaClickCount(c => c + 1);
            break;
          case "wr_poll_results":
            setPollResults(r => ({ ...r, [msg.pollId]: msg.votes }));
            break;
          case "wr_poll_ended":
            setActivePollId(null);
            setPollResults(r => ({ ...r, [msg.pollId]: msg.votes }));
            break;
        }
      } catch {}
    };
  }, [webinarId, addFloatReact]);

  const startMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "🔴 You are now LIVE!" });
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      addSys("Webinar started — attendees can now join!");
      hostConnected.current = true;
      connectHost();
    },
  });
  const endMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "Webinar ended." });
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorder.current?.state !== "inactive") { mediaRecorder.current?.stop(); setRecording(false); if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; } }
      if (wsRef.current?.readyState === WebSocket.OPEN)
        wsRef.current.send(JSON.stringify({ type: "wr_host_end", webinarId }));
      wsRef.current?.close();
      peerConnsRef.current.forEach(pc => pc.close());
      peerConnsRef.current.clear();
      addSys("Webinar has ended. Viewers have been notified.");
    },
  });

  const fmtElapsed = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const enumDevices = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter(d => d.kind === "videoinput");
      const micsF = devs.filter(d => d.kind === "audioinput");
      setCameras(cams); setMics(micsF);
      if (!selCam && cams[0]) setSelCam(cams[0].deviceId);
      if (!selMic && micsF[0]) setSelMic(micsF[0].deviceId);
    } catch {}
  }, [selCam, selMic]);

  const startCamera = useCallback(async (q?: Quality) => {
    const preset = QUALITY_PRESETS[q || quality];
    try {
      camStream.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selCam ? { ideal: selCam } : undefined, width: { ideal: preset.width }, height: { ideal: preset.height }, frameRate: { ideal: preset.frameRate } },
        audio: { deviceId: selMic ? { ideal: selMic } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      camStream.current = stream;
      if (!screenSharing && videoRef.current) videoRef.current.srcObject = stream;
      if (screenSharing && pipRef.current)   pipRef.current.srcObject = stream;
      setCameraReady(true); setCameraError(null); setMicOn(true); setCamOn(true);
      await enumDevices();
    } catch (e: any) {
      setCameraError(e.name === "NotAllowedError"
        ? "Camera & mic access denied. Please allow permissions in your browser settings."
        : "Could not access camera or microphone. Check your device is connected.");
    }
  }, [quality, selCam, selMic, screenSharing, enumDevices]);

  const toggleMic = useCallback(() => {
    camStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(m => !m);
  }, []);

  const toggleCam = useCallback(() => {
    camStream.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(c => !c);
  }, []);

  const startScreen = useCallback(async () => {
    const preset = QUALITY_PRESETS[quality];
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: { ideal: preset.width }, height: { ideal: preset.height }, frameRate: { ideal: 30 } },
        audio: true,
      });
      scrStream.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (camStream.current && pipRef.current) pipRef.current.srcObject = camStream.current;
      setScreenSharing(true);
      addSys("Screen sharing started.");
      const screenVideoTrack = stream.getVideoTracks()[0];
      if (screenVideoTrack) {
        peerConnsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenVideoTrack).catch(() => {});
        });
        screenVideoTrack.addEventListener("ended", stopScreen);
      }
    } catch {}
  }, [quality]);

  const stopScreen = useCallback(() => {
    scrStream.current?.getTracks().forEach(t => t.stop());
    scrStream.current = null;
    if (videoRef.current && camStream.current) videoRef.current.srcObject = camStream.current;
    setScreenSharing(false);
    addSys("Screen sharing stopped.");
    if (camStream.current) {
      const camVideoTrack = camStream.current.getVideoTracks()[0];
      if (camVideoTrack) {
        peerConnsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(camVideoTrack).catch(() => {});
        });
      }
    }
  }, []);

  const changeQuality = async (q: Quality) => { setQuality(q); if (cameraReady) await startCamera(q); };

  const getRecordingStream = (): MediaStream | null => {
    const tracks: MediaStreamTrack[] = [];
    if (scrStream.current) {
      scrStream.current.getVideoTracks().forEach(t => tracks.push(t));
      if (camStream.current) camStream.current.getAudioTracks().forEach(t => tracks.push(t));
      else scrStream.current.getAudioTracks().forEach(t => tracks.push(t));
    } else if (camStream.current) {
      camStream.current.getTracks().forEach(t => tracks.push(t));
    }
    return tracks.length > 0 ? new MediaStream(tracks) : null;
  };

  const startRecording = () => {
    const stream = getRecordingStream();
    if (!stream) { toast({ title: "Start your camera or screen first", variant: "destructive" }); return; }
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(stream, { mimeType });
    recordChunks.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunks.current.push(e.data); };
    mr.onstop = uploadRecording;
    mr.start(5000);
    mediaRecorder.current = mr;
    setRecording(true);
    setRecordingMs(0);
    recordTimer.current = setInterval(() => setRecordingMs(s => s + 1), 1000);
    toast({ title: "🔴 Recording started" });
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
  };

  const uploadRecording = async () => {
    if (recordChunks.current.length === 0) return;
    setUploadingRec(true);
    try {
      const blob = new Blob(recordChunks.current, { type: "video/webm" });
      const formData = new FormData();
      formData.append("file", blob, `webinar-${webinarId}-${Date.now()}.webm`);
      formData.append("webinarId", webinarId || "");
      formData.append("title", `${webinar?.title || "Webinar"} Recording`);
      formData.append("duration", String(recordingMs));
      const resp = await fetch(`/api/webinars/${webinarId}/recording/upload`, { method: "POST", body: formData });
      if (!resp.ok) throw new Error("Upload failed");
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "✅ Recording saved! Replay is now available." });
    } catch {
      toast({ title: "Recording upload failed", variant: "destructive" });
    } finally {
      setUploadingRec(false);
      recordChunks.current = [];
    }
  };

  const isLive = webinar?.status === "live";
  const isJic  = webinar?.webinarType === "jic";

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "ws-float-anim";
    style.textContent = `
      @keyframes wsFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 80%{opacity:.7;transform:translateY(-90px) scale(1.4)} 100%{opacity:0;transform:translateY(-130px) scale(1.6)} }
      .ws-float { animation: wsFloat 2.2s ease-out forwards; pointer-events:none; position:absolute; font-size:2rem; z-index:40; }
    `;
    if (!document.getElementById("ws-float-anim")) document.head.appendChild(style);
    return () => { document.getElementById("ws-float-anim")?.remove(); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (webinar?.status === "live" && webinarId && !hostConnected.current) {
      hostConnected.current = true;
      if (!timerRef.current) timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      connectHost();
    }
  }, [webinar?.status, webinarId, connectHost]);

  useEffect(() => () => {
    camStream.current?.getTracks().forEach(t => t.stop());
    scrStream.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordTimer.current) clearInterval(recordTimer.current);
    if (mediaRecorder.current?.state !== "inactive") mediaRecorder.current?.stop();
    wsRef.current?.close();
    peerConnsRef.current.forEach(pc => pc.close());
    peerConnsRef.current.clear();
  }, []);

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    const msg = { name: "Host", text: chatMsg.trim(), ts: format(new Date(), "h:mm a"), isHost: true };
    setMessages(m => [...m, msg]);
    setChatMsg("");
    if (wsRef.current?.readyState === WebSocket.OPEN && webinarId)
      wsRef.current.send(JSON.stringify({ type: "wr_chat", webinarId, ...msg }));
  };

  const launchCta = () => {
    if (!ctaUrl.trim() || !ctaTitle.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "wr_cta_launch", webinarId, title: ctaTitle, url: ctaUrl, buttonText: ctaButtonText || "Get Access Now →" }));
    setCtaActive(true);
    setCtaClickCount(0);
    setShowCtaPanel(false);
  };

  const hideCta = () => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "wr_cta_hide", webinarId }));
    setCtaActive(false);
  };
  const markAnswered = (id: string) =>
    setQaItems(items => items.map(i => i.id === id ? { ...i, answered: true } : i));
  const lowerHand = (viewerId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && webinarId)
      wsRef.current.send(JSON.stringify({ type: "wr_lower_hand", webinarId, viewerId }));
    setAttendees(a => a.map(v => v.id === viewerId ? { ...v, raisedHand: false } : v));
  };

  const baseUrl  = window.location.origin;
  const joinLink = webinar?.meetingCode ? `${baseUrl}/watch/${webinar.meetingCode}` : "";
  const replayUrl = webinar?.replayVideoUrl ? getEmbedUrl(webinar.replayVideoUrl) : "";
  const directVideo = webinar?.replayVideoUrl ? isDirectVideo(webinar.replayVideoUrl) : false;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );
  if (!webinar) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#040406" }}>
      <p className="text-zinc-400">Webinar not found.</p>
      <Button onClick={() => nav("/video-marketing")} variant="ghost" className="text-zinc-400">← Back</Button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#040406", color: "#fff" }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 z-50" style={{ background: "rgba(4,4,6,0.98)", borderBottom: `1px solid ${GOLD}14` }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => nav("/video-marketing")} className="text-zinc-500 hover:text-white transition-colors p-1 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate max-w-56">{webinar.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {isLive ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE · {fmtElapsed(elapsed)}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  {webinar.scheduledAt ? format(new Date(webinar.scheduledAt), "MMM d, h:mm a") : "Not scheduled"}
                </span>
              )}
              <Badge className="text-[10px] px-1.5 py-0 border-none h-4 flex-shrink-0"
                style={{ background: isJic ? `${GOLD}22` : "#3b82f622", color: isJic ? GOLD : "#60a5fa" }}>
                {isJic ? "JIC Auto" : "Live"}
              </Badge>
              <Badge className="text-[9px] px-1.5 py-0 border-none h-4 bg-zinc-800 text-zinc-400 flex-shrink-0">
                {QUALITY_PRESETS[quality].badge}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:flex items-center gap-1 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            {isLive ? liveCount : (registrations as any[]).length}
            {isLive && liveCount > 0 && <span className="text-[10px] text-green-400 font-bold ml-0.5">live</span>}
          </span>
          {joinLink && (
            <div className="hidden lg:flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-400 max-w-52">
              <Link2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{joinLink}</span>
              <CopyBtn text={joinLink} />
              <a href={joinLink} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <button
            onClick={() => nav(`/webinar-studio/${webinarId}/analytics`)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            title="Analytics">
            <BarChart2 className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
            <Settings2 className="w-4 h-4" />
          </button>
          {!isLive ? (
            <Button size="sm" className="gap-1.5 font-bold px-4 h-8" style={{ background: "#ef4444", color: "#fff" }}
              onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              <Radio className="w-3.5 h-3.5" /> Go Live
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 font-semibold h-8 bg-zinc-700 hover:bg-zinc-600 text-white"
              onClick={() => endMut.mutate()} disabled={endMut.isPending}>
              <Square className="w-3.5 h-3.5" /> End
            </Button>
          )}
        </div>
      </div>

      {/* ── SETTINGS OVERLAY ── */}
      {showSettings && (
        <div className="absolute right-4 top-14 z-50 w-72 rounded-2xl border border-zinc-700 shadow-2xl p-5 space-y-5" style={{ background: "#121215" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Studio Settings</p>
            <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Video Quality</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(QUALITY_PRESETS) as Quality[]).map(q => (
                <button key={q} onClick={() => changeQuality(q)}
                  className="py-2 rounded-xl text-xs font-black transition-all"
                  style={{ background: quality === q ? GOLD : "rgba(255,255,255,0.06)", color: quality === q ? "#000" : "rgba(255,255,255,0.5)" }}>
                  {QUALITY_PRESETS[q].badge}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">{QUALITY_PRESETS[quality].label} · {QUALITY_PRESETS[quality].width}×{QUALITY_PRESETS[quality].height}@{QUALITY_PRESETS[quality].frameRate}fps</p>
          </div>

          {cameras.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Camera</p>
              <select value={selCam} onChange={e => { setSelCam(e.target.value); if (cameraReady) startCamera(); }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white px-2.5 py-1.5">
                {cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
              </select>
            </div>
          )}

          {mics.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Microphone</p>
              <select value={selMic} onChange={e => setSelMic(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white px-2.5 py-1.5">
                {mics.map((m, i) => <option key={m.deviceId} value={m.deviceId}>{m.label || `Mic ${i + 1}`}</option>)}
              </select>
            </div>
          )}

          <div className="rounded-xl p-3" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              <span style={{ color: GOLD }} className="font-semibold">4K note:</span> Host preview supports 4K. To broadcast 4K to viewers requires a streaming service (Agora, Daily.co, Mux). Connect one in Settings to enable viewer broadcasting.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Broadcast URL — Unlimited Viewers</p>
            <input
              value={webinar?.broadcastUrl || ""}
              onChange={async (e) => {
                const val = e.target.value;
                try {
                  await fetch(`/api/webinars/${webinarId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ broadcastUrl: val }),
                  });
                } catch {}
              }}
              placeholder="HLS .m3u8, YouTube Live or RTMP embed URL"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white px-2.5 py-1.5 outline-none focus:border-zinc-500"
            />
            <p className="text-[10px] text-zinc-600 mt-1">Viewers stream this URL via HLS.js. Leave blank to use WebRTC (max ~50 viewers).</p>
          </div>

          {/* ── Waiting Room ── */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Waiting Room
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-zinc-500 mb-1">Background Video URL (optional)</p>
                <input
                  defaultValue={webinar?.waitingRoomVideoUrl || ""}
                  onBlur={async (e) => {
                    try {
                      await fetch(`/api/webinars/${webinarId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ waitingRoomVideoUrl: e.target.value || null }),
                      });
                    } catch {}
                  }}
                  placeholder="https://…/ambient-loop.mp4"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-white px-2.5 py-1.5 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 mb-1">Custom Message (optional)</p>
                <textarea
                  defaultValue={webinar?.waitingRoomMessage || ""}
                  onBlur={async (e) => {
                    try {
                      await fetch(`/api/webinars/${webinarId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ waitingRoomMessage: e.target.value || null }),
                      });
                    } catch {}
                  }}
                  rows={2}
                  placeholder="Get ready — we start in a moment!"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-white px-2.5 py-1.5 outline-none focus:border-zinc-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CTA OFFER PANEL ── */}
      {showCtaPanel && !ctaActive && (
        <div className="absolute right-4 top-14 z-50 w-80 rounded-2xl border border-zinc-700 shadow-2xl p-5 space-y-4" style={{ background: "#121215" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
                <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} />
              </div>
              <p className="text-sm font-bold text-white">Launch Offer CTA</p>
            </div>
            <button onClick={() => setShowCtaPanel(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">Instantly pushes a clickable offer banner to every live viewer. You can hide it at any time.</p>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Offer Title</label>
              <Input
                value={ctaTitle}
                onChange={e => setCtaTitle(e.target.value)}
                placeholder="Join The Inner Circle — 50% Off Tonight Only"
                className="bg-zinc-800 border-zinc-700 text-white text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Button Text</label>
              <Input
                value={ctaButtonText}
                onChange={e => setCtaButtonText(e.target.value)}
                placeholder="Get Access Now →"
                className="bg-zinc-800 border-zinc-700 text-white text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Buyer Page URL</label>
              <Input
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://checkout.yoursite.com/offer"
                className="bg-zinc-800 border-zinc-700 text-white text-xs h-8"
              />
            </div>
          </div>

          <Button
            onClick={launchCta}
            disabled={!ctaTitle.trim() || !ctaUrl.trim()}
            className="w-full h-9 font-black text-sm gap-2 disabled:opacity-40"
            style={{ background: GOLD, color: "#000" }}>
            <Zap className="w-4 h-4" /> Push Offer to All Viewers
          </Button>
          <p className="text-[10px] text-zinc-600 text-center">Only visible to you. Viewers see the offer banner with a pulsing gold button.</p>
        </div>
      )}

      {/* ── CTA ACTIVE STATUS ── */}
      {ctaActive && (
        <div className="absolute right-4 top-14 z-40 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border shadow-lg"
          style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}40` }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: GOLD }} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>CTA Live</span>
            <span className="text-[10px] text-zinc-400">{ctaClickCount} click{ctaClickCount !== 1 ? "s" : ""} so far</span>
          </div>
          <button onClick={hideCta} className="ml-1 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors underline underline-offset-2">Hide</button>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── STAGE ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative bg-black overflow-hidden">

            {isJic ? (
              replayUrl ? (
                directVideo ? (
                  <video src={replayUrl} className="w-full h-full object-contain" controls autoPlay={isLive} playsInline />
                ) : (
                  <iframe src={replayUrl} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media" allowFullScreen title="Webinar video" />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <Info className="w-12 h-12 text-zinc-700" />
                  <div>
                    <p className="text-sm text-zinc-400 font-semibold mb-1">No replay video linked</p>
                    <p className="text-xs text-zinc-600">Edit this webinar and add a video from your library or a YouTube/Vimeo URL.</p>
                  </div>
                </div>
              )
            ) : (
              <>
                {cameraReady || screenSharing ? (
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
                    {cameraError ? (
                      <>
                        <AlertCircle className="w-14 h-14 text-red-500" />
                        <div className="text-center max-w-sm">
                          <p className="text-sm font-bold text-white mb-2">Camera Access Required</p>
                          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{cameraError}</p>
                          <Button size="sm" onClick={() => startCamera()} style={{ background: GOLD, color: "#000" }} className="font-bold">Try Again</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: `${GOLD}12`, border: `2px solid ${GOLD}35` }}>
                          <Video className="w-10 h-10" style={{ color: GOLD }} />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-white mb-1">Start Camera Preview</p>
                          <p className="text-xs text-zinc-500 mb-5">Your browser will ask for camera and microphone permission</p>
                          <div className="flex items-center justify-center gap-3">
                            <Button onClick={() => startCamera()} style={{ background: GOLD, color: "#000" }} className="font-bold gap-2">
                              <Video className="w-4 h-4" /> Start Camera
                            </Button>
                            <Button variant="outline" onClick={startScreen} className="border-zinc-700 text-zinc-300 gap-2">
                              <Monitor className="w-4 h-4" /> Share Screen
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {screenSharing && cameraReady && (
                  <div className="absolute bottom-4 right-4 w-44 h-32 rounded-2xl overflow-hidden shadow-2xl" style={{ border: "2px solid rgba(255,255,255,0.15)" }}>
                    <video ref={pipRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute inset-0 flex items-end justify-end p-1.5">
                      <span className="text-[9px] text-white bg-black/60 px-1.5 py-0.5 rounded">Camera</span>
                    </div>
                  </div>
                )}

                {/* Floating reactions overlay */}
                {floatReacts.map(r => (
                  <span key={r.id} className="ws-float" style={{ left: `${r.x}%`, bottom: "70px" }}>{r.emoji}</span>
                ))}

                {isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE · {fmtElapsed(elapsed)}
                  </div>
                )}
                {isLive && liveCount > 0 && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Users className="w-3 h-3" /> {liveCount} watching
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── CONTROLS (live mode only) ── */}
          {!isJic && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}12`, background: "#040406" }}>
              {[
                { icon: micOn ? Mic : MicOff, label: micOn ? "Mute" : "Muted", active: !micOn, onClick: toggleMic, disabled: !cameraReady },
                { icon: camOn ? Video : VideoOff, label: camOn ? "Camera" : "Off", active: !camOn, onClick: toggleCam, disabled: !cameraReady },
              ].map(({ icon: Icon, label, active, onClick, disabled }) => (
                <button key={label} onClick={onClick} disabled={disabled}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all disabled:opacity-40"
                  style={{ background: active ? "#ef444428" : "rgba(255,255,255,0.06)", border: `1px solid ${active ? "#ef4444" : "rgba(255,255,255,0.1)"}` }}>
                  <Icon className="w-5 h-5" style={{ color: active ? "#f87171" : "#fff" }} />
                  <span className="text-[9px] text-zinc-500">{label}</span>
                </button>
              ))}

              <button onClick={screenSharing ? stopScreen : startScreen}
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                style={{ background: screenSharing ? `${GOLD}20` : "rgba(255,255,255,0.06)", border: `1px solid ${screenSharing ? GOLD : "rgba(255,255,255,0.1)"}` }}>
                {screenSharing ? <MonitorOff className="w-5 h-5" style={{ color: GOLD }} /> : <Monitor className="w-5 h-5 text-white" />}
                <span className="text-[9px] text-zinc-500">{screenSharing ? "Unshare" : "Screen"}</span>
              </button>

              <div className="w-px h-8 bg-zinc-800" />

              <button onClick={() => setShowSettings(s => !s)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-sm font-black" style={{ color: GOLD }}>{QUALITY_PRESETS[quality].badge}</span>
                <span className="text-[9px] text-zinc-500">Quality</span>
              </button>

              <div className="w-px h-8 bg-zinc-800" />

              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={!cameraReady && !screenSharing}
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all disabled:opacity-40"
                style={{ background: recording ? "#ef444428" : "rgba(255,255,255,0.06)", border: `1px solid ${recording ? "#ef4444" : "rgba(255,255,255,0.1)"}` }}>
                <Circle className="w-5 h-5" style={{ color: recording ? "#f87171" : "#fff", fill: recording ? "#f87171" : "transparent" }} />
                <span className="text-[9px] text-zinc-500">
                  {uploadingRec ? "Saving…" : recording ? fmtElapsed(recordingMs) : "Record"}
                </span>
              </button>

              {isLive && (
                <>
                  <div className="w-px h-8 bg-zinc-800" />
                  <button
                    onClick={() => ctaActive ? hideCta() : setShowCtaPanel(s => !s)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative"
                    style={{
                      background: ctaActive ? `${GOLD}25` : showCtaPanel ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${ctaActive ? GOLD : showCtaPanel ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    <Zap className="w-5 h-5" style={{ color: ctaActive ? GOLD : "#fff" }} />
                    <span className="text-[9px] text-zinc-500">{ctaActive ? "Hide CTA" : "Offer"}</span>
                    {ctaActive && ctaClickCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center text-black" style={{ background: GOLD }}>
                        {ctaClickCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {!cameraReady && !screenSharing && (
                <Button size="sm" onClick={() => startCamera()} className="ml-2 gap-1.5 font-bold h-9" style={{ background: GOLD, color: "#000" }}>
                  <Video className="w-4 h-4" /> Start Camera
                </Button>
              )}
            </div>
          )}

          {isJic && (
            <div className="px-4 py-2.5 flex-shrink-0 flex items-center gap-3" style={{ borderTop: `1px solid ${GOLD}12`, background: "#040406" }}>
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
              <p className="text-xs text-zinc-400">
                <span className="font-semibold" style={{ color: GOLD }}>JIC Automated:</span> Video plays to attendees as a live experience with simulated chat activity.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-72 xl:w-80 flex flex-col flex-shrink-0" style={{ borderLeft: `1px solid ${GOLD}12`, background: "#0c0c10" }}>
          {/* Tabs */}
          <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
            {([
              ["chat",      "Chat",     MessageSquare],
              ["qa",        "Q&A",      HelpCircle],
              ["attendees", "People",   Users],
              ["notes",     "Notes",    BookOpen],
              ["polls",     "Polls",    BarChart3],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex-1 py-2.5 text-[10px] font-bold flex flex-col items-center gap-0.5 transition-colors"
                style={{ color: activeTab === id ? GOLD : "rgba(255,255,255,0.3)", borderBottom: activeTab === id ? `2px solid ${GOLD}` : "2px solid transparent" }}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">

            {/* CHAT */}
            {activeTab === "chat" && <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col gap-0.5 ${m.isHost ? "items-end" : ""}`}>
                    <span className="text-[10px] font-semibold" style={{ color: m.name === "System" ? "#52525b" : m.isHost ? GOLD : "#60a5fa" }}>{m.name}</span>
                    <div className="px-2.5 py-1.5 rounded-xl max-w-[92%] text-xs leading-relaxed"
                      style={{ background: m.name === "System" ? "rgba(255,255,255,0.04)" : m.isHost ? `${GOLD}18` : "rgba(255,255,255,0.07)" }}>
                      {m.text}
                    </div>
                    <span className="text-[9px] text-zinc-700">{m.ts}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-2.5 flex gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}12` }}>
                <Input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                  placeholder="Message attendees…" className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 flex-1" />
                <Button size="sm" onClick={sendChat} className="h-8 px-2.5 flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>}

            {/* Q&A */}
            {activeTab === "qa" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {qaItems.length === 0 ? (
                  <div className="text-center py-10">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                    <p className="text-xs text-zinc-600">No questions yet</p>
                    <p className="text-[10px] text-zinc-700 mt-1">Live questions from attendees appear here</p>
                  </div>
                ) : qaItems.map(item => (
                  <div key={item.id} className="rounded-xl p-3 space-y-1.5"
                    style={{ background: item.answered ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${item.answered ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold" style={{ color: GOLD }}>{item.name}</p>
                        <p className="text-xs text-white mt-0.5 leading-relaxed">{item.question}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{item.ts}</p>
                      </div>
                      {!item.answered && (
                        <button onClick={() => markAnswered(item.id)} title="Mark answered"
                          className="text-zinc-600 hover:text-green-400 transition-colors flex-shrink-0 mt-0.5">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {item.answered && <p className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Answered</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ATTENDEES */}
            {activeTab === "attendees" && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-400 font-semibold">
                    {isLive ? `${liveCount} live` : `${(registrations as any[]).length} registered`}
                  </p>
                  {attendees.filter(a => a.raisedHand).length > 0 && (
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      ✋ {attendees.filter(a => a.raisedHand).length} hand{attendees.filter(a => a.raisedHand).length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Raised hands section */}
                {attendees.filter(a => a.raisedHand).length > 0 && (
                  <div className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(251,191,36,0.25)" }}>
                    <div className="px-2.5 py-1.5" style={{ background: "rgba(251,191,36,0.08)" }}>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">✋ Raised Hands</p>
                    </div>
                    {attendees.filter(a => a.raisedHand).map((a, i) => (
                      <div key={a.id || i} className="flex items-center justify-between px-2.5 py-2 border-t border-amber-400/10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: `hsl(${(i * 67) % 360}, 50%, 35%)` }}>{a.name.charAt(0)}</div>
                          <span className="text-xs text-white">{a.name}</span>
                        </div>
                        <button onClick={() => lowerHand(a.id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors"
                          style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                          Lower
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  {attendees.filter(a => !a.raisedHand).map((a, i) => (
                    <div key={a.id || i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: "rgba(52,211,153,0.05)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: `hsl(${(i * 53) % 360}, 45%, 35%)` }}>{a.name.charAt(0)}</div>
                      <span className="text-xs text-white truncate">{a.name}</span>
                      <span className="ml-auto text-[9px] text-green-400 flex items-center gap-0.5 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> live
                      </span>
                    </div>
                  ))}
                  {attendees.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs text-zinc-600">{isLive ? "Waiting for attendees to join" : "No attendees yet"}</p>
                    </div>
                  )}
                  {!isLive && (registrations as any[]).length > 0 && (
                    <>
                      <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider mt-3 mb-1">Registered</p>
                      {(registrations as any[]).map((r: any, i: number) => (
                        <div key={r.id || i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 bg-zinc-800 flex-shrink-0">
                            {(r.name || "?").charAt(0)}
                          </div>
                          <span className="text-xs text-zinc-400 truncate">{r.name || "Anonymous"}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* NOTES */}
            {activeTab === "notes" && (
              <div className="flex-1 flex flex-col p-3 gap-2">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Presenter Notes (private)</p>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={"Your talking points, key stats, reminders...\n\nOnly you can see this."}
                  className="flex-1 text-white text-xs resize-none leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}14` }} />
              </div>
            )}

            {/* POLLS */}
            {activeTab === "polls" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Create Poll Form */}
                <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
                  <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: `${GOLD}55` }}>Create Poll</p>
                  <input
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="What's your question?"
                    className="w-full bg-zinc-800/80 border border-zinc-700 text-white text-xs px-2.5 py-2 rounded-lg mb-2 outline-none focus:border-zinc-500"
                  />
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1 mb-1">
                      <input
                        value={opt}
                        onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 bg-zinc-800/80 border border-zinc-700 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-zinc-500"
                      />
                      {pollOptions.length > 2 && (
                        <button onClick={() => setPollOptions(o => o.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button onClick={() => setPollOptions(o => [...o, ""])} className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 hover:text-white transition-colors">
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const validOpts = pollOptions.filter(o => o.trim());
                      if (!pollQuestion.trim() || validOpts.length < 2) return toast({ title: "Question + 2 options required", variant: "destructive" });
                      createPollMut.mutate({ question: pollQuestion.trim(), options: validOpts, isActive: false, showResults: false });
                    }}
                    disabled={createPollMut.isPending}
                    className="w-full mt-2.5 py-1.5 rounded-lg text-xs font-black transition-all hover:opacity-90"
                    style={{ background: GOLD, color: "#000" }}
                  >
                    {createPollMut.isPending ? "Creating…" : "+ Create Poll"}
                  </button>
                </div>

                {/* Poll List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(polls as any[]).length === 0 ? (
                    <div className="text-center py-10">
                      <BarChart3 className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs text-zinc-600">No polls yet</p>
                      <p className="text-[10px] text-zinc-700 mt-1">Create a poll above</p>
                    </div>
                  ) : (polls as any[]).map((poll: any) => {
                    const isActive = activePollId === poll.id;
                    const results = pollResults[poll.id] || new Array((poll.options || []).length).fill(0);
                    const totalVotes = results.reduce((s: number, v: number) => s + v, 0);
                    return (
                      <div key={poll.id} className="rounded-xl overflow-hidden"
                        style={{ background: isActive ? `${GOLD}08` : "rgba(255,255,255,0.03)", border: `1px solid ${isActive ? GOLD + "35" : "rgba(255,255,255,0.06)"}` }}>
                        <div className="p-2.5">
                          {isActive && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Live · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
                            </div>
                          )}
                          <p className="text-xs font-bold text-white mb-2 leading-tight">{poll.question}</p>
                          {isActive && totalVotes > 0 ? (
                            <div className="space-y-1.5 mb-2">
                              {(poll.options || []).map((opt: string, i: number) => {
                                const pct = totalVotes > 0 ? Math.round((results[i] || 0) / totalVotes * 100) : 0;
                                return (
                                  <div key={i}>
                                    <div className="flex justify-between text-[10px] mb-0.5">
                                      <span className="text-zinc-400 truncate">{opt}</span>
                                      <span className="font-bold ml-2 flex-shrink-0" style={{ color: GOLD }}>{pct}%</span>
                                    </div>
                                    <div className="h-1 rounded-full overflow-hidden bg-zinc-800">
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: GOLD }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {(poll.options || []).map((opt: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{opt}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            {!isActive ? (
                              <button
                                onClick={() => {
                                  if (wsRef.current?.readyState !== WebSocket.OPEN) return toast({ title: "Not live yet", variant: "destructive" });
                                  wsRef.current.send(JSON.stringify({ type: "wr_poll_launch", webinarId, pollId: poll.id, question: poll.question, options: poll.options }));
                                  setActivePollId(poll.id);
                                  setPollResults(r => ({ ...r, [poll.id]: new Array((poll.options || []).length).fill(0) }));
                                  toast({ title: "Poll launched! 🗳️" });
                                }}
                                className="flex-1 py-1 rounded-lg text-[10px] font-black transition-all hover:opacity-90"
                                style={{ background: GOLD, color: "#000" }}>
                                ▶ Launch
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                                  wsRef.current.send(JSON.stringify({ type: "wr_poll_end", webinarId, pollId: poll.id, options: poll.options }));
                                  setActivePollId(null);
                                  toast({ title: "Poll ended" });
                                }}
                                className="flex-1 py-1 rounded-lg text-[10px] font-black text-white transition-all hover:opacity-90"
                                style={{ background: "#ef4444" }}>
                                ■ End Poll
                              </button>
                            )}
                            <button onClick={() => deletePollMut.mutate(poll.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
