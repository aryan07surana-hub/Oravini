import { useState, useRef, useEffect, useCallback } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Trash2, Radio, ArrowRight, Zap, Clock, CheckCircle, Loader2, X } from "lucide-react";
import { useJarvis, getDailyQuote } from "@/contexts/JarvisContext";
import { useLocation } from "wouter";

const GOLD = "#d4b461";

// ── Voice helpers ──────────────────────────────────────────────────────────
function stripForSpeech(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "").replace(/[•\-]\s/g, "")
    .replace(/\n{2,}/g, ". ").replace(/\n/g, " ")
    .replace(/[🔥🚀✨🎯💡]/g, "").trim();
}

function useVoice() {
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem("jarvis_voice") !== "false");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    // Load voices
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {};
    return () => { synthRef.current?.cancel(); };
  }, []);

  const speak = useCallback((text: string, voiceEnabled: boolean) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.rate = 0.95; u.pitch = 0.9; u.volume = 1;
    const voices = synthRef.current.getVoices();
    // Priority: Google UK English Female > Google US English > any English US > any English
    const pref = voices.find(v => v.name === "Google UK English Female")
      || voices.find(v => v.name === "Google US English")
      || voices.find(v => v.name.includes("Samantha"))
      || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang === "en-US")
      || voices.find(v => v.lang.startsWith("en"));
    if (pref) u.voice = pref;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synthRef.current.speak(u);
  }, []);

  const stopSpeaking = useCallback(() => { synthRef.current?.cancel(); setSpeaking(false); }, []);
  const toggleVoice = () => setVoiceOn(v => { const n = !v; localStorage.setItem("jarvis_voice", String(n)); if (!n) stopSpeaking(); return n; });

  const hasSR = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  const startListening = useCallback((onResult: (t: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    stopSpeaking();
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript || ""; if (t.trim()) onResult(t.trim()); };
    rec.onerror = () => setListening(false); rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true); return true;
  }, [stopSpeaking]);
  const stopListening = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  return { voiceOn, toggleVoice, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSR };
}

