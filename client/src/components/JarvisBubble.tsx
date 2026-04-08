import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, X, Maximize2, Mic, MicOff, Volume2, VolumeX, Radio, CheckCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useJarvis, getDailyQuote } from "@/contexts/JarvisContext";

const GOLD = "#d4b461";

// Contextual arrival messages spoken by Jarvis after navigating to a section
const ARRIVAL_MESSAGES: Record<string, string> = {
  "/dashboard": "We're back at your Dashboard! This is your home base — tasks, stats, and your whole setup are right here. What are we doing?",
  "/ai-ideas": "We're in Content Ideas! Tell me your platform and niche and I'll generate hooks, captions, and reel concepts for you right now.",
  "/ai-coach": "We're in the Content Coach! Drop in a script or idea — I'll go through it with you and help make it hit.",
  "/ai-design": "We're in the Design Studio! Tell me what you're creating — carousels, captions, stories — and I'll build it out.",
  "/tracking/competitor": "We're in Competitor Analysis! Give me any Instagram username and I'll break down exactly what they're doing right.",
  "/tracking": "We're in Performance Tracking! Your Instagram and YouTube metrics are right here.",
  "/credits": "We're at Credits! You can top up anytime — pick the pack that works for you.",
  "/settings/plan": "We're at Plans! Pick the right tier for where you're at and I'll help you through it.",
  "/chat": "We're in Chat! You can message the Oravini team directly from right here.",
  "/content-calendar": "We're in your Content Calendar! Let's schedule your posts and plan your content ahead.",
  "/sessions": "We're in Sessions! Your coaching calls and recordings are all right here.",
  "/progress": "We're in Progress! Let's see how far you've come.",
  "/jarvis": "Back on my home turf! Start a session and I'll stay with you wherever you go. What do we need?",
};

function stripForSpeech(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "").replace(/[•\-]\s/g, "")
    .replace(/\n+/g, " ").replace(/[🔥🚀✨🎯💡]/g, "").trim();
}

export default function JarvisBubble() {
  const { user } = useAuth();

  // Only render for logged-in non-admin clients
  if (!user || (user as any).role === "admin") return null;

  return <JarvisBubbleInner user={user} />;
}

