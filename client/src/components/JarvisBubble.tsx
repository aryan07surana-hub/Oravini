import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, X, Maximize2, Mic, MicOff, Volume2, VolumeX, Radio, CheckCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useJarvis, getDailyQuote } from "@/contexts/JarvisContext";

const GOLD = "#d4b461";

function stripForSpeech(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "").replace(/[•\-]\s/g, "")
    .replace(/\n+/g, " ").replace(/[🔥🚀✨🎯💡]/g, "").trim();
}

export default function JarvisBubble() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const {
    jarvisName, isNamed, bubbleOpen, setBubbleOpen,
    wakeWordEnabled, setWakeWordEnabled,
    pendingWakeMessage, clearPendingWakeMessage,
    hasSpeechRecognition, addToHistory,
    isSpeaking: globalSpeaking, setIsSpeaking,
  } = useJarvis();

  const firstName = (user as any)?.name?.split(" ")[0] || "";
  const plan = (user as any)?.plan || "free";
  const isFree = !["growth", "pro", "elite"].includes(plan);

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "navigating" | "done">("idle");
  const [lastReply, setLastReply] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem("jarvis_voice") !== "false");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recRef = useRef<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeProcessed = useRef(false);
  // Whether to auto-restart mic after the AI finishes speaking
  const autoMicRef = useRef(false);

  const isOnJarvisPage = location === "/jarvis";

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    window.speechSynthesis.getVoices();
    return () => { synthRef.current?.cancel(); };
  }, []);

  // Greet on open
  useEffect(() => {
    if (bubbleOpen && isNamed && !lastReply) {
      const quote = getDailyQuote();
      const greeting = `Hey${firstName ? " " + firstName : ""}! "${quote}" What do you need?`;
      setLastReply(greeting);
      if (voiceOn) speakText(greeting);
    }
  }, [bubbleOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle pending wake message
  useEffect(() => {
    if (pendingWakeMessage && bubbleOpen && !wakeProcessed.current) {
      wakeProcessed.current = true;
      const msg = pendingWakeMessage;
      clearPendingWakeMessage();
      setTimeout(() => { executeCommand(msg); wakeProcessed.current = false; }, 500);
    }
  }, [pendingWakeMessage, bubbleOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local speaking state → global context
  useEffect(() => { setIsSpeaking(speaking); }, [speaking, setIsSpeaking]);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.rate = 0.95; u.pitch = 0.9; u.volume = 1;
    const voices = synthRef.current.getVoices();
    const pref = voices.find(v => v.name === "Google UK English Female")
      || voices.find(v => v.name === "Google US English")
      || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang === "en-US") || voices.find(v => v.lang.startsWith("en"));
    if (pref) u.voice = pref;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      onEnd?.();
      // Auto-restart mic after AI finishes speaking
      if (autoMicRef.current) {
        setTimeout(() => startMicAuto(), 400);
      }
    };
    u.onerror = () => setSpeaking(false);
    synthRef.current.speak(u);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSpeaking = useCallback(() => { synthRef.current?.cancel(); setSpeaking(false); }, []);
  const toggleVoice = () => setVoiceOn(v => {
    const n = !v;
    localStorage.setItem("jarvis_voice", String(n));
    if (!n) { stopSpeaking(); autoMicRef.current = false; }
    return n;
  });

  const hasSR = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  // Auto-mic: start listening and auto-execute whatever user says
  const startMicAuto = useCallback(() => {
    if (!hasSR || !autoMicRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    stopSpeaking();
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript || "";
      if (t.trim()) {
        setListening(false);
        executeCommandRef.current(t.trim());
      }
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => { setListening(false); };
    rec.start(); recRef.current = rec; setListening(true);
  }, [stopSpeaking, hasSR]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual mic toggle
  const handleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); autoMicRef.current = false; return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Mic not supported", description: "Use Chrome or Edge.", variant: "destructive" }); return; }
    stopSpeaking();
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript || ""; if (t.trim()) setInput(t.trim()); };
    rec.onerror = () => setListening(false); rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true);
  };

  // Keep a ref to executeCommand to avoid stale closure in startMicAuto
  const executeCommandRef = useRef<(text: string) => void>(() => {});

  const startNavCountdown = (url: string, label: string) => {
    setStatus("navigating");
    setLastAction(`Navigating to ${label}…`);
    let c = 2;
    countdownRef.current = setInterval(() => {
      c--;
      if (c <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        navigate(url);
        // DO NOT close bubble — keep it alive across page changes
        setStatus("idle");
        setLastAction("");
      }
    }, 1000);
  };

  const executeCommand = async (text: string) => {
    if (!text.trim() || status === "processing") return;
    setInput("");
    stopSpeaking();
    autoMicRef.current = false;
    setStatus("processing");
    setLastReply("On it…");
    setLastAction("");

    try {
      const data = await apiRequest("POST", "/api/jarvis/chat", {
        message: text,
        history: [],
        assistantName: jarvisName || "AI",
      });
      const { reply, action } = data;
      setLastReply(reply || "Done!");
      setStatus("idle");

      addToHistory({
        command: text,
        response: reply || "",
        action: action ? action.label : undefined,
      });

      if (action?.url) {
        setLastAction(`Opening: ${action.label}`);
        if (voiceOn && reply) {
          speakText(reply, () => {
            setTimeout(() => startNavCountdown(action.url, action.label), 300);
          });
        } else {
          setTimeout(() => startNavCountdown(action.url, action.label), 800);
        }
      } else {
        if (voiceOn && reply) {
          // After speaking, auto-restart mic
          autoMicRef.current = true;
          speakText(reply);
        } else {
          // No voice — just restart mic immediately
          autoMicRef.current = true;
          setTimeout(() => startMicAuto(), 400);
        }
      }
    } catch (err: any) {
      setStatus("idle");
      if (err?.status === 402) {
        setLastReply(`Out of credits — upgrade to Growth+ for unlimited ${jarvisName || "AI"} access.`);
      } else {
        setLastReply("Something went wrong. Try again.");
      }
    }
  };

  // Always keep executeCommandRef current
  executeCommandRef.current = executeCommand;

  // Auto-open mic when bubble opens (so it's always listening)
  useEffect(() => {
    if (bubbleOpen && isNamed && voiceOn && hasSR) {
      autoMicRef.current = true;
      // Small delay to let the greeting play first
      setTimeout(() => {
        if (!speaking) startMicAuto();
      }, 2800);
    }
    if (!bubbleOpen) {
      autoMicRef.current = false;
      if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
      setListening(false);
    }
  }, [bubbleOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); executeCommand(input); }
  };

  const iconBtn = () => ({
    background: "none", border: "none", cursor: "pointer",
    color: "rgba(255,255,255,0.3)", padding: 6, borderRadius: 6,
    display: "flex", alignItems: "center" as const, transition: "color 0.15s",
  });

  const orbState = status === "processing" ? "processing" : speaking ? "speaking" : listening ? "listening" : "idle";

  return (
    <>
      {/* Bubble button — hidden on Jarvis page itself */}
      {!bubbleOpen && !isOnJarvisPage && (
        <button onClick={() => setBubbleOpen(true)} data-testid="button-jarvis-bubble"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9990,
            width: 56, height: 56, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, #f0c84b)`,
            border: globalSpeaking ? `2px solid ${GOLD}` : "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: globalSpeaking
              ? `0 0 0 4px ${GOLD}30, 0 0 24px ${GOLD}70, 0 8px 32px ${GOLD}55`
              : `0 8px 32px ${GOLD}55`,
            animation: globalSpeaking ? "bubble-speak 0.6s ease-in-out infinite alternate" : "none",
            transition: "all 0.3s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = globalSpeaking ? "scale(1.04)" : "scale(1)")}
          title={`Open ${jarvisName || "AI"}`}
        >
          <Sparkles style={{
            width: 22, height: 22, color: "#000",
            animation: globalSpeaking ? "sparkle-talk 0.5s ease-in-out infinite alternate" : "none",
          }} />
        </button>
      )}

      {/* Panel */}
      {bubbleOpen && (
        <div data-testid="panel-jarvis"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9990, width: 360,
            background: "#0b0b0b",
            border: `1px solid ${speaking ? GOLD + "60" : listening ? GOLD + "40" : GOLD + "25"}`,
            borderRadius: 22, display: "flex", flexDirection: "column",
            boxShadow: speaking ? `0 24px 80px rgba(0,0,0,0.8), 0 0 30px ${GOLD}25` : `0 24px 80px rgba(0,0,0,0.8)`,
            overflow: "hidden", transition: "border-color 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Header */}
          <div style={{ padding: "13px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, background: "#0b0b0b", flexShrink: 0 }}>
            {/* Orb */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${GOLD}50, ${GOLD}18, transparent)`,
              border: `1px solid ${GOLD}40`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: orbState === "speaking" ? `0 0 20px ${GOLD}70, 0 0 40px ${GOLD}30`
                : orbState === "processing" ? `0 0 12px #818cf850`
                : orbState === "listening" ? `0 0 14px ${GOLD}50`
                : "none",
              transition: "box-shadow 0.3s",
              animation: orbState === "processing" ? "bubble-spin 2s linear infinite"
                : orbState === "speaking" ? "bubble-speak-orb 0.5s ease-in-out infinite alternate"
                : "bubble-breathe 3s ease-in-out infinite",
            }}>
              {status === "processing"
                ? <Loader2 style={{ width: 14, height: 14, color: GOLD, animation: "spin 1s linear infinite" }} />
                : <Sparkles style={{
                    width: 14, height: 14, color: GOLD,
                    animation: orbState === "speaking" ? "sparkle-talk 0.5s ease-in-out infinite alternate" : "none",
                  }} />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{jarvisName || "AI"}</div>
              <div style={{ fontSize: 10, color: speaking ? GOLD : listening ? "#60a5fa" : wakeWordEnabled ? "#22c55e" : "rgba(255,255,255,0.3)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, transition: "color 0.3s" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: speaking ? GOLD : listening ? "#60a5fa" : "#22c55e", animation: speaking || listening ? "dot-pulse 0.8s ease-in-out infinite" : "none" }} />
                {speaking ? "Speaking…" : status === "processing" ? "Processing…" : status === "navigating" ? "Navigating…" : listening ? "Listening…" : wakeWordEnabled ? `Say "Hey ${jarvisName}"` : "Ready"}
              </div>
            </div>

            {hasSpeechRecognition && (
              <button onClick={() => setWakeWordEnabled(!wakeWordEnabled)} title="Wake word" style={iconBtn()}
                onMouseEnter={e => (e.currentTarget.style.color = wakeWordEnabled ? GOLD : "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = wakeWordEnabled ? GOLD : "rgba(255,255,255,0.3)")}
              >
                <Radio style={{ width: 12, height: 12, color: wakeWordEnabled ? GOLD : undefined }} />
              </button>
            )}
            <button onClick={toggleVoice} style={iconBtn()}
              onMouseEnter={e => (e.currentTarget.style.color = voiceOn ? GOLD : "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = voiceOn ? GOLD : "rgba(255,255,255,0.3)")}
            >
              {voiceOn ? <Volume2 style={{ width: 12, height: 12, color: GOLD }} /> : <VolumeX style={{ width: 12, height: 12 }} />}
            </button>
            <button onClick={() => navigate("/jarvis")} title="Full page" style={iconBtn()}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <Maximize2 style={{ width: 12, height: 12 }} />
            </button>
            <button onClick={() => {
              setBubbleOpen(false); stopSpeaking();
              autoMicRef.current = false;
              if (countdownRef.current) clearInterval(countdownRef.current);
              if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
              setListening(false);
            }} style={iconBtn()}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>

          {/* Response area */}
          <div style={{ padding: "16px 16px 12px", minHeight: 100, display: "flex", flexDirection: "column", gap: 8 }}>
            {lastReply && (
              <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${speaking ? GOLD + "20" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 14px", transition: "border-color 0.3s" }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.82)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{lastReply}</p>
              </div>
            )}
            {lastAction && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 10 }}>
                {status === "navigating" ? <Loader2 style={{ width: 12, height: 12, color: GOLD, animation: "spin 1s linear infinite", flexShrink: 0 }} /> : <CheckCircle style={{ width: 12, height: 12, color: GOLD, flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{lastAction}</span>
              </div>
            )}
            {!lastReply && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
                  {isNamed ? `Tell ${jarvisName} what to do…` : "Open full page to set up your AI"}
                </p>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0b0b0b", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end", background: listening ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${listening ? `${GOLD}40` : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "8px 8px 8px 14px", transition: "all 0.2s" }}>
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={listening ? "Listening… speak now" : `Command ${jarvisName || "AI"}…`}
                disabled={status === "processing" || status === "navigating"}
                data-testid="input-jarvis-bubble"
                style={{ background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 13, color: listening ? GOLD : "rgba(255,255,255,0.85)", minHeight: 28, maxHeight: 80, padding: 0, boxShadow: "none", flex: 1 }}
                className="placeholder:text-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                {hasSR && (
                  <button onClick={handleMic} disabled={status === "processing" || status === "navigating"} data-testid="button-jarvis-bubble-mic"
                    style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: listening ? `${GOLD}22` : "rgba(255,255,255,0.06)", color: listening ? GOLD : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", animation: listening ? "dot-pulse 0.8s ease-in-out infinite" : "none" }}
                  >
                    {listening ? <MicOff style={{ width: 13, height: 13 }} /> : <Mic style={{ width: 13, height: 13 }} />}
                  </button>
                )}
                <button onClick={() => executeCommand(input)} disabled={!input.trim() || status !== "idle"} data-testid="button-jarvis-bubble-send"
                  style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: input.trim() && status === "idle" ? GOLD : "rgba(255,255,255,0.06)", color: input.trim() && status === "idle" ? "#000" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && status === "idle" ? "pointer" : "not-allowed", transition: "all 0.15s" }}
                >
                  <Send style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
            {isFree && <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 6 }}>2 credits/command · Upgrade to Growth+ for unlimited</p>}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bubble-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes bubble-spin { to{transform:rotate(360deg)} }
        @keyframes bubble-speak { 0%{transform:scale(1)} 100%{transform:scale(1.06)} }
        @keyframes bubble-speak-orb { 0%{transform:scale(1);filter:brightness(1)} 100%{transform:scale(1.12);filter:brightness(1.4)} }
        @keyframes sparkle-talk { 0%{transform:scale(1) rotate(0deg);opacity:0.85} 100%{transform:scale(1.22) rotate(18deg);opacity:1} }
        @keyframes dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}
