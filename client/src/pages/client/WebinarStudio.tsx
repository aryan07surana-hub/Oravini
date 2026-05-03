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
  HelpCircle, BookOpen, Settings2,
  X, Send, CheckCircle, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const QUALITY_PRESETS = {
  "720p":  { width: 1280,  height: 720,  frameRate: 30, label: "720p HD",       badge: "HD"  },
  "1080p": { width: 1920,  height: 1080, frameRate: 30, label: "1080p Full HD", badge: "FHD" },
  "4k":    { width: 3840,  height: 2160, frameRate: 30, label: "4K Ultra HD",   badge: "4K"  },
};
type Quality = keyof typeof QUALITY_PRESETS;

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

const AUTO_CHAT = [
  "This is amazing, thank you!", "Can you go over that last part?",
  "Wow this is exactly what I needed", "How long is the replay available?",
  "Great content 🔥", "Is there a workbook for this?",
  "This will change my business!", "Does this work for physical products?",
  "Love the breakdown, super clear", "What tool are you using for that?",
];
const AUTO_NAMES = ["Sarah K", "Mike R", "Priya M", "James T", "Anna L", "David C", "Lisa W", "Tom B", "Emma G", "Ryan H"];

export default function WebinarStudio() {
  const params = useParams<{ id: string }>();
  const webinarId = params?.id;
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const pipRef     = useRef<HTMLVideoElement>(null);
  const camStream  = useRef<MediaStream | null>(null);
  const scrStream  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeTab,     setActiveTab]     = useState<"chat"|"qa"|"attendees"|"notes">("chat");
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
  const [qaItems,    setQaItems]    = useState<{id:number;name:string;question:string;answered:boolean}[]>([]);
  const [qaInput,    setQaInput]    = useState("");
  const [attendees,  setAttendees]  = useState<{name:string;joinedAt:string}[]>([]);
  const [notes,      setNotes]      = useState("");

  const { data: webinar, isLoading } = useQuery<any>({ queryKey: [`/api/webinars/${webinarId}`], enabled: !!webinarId });
  const { data: registrations = [] }  = useQuery<any[]>({ queryKey: [`/api/webinars/${webinarId}/registrations`], enabled: !!webinarId });

  const startMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "🔴 You are now LIVE!" });
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      addSys("Webinar started — attendees can now join!");
    },
  });
  const endMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}`] });
      toast({ title: "Webinar ended." });
      if (timerRef.current) clearInterval(timerRef.current);
      addSys("Webinar has ended.");
    },
  });

  const addSys = (text: string) =>
    setMessages(m => [...m, { name: "System", text, ts: format(new Date(), "h:mm a") }]);

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
      stream.getVideoTracks()[0].addEventListener("ended", stopScreen);
    } catch {}
  }, [quality]);

  const stopScreen = useCallback(() => {
    scrStream.current?.getTracks().forEach(t => t.stop());
    scrStream.current = null;
    if (videoRef.current && camStream.current) videoRef.current.srcObject = camStream.current;
    setScreenSharing(false);
    addSys("Screen sharing stopped.");
  }, []);

  const changeQuality = async (q: Quality) => { setQuality(q); if (cameraReady) await startCamera(q); };

  const isLive = webinar?.status === "live";
  const isJic  = webinar?.webinarType === "jic";

  useEffect(() => {
    if (!isLive || !isJic) return;
    let i = 0;
    const iv = setInterval(() => {
      const idx = (i * 7) % AUTO_CHAT.length, nIdx = (i * 3) % AUTO_NAMES.length;
      setMessages(m => [...m, { name: AUTO_NAMES[nIdx], text: AUTO_CHAT[idx], ts: format(new Date(), "h:mm a") }]);
      i++; if (i >= 10) clearInterval(iv);
    }, 14000);
    return () => clearInterval(iv);
  }, [isLive, isJic]);

  useEffect(() => {
    if (!isLive) return;
    const total = Math.max((registrations as any[]).length, 6);
    let j = 0;
    const iv = setInterval(() => {
      if (j >= total) { clearInterval(iv); return; }
      setAttendees(prev => [...prev, { name: AUTO_NAMES[j % AUTO_NAMES.length] + (j >= 10 ? ` ${j}` : ""), joinedAt: format(new Date(), "h:mm a") }]);
      j++;
    }, 9000);
    return () => clearInterval(iv);
  }, [isLive, registrations]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => () => {
    camStream.current?.getTracks().forEach(t => t.stop());
    scrStream.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setMessages(m => [...m, { name: "You (Host)", text: chatMsg.trim(), ts: format(new Date(), "h:mm a"), isHost: true }]);
    setChatMsg("");
  };
  const submitQA = () => {
    if (!qaInput.trim()) return;
    setQaItems(items => [...items, { id: Date.now(), name: "Test Q", question: qaInput.trim(), answered: false }]);
    setQaInput("");
  };
  const markAnswered = (id: number) =>
    setQaItems(items => items.map(i => i.id === id ? { ...i, answered: true } : i));

  const baseUrl  = window.location.origin;
  const joinLink = webinar?.meetingCode ? `${baseUrl}/join/${webinar.meetingCode}` : "";
  const replayUrl = webinar?.replayVideoUrl ? getEmbedUrl(webinar.replayVideoUrl) : "";
  const directVideo = webinar?.replayVideoUrl ? isDirectVideo(webinar.replayVideoUrl) : false;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#09090b" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );
  if (!webinar) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "#09090b" }}>
      <p className="text-zinc-400">Webinar not found.</p>
      <Button onClick={() => nav("/video-marketing")} variant="ghost" className="text-zinc-400">← Back</Button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#09090b", color: "#fff" }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950 flex-shrink-0 z-50">
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
            <Users className="w-3.5 h-3.5" />{(registrations as any[]).length + attendees.length}
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

                {isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE · {fmtElapsed(elapsed)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── CONTROLS (live mode only) ── */}
          {!isJic && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
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

              {!cameraReady && !screenSharing && (
                <Button size="sm" onClick={() => startCamera()} className="ml-2 gap-1.5 font-bold h-9" style={{ background: GOLD, color: "#000" }}>
                  <Video className="w-4 h-4" /> Start Camera
                </Button>
              )}
            </div>
          )}

          {isJic && (
            <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950 flex-shrink-0 flex items-center gap-3">
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
              <p className="text-xs text-zinc-400">
                <span className="font-semibold" style={{ color: GOLD }}>JIC Automated:</span> Video plays to attendees as a live experience with simulated chat activity.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-72 xl:w-80 border-l border-zinc-800 flex flex-col bg-zinc-950 flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 flex-shrink-0">
            {([
              ["chat",      "Chat",     MessageSquare],
              ["qa",        "Q&A",      HelpCircle],
              ["attendees", "People",   Users],
              ["notes",     "Notes",    BookOpen],
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
              <div className="p-2.5 border-t border-zinc-800 flex gap-2 flex-shrink-0">
                <Input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                  placeholder="Message attendees…" className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 flex-1" />
                <Button size="sm" onClick={sendChat} className="h-8 px-2.5 flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>}

            {/* Q&A */}
            {activeTab === "qa" && <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {qaItems.length === 0 && (
                  <div className="text-center py-10">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                    <p className="text-xs text-zinc-600">No questions yet</p>
                    <p className="text-[10px] text-zinc-700 mt-1">Attendee questions appear here</p>
                  </div>
                )}
                {qaItems.map(item => (
                  <div key={item.id} className="rounded-xl p-3 space-y-1.5"
                    style={{ background: item.answered ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${item.answered ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold text-zinc-400">{item.name}</p>
                        <p className="text-xs text-white mt-0.5 leading-relaxed">{item.question}</p>
                      </div>
                      {!item.answered && (
                        <button onClick={() => markAnswered(item.id)} title="Mark answered"
                          className="text-zinc-600 hover:text-green-400 transition-colors flex-shrink-0">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {item.answered && <p className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Answered</p>}
                  </div>
                ))}
              </div>
              <div className="p-2.5 border-t border-zinc-800 flex gap-2 flex-shrink-0">
                <Input value={qaInput} onChange={e => setQaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submitQA(); }}
                  placeholder="Test a question…" className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 flex-1" />
                <Button size="sm" onClick={submitQA} className="h-8 px-2.5 flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>}

            {/* ATTENDEES */}
            {activeTab === "attendees" && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-400 font-semibold">{(registrations as any[]).length + attendees.length} people</p>
                  {isLive && <span className="text-[10px] text-green-400 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{attendees.length} live</span>}
                </div>
                <div className="space-y-1">
                  {attendees.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: "rgba(52,211,153,0.06)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: `hsl(${(i * 53) % 360}, 45%, 35%)` }}>{a.name.charAt(0)}</div>
                        <span className="text-xs text-white">{a.name}</span>
                      </div>
                      <span className="text-[9px] text-zinc-600">{a.joinedAt}</span>
                    </div>
                  ))}
                  {(registrations as any[]).map((r: any, i: number) => (
                    <div key={r.id || i} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 bg-zinc-800">
                          {(r.name || "?").charAt(0)}
                        </div>
                        <span className="text-xs text-zinc-400">{r.name || "Anonymous"}</span>
                      </div>
                      <span className="text-[9px] text-zinc-600">registered</span>
                    </div>
                  ))}
                  {attendees.length === 0 && (registrations as any[]).length === 0 && (
                    <div className="text-center py-10">
                      <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs text-zinc-600">No attendees yet</p>
                    </div>
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
                  className="flex-1 bg-zinc-900/80 border-zinc-700 text-white text-xs resize-none leading-relaxed" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