function JarvisBubbleInner({ user }: { user: any }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const {
    jarvisName, isNamed, bubbleOpen, setBubbleOpen,
    wakeWordEnabled, setWakeWordEnabled,
    pendingWakeMessage, clearPendingWakeMessage,
    hasSpeechRecognition, addToHistory,
    isSpeaking: globalSpeaking, setIsSpeaking,
    sessionActive, stopSession,
    pendingInject, setPendingInject,
    isListening: globalIsListening, setIsListening,
    pauseWake, resumeWake,
  } = useJarvis();

  const firstName = (user as any)?.name?.split(" ")[0] || "";
  const plan = (user as any)?.plan || "free";
  const isFree = !["growth", "pro", "elite"].includes(plan);

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
  const autoMicRef = useRef(false);
  // Tracks the URL Jarvis just navigated to — used to trigger arrival announcement
  const justNavigatedRef = useRef<string | null>(null);

  const isOnJarvisPage = location === "/jarvis";

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    window.speechSynthesis.getVoices();
    return () => { synthRef.current?.cancel(); };
  }, []);

  // Stop mic completely — shared cleanup helper
  const stopMic = useCallback(() => {
    autoMicRef.current = false;
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    setListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
      synthRef.current?.cancel();
      resumeWake();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Greet + auto-start mic on open; release on close
  useEffect(() => {
    if (bubbleOpen && isNamed) {
      pauseWake();
      if (!lastReply) {
        // Quote only on the very first bubble open — after that, casual re-greeting
        const hasGreeted = localStorage.getItem("jarvis_greeted");
        let greeting: string;
        if (!hasGreeted) {
          const quote = getDailyQuote();
          greeting = `Hey${firstName ? " " + firstName : ""}! Here's one for you — "${quote}". I'm right here, what do we need?`;
          localStorage.setItem("jarvis_greeted", "true");
        } else {
          greeting = `Hey${firstName ? " " + firstName : ""}! I'm right here with you. What are we doing?`;
        }
        setLastReply(greeting);
        autoMicRef.current = true;
        if (voiceOn) speakText(greeting);
        else setTimeout(() => startMicAuto(), 300);
      } else {
        autoMicRef.current = true;
        setTimeout(() => { if (!speakingRef.current) startMicAuto(); }, 600);
      }
    }
    if (!bubbleOpen) {
      stopMic();
      resumeWake();
    }
  }, [bubbleOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop bubble mic when user navigates to the Jarvis page (Jarvis page handles its own mic)
  useEffect(() => {
    if (isOnJarvisPage && bubbleOpen) {
      setBubbleOpen(false);
    }
    if (isOnJarvisPage) {
      stopMic();
    }
  }, [isOnJarvisPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrival announcement — fires when Jarvis navigates the user to a new section
  // Works for both bubble-initiated and full-Jarvis-page-initiated navigations
  useEffect(() => {
    const cleanLoc = location.split("?")[0];

    // Check bubble ref first, then fall back to sessionStorage (set by Jarvis page)
    const bubbleTarget = justNavigatedRef.current ? justNavigatedRef.current.split("?")[0] : null;
    const sessionTarget = sessionStorage.getItem("jarvis_nav_dest");
    const matchedTarget = (bubbleTarget && cleanLoc === bubbleTarget) ? bubbleTarget
      : (sessionTarget && cleanLoc === sessionTarget) ? sessionTarget
      : null;

    if (!matchedTarget) return;

    // Clear both sources
    justNavigatedRef.current = null;
    sessionStorage.removeItem("jarvis_nav_dest");

    // Open bubble so user can see Jarvis is with them on the new page
    setBubbleOpen(true);

    setTimeout(() => {
      const arrivalMsg = ARRIVAL_MESSAGES[cleanLoc]
        || Object.entries(ARRIVAL_MESSAGES).find(([k]) => cleanLoc.startsWith(k))?.[1]
        || "We made it! I'm right here — what do you need?";
      setLastReply(arrivalMsg);
      autoMicRef.current = true;
      // Use voiceOnRef — always current value regardless of stale closure
      if (voiceOnRef.current) {
        speakText(arrivalMsg); // mic restarts automatically after speech ends
      } else {
        setTimeout(() => startMicAuto(), 300);
      }
    }, 700);
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle pending wake message
  useEffect(() => {
    if (pendingWakeMessage && bubbleOpen && !wakeProcessed.current) {
      wakeProcessed.current = true;
      const msg = pendingWakeMessage;
      clearPendingWakeMessage();
      setTimeout(() => { executeCommand(msg); wakeProcessed.current = false; }, 500);
    }
  }, [pendingWakeMessage, bubbleOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local speaking/listening state → global context
  useEffect(() => { setIsSpeaking(speaking); }, [speaking, setIsSpeaking]);
  useEffect(() => { setIsListening(listening); }, [listening, setIsListening]);

  // Global text injection — types content into any field by data-testid, with retries after navigation
  useEffect(() => {
    if (!pendingInject) return;
    const { testId, content } = pendingInject;
    setPendingInject(null);

    const doInject = (attempt = 0) => {
      const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) {
        // Retry while page is loading (up to 2 seconds)
        if (attempt < 10) { setTimeout(() => doInject(attempt + 1), 200); return; }
        return;
      }
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Use native value setter so React's synthetic event system picks it up
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      // Typewriter: inject one char every 16ms
      let i = 0;
      nativeSetter?.call(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const timer = setInterval(() => {
        i++;
        nativeSetter?.call(el, content.slice(0, i));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        if (i >= content.length) {
          clearInterval(timer);
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, 16);
    };

    doInject();
  }, [pendingInject, setPendingInject]);

  // Keep voiceOn as a ref so arrival effect always reads the current value
  const voiceOnRef = useRef(voiceOn);
  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;

    // ── KEY FIX ─────────────────────────────────────────────────────────────
    // Set autoMicRef FALSE *before* aborting the mic.
    // This prevents the race where rec.onend fires before TTS starts,
    // sees autoMicRef=true, restarts the mic, and the mic then hears the TTS.
    // We restore the flag in u.onstart once TTS is actually playing.
    const prevAutoMic = autoMicRef.current;
    autoMicRef.current = false;
    // ────────────────────────────────────────────────────────────────────────

    if (recRef.current) {
      try { recRef.current.abort(); } catch { try { recRef.current.stop(); } catch {} }
      recRef.current = null;
    }
    setListening(false);
    synthRef.current.cancel();

    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.rate = 0.95; u.pitch = 0.9; u.volume = 1;
    const voices = synthRef.current.getVoices();
    const pref = voices.find(v => v.name === "Google UK English Female")
      || voices.find(v => v.name === "Google US English")
      || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang === "en-US") || voices.find(v => v.lang.startsWith("en"));
    if (pref) u.voice = pref;

    u.onstart = () => {
      setSpeaking(true);
      // TTS has truly started — restore autoMic to whatever it was before.
      // From this point, if the user deliberately turns off the mic, autoMicRef
      // will be false, and we won't restart after speech.
      autoMicRef.current = prevAutoMic;
    };
    u.onend = () => {
      setSpeaking(false);
      onEnd?.();
      if (autoMicRef.current) setTimeout(() => startMicAuto(), 350);
    };
    u.onerror = () => {
      setSpeaking(false);
      // Restore on error too so the mic comes back if TTS failed
      if (prevAutoMic) autoMicRef.current = true;
      if (autoMicRef.current) setTimeout(() => startMicAuto(), 500);
    };
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

  // Ref to check speaking without stale closure
  const speakingRef = useRef(speaking);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  // Auto-mic: always-on — restarts itself silently between utterances
  const startMicAuto = useCallback(() => {
    if (!hasSR || !autoMicRef.current || speakingRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript || "";
      if (t.trim() && t.trim().length >= 2) {
        // Don't set listening false here — executeCommand will manage state
        executeCommandRef.current(t.trim());
      }
    };
    rec.onerror = (e: any) => {
      recRef.current = null;
      // not-allowed = no mic permission; abort = we stopped it intentionally
      if (e.error === "not-allowed") { setListening(false); return; }
      if (e.error === "aborted") { return; } // we triggered this, don't restart
      setListening(false);
      if (autoMicRef.current && !speakingRef.current) setTimeout(() => startMicAuto(), 900);
    };
    rec.onend = () => {
      recRef.current = null;
      // KEY FIX: don't setListening(false) when immediately restarting — eliminates flicker
      if (autoMicRef.current && !speakingRef.current) {
        setTimeout(() => startMicAuto(), 120);
        // keep setListening(true) — restart is instant, no need to flash off
      } else {
        setListening(false);
      }
    };
    rec.start(); recRef.current = rec; setListening(true);
  }, [hasSR]); // eslint-disable-line react-hooks/exhaustive-deps


  // Keep a ref to executeCommand to avoid stale closure in startMicAuto
  const executeCommandRef = useRef<(text: string) => void>(() => {});

  const startNavCountdown = (url: string, label: string) => {
    setStatus("navigating");
    setLastAction(`Taking you to ${label}…`);
    // Mark destination so the arrival effect fires once we land
    const cleanUrl = url.split("?")[0];
    justNavigatedRef.current = cleanUrl;
    setTimeout(() => {
      navigate(url);
      setStatus("idle");
      setLastAction("");
      // Mic stays enabled — arrival message will restart it once page loads
      autoMicRef.current = true;
    }, 350);
  };

  const executeCommand = async (text: string) => {
    if (!text.trim() || status === "processing") return;
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
      const { reply, action, inject } = data;
      setLastReply(reply || "Done!");
      setStatus("idle");

      addToHistory({
        command: text,
        response: reply || "",
        action: action ? action.label : undefined,
      });

      // Text injection into any field by data-testid (typewriter via native events)
      if (inject?.testId) {
        setPendingInject(inject);
      }

      if (action?.url) {
        setLastAction(`Going to ${action.label}…`);
        // Always re-enable mic — arrival effect handles the post-nav restart
        autoMicRef.current = true;
        if (voiceOn && reply) {
          speakText(reply, () => {
            setTimeout(() => startNavCountdown(action.url, action.label), 250);
          });
        } else {
          setTimeout(() => startNavCountdown(action.url, action.label), 600);
        }
        // NOTE: Do NOT add a competing setTimeout here — arrival effect handles mic restart
      } else {
        // Normal response — keep mic running after reply
        autoMicRef.current = true;
        if (voiceOn && reply) {
          speakText(reply); // speakText.onend restarts mic automatically
        } else {
          setTimeout(() => startMicAuto(), 350);
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
            border: (globalIsListening || globalSpeaking) ? `2px solid #fff4` : "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            // Pulse gold rings while user is speaking, steady glow when AI speaks
            boxShadow: globalIsListening
              ? `0 0 0 6px ${GOLD}45, 0 0 0 12px ${GOLD}22, 0 0 40px ${GOLD}90, 0 8px 32px ${GOLD}70`
              : globalSpeaking
              ? `0 0 0 4px ${GOLD}30, 0 0 24px ${GOLD}70, 0 8px 32px ${GOLD}55`
              : `0 8px 32px ${GOLD}55`,
            animation: globalIsListening
              ? "bubble-listen-pulse 0.55s ease-in-out infinite alternate"
              : globalSpeaking
              ? "bubble-speak 0.6s ease-in-out infinite alternate"
              : "none",
            transition: "box-shadow 0.2s, border 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          title={`Open ${jarvisName || "AI"}`}
        >
          <Sparkles style={{
            width: 22, height: 22, color: "#000",
            animation: (globalIsListening || globalSpeaking) ? "sparkle-talk 0.5s ease-in-out infinite alternate" : "none",
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
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1, display: "flex", alignItems: "center", gap: 6 }}>
                {jarvisName || "AI"}
                {sessionActive && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: "1px 6px" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#ef4444", animation: "dot-pulse 0.7s ease-in-out infinite" }} />
                    <span style={{ fontSize: 8, color: "#ef4444", fontWeight: 800, letterSpacing: "0.06em" }}>LIVE</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: speaking ? GOLD : listening ? "#60a5fa" : wakeWordEnabled ? "#22c55e" : "rgba(255,255,255,0.3)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, transition: "color 0.3s" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: speaking ? GOLD : listening ? "#60a5fa" : "#22c55e", animation: speaking || listening ? "dot-pulse 0.8s ease-in-out infinite" : "none" }} />
                {speaking ? "Speaking…" : status === "processing" ? "Processing…" : status === "navigating" ? "Navigating…" : listening ? "Listening…" : sessionActive ? "Session active — speak anytime" : wakeWordEnabled ? `Say "Hey ${jarvisName}"` : "Ready"}
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

          {/* Mic footer — voice only, no textbox */}
          <div style={{ padding: "12px 14px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0b0b0b", flexShrink: 0, display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => {
                if (listening) { recRef.current?.stop(); setListening(false); autoMicRef.current = false; }
                else { autoMicRef.current = true; startMicAuto(); }
              }}
              disabled={status === "processing" || status === "navigating"}
              data-testid="button-jarvis-bubble-mic"
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: listening ? `linear-gradient(135deg, ${GOLD}, #f0c84b)` : "rgba(255,255,255,0.07)",
                border: `2px solid ${listening ? GOLD : "rgba(255,255,255,0.12)"}`,
                color: listening ? "#000" : "rgba(255,255,255,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: status === "processing" || status === "navigating" ? "not-allowed" : "pointer",
                boxShadow: listening ? `0 0 22px ${GOLD}55` : "none",
                animation: listening ? "dot-pulse 1s ease-in-out infinite" : "none",
                transition: "all 0.2s", flexShrink: 0,
              }}
            >
              {listening ? <MicOff style={{ width: 18, height: 18 }} /> : <Mic style={{ width: 18, height: 18 }} />}
            </button>
            <div>
              <p style={{ fontSize: 12, color: listening ? GOLD : "rgba(255,255,255,0.5)", fontWeight: 600, margin: 0, transition: "color 0.3s" }}>
                {listening ? "Listening…" : status === "processing" ? "Processing…" : `Tap to speak`}
              </p>
              {isFree && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: "2px 0 0" }}>2 credits/command · Upgrade for unlimited</p>}
            </div>
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
        @keyframes bubble-listen-pulse { 0%{transform:scale(1);filter:brightness(1)} 100%{transform:scale(1.1);filter:brightness(1.35)} }
      `}</style>
    </>
  );
}