// ── Setup screen ───────────────────────────────────────────────────────────
function SetupScreen({ onName }: { onName: (name: string) => void }) {
  const [value, setValue] = useState("");
  const [entered, setEntered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 500); }, []);

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    setEntered(true);
    setTimeout(() => onName(name), 600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#030303", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "0 24px" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}12 0%, transparent 70%)`, pointerEvents: "none" }} />

      {/* Orb */}
      <div style={{ position: "relative", marginBottom: 48 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${GOLD}60, ${GOLD}20, transparent)`, border: `1.5px solid ${GOLD}40`, boxShadow: `0 0 60px ${GOLD}30, 0 0 120px ${GOLD}15`, animation: "orb-breathe 3s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles style={{ width: 36, height: 36, color: GOLD, opacity: 0.9 }} />
        </div>
      </div>

      {/* Text */}
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", textAlign: "center", margin: "0 0 10px" }}>
        Meet your AI
      </h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", textAlign: "center", margin: "0 0 40px", maxWidth: 360 }}>
        Give your AI assistant a name — something that feels right to you. You'll call it by this name to wake it up.
      </p>

      {/* Input */}
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder='e.g. "Aria", "Max", "Nova"…'
          maxLength={20}
          data-testid="input-jarvis-setup-name"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${value.trim() ? GOLD + "60" : "rgba(255,255,255,0.12)"}`, borderRadius: 14, padding: "14px 18px", fontSize: 18, fontWeight: 700, color: "#fff", height: "auto", textAlign: "center", transition: "border-color 0.2s", letterSpacing: "0.02em" }}
          className="focus-visible:ring-0 placeholder:font-normal placeholder:text-white/20 placeholder:text-base placeholder:tracking-normal"
        />
        <button onClick={submit} disabled={!value.trim() || entered} data-testid="button-jarvis-setup-launch"
          style={{ background: value.trim() ? `linear-gradient(135deg, ${GOLD}, #f0c84b)` : "rgba(255,255,255,0.07)", border: "none", borderRadius: 14, padding: "14px 24px", fontSize: 16, fontWeight: 800, color: value.trim() ? "#000" : "rgba(255,255,255,0.2)", cursor: value.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s", transform: entered ? "scale(0.96)" : "scale(1)" }}
        >
          {entered ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Launching…</> : <>Launch {value.trim() || "your AI"} <ArrowRight style={{ width: 18, height: 18 }} /></>}
        </button>
      </div>

      {/* Capability hints */}
      <div style={{ display: "flex", gap: 20, marginTop: 48, flexWrap: "wrap", justifyContent: "center" }}>
        {["Voice activated", "Navigates for you", "Generates content", "Saves history"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, opacity: 0.5 }} />
            {f}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes orb-breathe { 0%,100%{transform:scale(1);box-shadow:0 0 60px ${GOLD}30,0 0 120px ${GOLD}15} 50%{transform:scale(1.06);box-shadow:0 0 80px ${GOLD}45,0 0 160px ${GOLD}20} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── History entry ──────────────────────────────────────────────────────────
function HistoryRow({ command, response, action, ts }: { command: string; response: string; action?: string; ts: number }) {
  const time = new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <CheckCircle style={{ width: 12, height: 12, color: "#22c55e" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{command}"</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{action || response.slice(0, 60)}</div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
        <Clock style={{ width: 9, height: 9 }} />{time}
      </div>
    </div>
  );
}

// ── Main command center ────────────────────────────────────────────────────
export default function Jarvis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { jarvisName, setJarvisName, isNamed, wakeWordEnabled, setWakeWordEnabled, hasSpeechRecognition, history, addToHistory, clearHistory } = useJarvis();
  const { voiceOn, toggleVoice, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSR } = useVoice();

  const plan = (user as any)?.plan || "free";
  const isFree = !["growth", "pro", "elite"].includes(plan);
  const firstName = (user as any)?.name?.split(" ")[0] || "";

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "navigating" | "done">("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [pendingUrl, setPendingUrl] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [greeting, setGreeting] = useState("");

  const hasSpokenGreetingRef = useRef(false);

  // Set greeting on mount
  useEffect(() => {
    if (isNamed) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      setGreeting(`${timeGreet}, ${firstName || "there"}`);
    }
  }, [isNamed, firstName]);

  // Speak greeting once when greeting is set
  useEffect(() => {
    if (!greeting || hasSpokenGreetingRef.current || !voiceOn) return;
    hasSpokenGreetingRef.current = true;
    const timer = setTimeout(() => {
      speak(`Hey${firstName ? " " + firstName : ""}! "${getDailyQuote()}" — What are we working on today?`, true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [greeting]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelNav = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setStatus("idle"); setStatusLabel(""); setCountdown(0); setPendingUrl("");
  };

  const startNavCountdown = (url: string, label: string) => {
    setPendingUrl(url);
    setStatus("navigating");
    setStatusLabel(`Taking you to ${label}`);
    setCountdown(2);
    let c = 2;
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        navigate(url);
        setStatus("done");
        setStatusLabel(`Opened ${label}`);
        setTimeout(() => { setStatus("idle"); setStatusLabel(""); }, 2000);
      }
    }, 1000);
  };

  const executeCommand = async (text: string) => {
    if (!text.trim() || status === "processing") return;
    setInput("");
    stopSpeaking();
    setStatus("processing");
    setStatusLabel("Thinking…");

    try {
      const data = await apiRequest("POST", "/api/jarvis/chat", {
        message: text,
        history: history.slice(0, 8).map(h => ({ role: "user", content: h.command })),
        assistantName: jarvisName,
      });

      const { reply, action } = data;
      setStatus("idle");
      setStatusLabel("");

      if (voiceOn && reply) speak(reply, voiceOn);

      addToHistory({
        command: text,
        response: reply || "",
        action: action ? action.label : undefined,
      });

      if (action?.url) {
        startNavCountdown(action.url, action.label);
      }
    } catch (err: any) {
      setStatus("idle");
      setStatusLabel("");
      if (err?.status === 402) {
        toast({ title: "Out of credits", description: `Upgrade to Growth+ for unlimited ${jarvisName}.`, variant: "destructive" });
        addToHistory({ command: text, response: "Out of credits", action: "Upgrade needed" });
      } else {
        toast({ title: `${jarvisName} hit a snag`, description: "Please try again.", variant: "destructive" });
      }
    }
  };

  const handleMic = () => {
    if (listening) { stopListening(); setStatus("idle"); return; }
    setStatus("listening"); setStatusLabel("Listening…");
    const ok = startListening(t => { setInput(t); setStatus("idle"); setStatusLabel(""); });
    if (!ok) { setStatus("idle"); toast({ title: "Mic not supported", description: "Use Chrome or Edge.", variant: "destructive" }); }
  };

  const statusColor = {
    idle: "#22c55e",
    listening: GOLD,
    processing: "#818cf8",
    navigating: GOLD,
    done: "#22c55e",
  }[status];

  const orbAnimation = status === "processing" ? "orb-fast" : status === "listening" ? "orb-pulse-gold" : "orb-breathe";

  if (!isNamed) {
    return (
      <ClientLayout>
        <SetupScreen onName={name => { setJarvisName(name); }} />
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div style={{ height: "calc(100vh - 64px)", background: "#060606", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* Background ambient glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`, pointerEvents: "none" }} />

        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{jarvisName}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}`, transition: "all 0.3s" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {status === "idle" ? "Ready" : status === "listening" ? "Listening" : status === "processing" ? "Processing" : status === "navigating" ? "Navigating" : "Done"}
              </span>
            </div>
            {isFree && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "3px 8px" }}>
                <Zap style={{ width: 10, height: 10, color: GOLD }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>2 credits/cmd</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {hasSpeechRecognition && (
              <button onClick={() => setWakeWordEnabled(!wakeWordEnabled)} data-testid="button-wake" title={wakeWordEnabled ? `Wake word on — "Hey ${jarvisName}"` : "Enable wake word"}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `1px solid ${wakeWordEnabled ? GOLD + "40" : "rgba(255,255,255,0.1)"}`, background: wakeWordEnabled ? `${GOLD}10` : "transparent", cursor: "pointer", fontSize: 11, color: wakeWordEnabled ? GOLD : "rgba(255,255,255,0.35)", fontWeight: 600, transition: "all 0.2s" }}
              >
                <Radio style={{ width: 11, height: 11 }} />
                {wakeWordEnabled ? `Wake: "Hey ${jarvisName}"` : "Wake Off"}
              </button>
            )}
            <button onClick={toggleVoice} data-testid="button-voice" title={voiceOn ? "Voice on" : "Voice off"}
              style={{ padding: "5px 10px", borderRadius: 20, border: `1px solid ${voiceOn ? GOLD + "40" : "rgba(255,255,255,0.1)"}`, background: voiceOn ? `${GOLD}10` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: voiceOn ? GOLD : "rgba(255,255,255,0.35)", fontWeight: 600, transition: "all 0.2s" }}
            >
              {voiceOn ? <Volume2 style={{ width: 11, height: 11 }} /> : <VolumeX style={{ width: 11, height: 11 }} />}
              {voiceOn ? "Voice On" : "Voice Off"}
            </button>
            <button onClick={() => setShowHistory(h => !h)} data-testid="button-history"
              style={{ padding: "5px 10px", borderRadius: 20, border: `1px solid ${showHistory ? GOLD + "40" : "rgba(255,255,255,0.1)"}`, background: showHistory ? `${GOLD}10` : "transparent", cursor: "pointer", fontSize: 11, color: showHistory ? GOLD : "rgba(255,255,255,0.35)", fontWeight: 600, transition: "all 0.2s" }}
            >
              {showHistory ? "Hide Log" : "Command Log"}
            </button>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 24px", position: "relative", zIndex: 1 }}>

          {/* Orb */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${GOLD}50, ${GOLD}18, transparent)`, border: `1.5px solid ${GOLD}35`, boxShadow: speaking ? `0 0 60px ${GOLD}50, 0 0 120px ${GOLD}25` : status === "processing" ? `0 0 40px #818cf855, 0 0 80px #818cf820` : `0 0 40px ${GOLD}20, 0 0 80px ${GOLD}10`, animation: `${orbAnimation} ${status === "processing" ? "0.8s" : status === "listening" ? "1s" : "3s"} ease-in-out infinite`, display: "flex", alignItems: "center", justifyContent: "center", transition: "box-shadow 0.5s" }}>
              {status === "processing" ? <Loader2 style={{ width: 40, height: 40, color: GOLD, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 40, height: 40, color: GOLD, opacity: 0.9 }} />}
            </div>
          </div>

          {/* Status / greeting */}
          <div style={{ textAlign: "center", marginBottom: 32, maxWidth: 520 }}>
            {status === "navigating" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 16, color: GOLD, fontWeight: 600 }}>{statusLabel}…</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 200, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: GOLD, width: `${((2 - countdown) / 2) * 100}%`, transition: "width 0.9s linear", borderRadius: 2 }} />
                  </div>
                  <button onClick={cancelNav} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <X style={{ width: 12, height: 12 }} /> Cancel
                  </button>
                </div>
              </div>
            ) : status === "processing" ? (
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>On it…</p>
            ) : status === "done" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <CheckCircle style={{ width: 16, height: 16, color: "#22c55e" }} />
                <p style={{ fontSize: 15, color: "#22c55e", fontWeight: 500 }}>{statusLabel}</p>
              </div>
            ) : greeting ? (
              <div>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, fontStyle: "italic" }}>"{getDailyQuote()}"</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>What are we working on today, {firstName || "friend"}?</p>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Ready. Give me a command.</p>
            )}
          </div>

          {/* Recent command log (inline, compact) */}
          {!showHistory && history.length > 0 && (
            <div style={{ width: "100%", maxWidth: 520, marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent</p>
              {history.slice(0, 3).map(h => (
                <HistoryRow key={h.id} {...h} />
              ))}
            </div>
          )}

          {/* Full history panel */}
          {showHistory && (
            <div style={{ width: "100%", maxWidth: 520, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 20px", marginBottom: 24, maxHeight: 280, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Command History</p>
                {history.length > 0 && (
                  <button onClick={clearHistory} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >
                    <Trash2 style={{ width: 11, height: 11 }} /> Clear
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "16px 0" }}>No commands yet</p>
              ) : (
                history.map(h => <HistoryRow key={h.id} {...h} />)
              )}
            </div>
          )}

          {/* Input bar */}
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: listening ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${listening ? GOLD + "50" : status === "processing" ? "#818cf840" : "rgba(255,255,255,0.09)"}`, borderRadius: 18, padding: "10px 10px 10px 20px", transition: "all 0.2s" }}>
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); executeCommand(input); } }}
                placeholder={listening ? "Listening… speak your command" : `Command ${jarvisName}…`}
                disabled={status === "processing" || status === "navigating"}
                data-testid="input-jarvis-command"
                style={{ background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 15, color: listening ? GOLD : "rgba(255,255,255,0.85)", minHeight: 36, maxHeight: 120, padding: 0, boxShadow: "none", flex: 1, fontWeight: 500 }}
                className="placeholder:text-white/20 placeholder:font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {hasSR && (
                  <button onClick={handleMic} disabled={status === "processing" || status === "navigating"} data-testid="button-jarvis-mic"
                    title={listening ? "Stop listening" : "Voice command"}
                    style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: listening ? `${GOLD}22` : "rgba(255,255,255,0.06)", color: listening ? GOLD : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: listening ? `0 0 16px ${GOLD}40` : "none", animation: listening ? "orb-pulse-gold 1s ease-in-out infinite" : "none" }}
                  >
                    {listening ? <MicOff style={{ width: 18, height: 18 }} /> : <Mic style={{ width: 18, height: 18 }} />}
                  </button>
                )}
                <button onClick={() => executeCommand(input)} disabled={!input.trim() || status === "processing" || status === "navigating"} data-testid="button-jarvis-send"
                  style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: input.trim() && status === "idle" ? `linear-gradient(135deg, ${GOLD}, #f0c84b)` : "rgba(255,255,255,0.07)", color: input.trim() && status === "idle" ? "#000" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && status === "idle" ? "pointer" : "not-allowed", transition: "all 0.2s" }}
                >
                  <Send style={{ width: 17, height: 17 }} />
                </button>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 10 }}>
              {isFree ? "2 credits per command · Upgrade to Growth+ for unlimited" : "Unlimited on your plan"} · {hasSR ? "🎤 Voice commands supported" : "Type your command above"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orb-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes orb-fast { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes orb-pulse-gold { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </ClientLayout>
  );
}
