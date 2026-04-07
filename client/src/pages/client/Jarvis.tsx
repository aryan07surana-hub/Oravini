import { useState, useRef, useEffect, useCallback } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Sparkles, Volume2, VolumeX, Trash2, Radio, CheckCircle, Loader2, X } from "lucide-react";
import { useJarvis, getDailyQuote } from "@/contexts/JarvisContext";
import { useLocation } from "wouter";

const GOLD = "#d4b461";

// ── Voice helpers ──────────────────────────────────────────────────────────
function stripForSpeech(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "").replace(/[•\-]\s/g, "")
    .replace(/\n{2,}/g, ". ").replace(/\n/g, " ").replace(/[🔥🚀✨🎯💡]/g, "").trim();
}

function useVoice() {
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem("jarvis_voice") !== "false");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    window.speechSynthesis.getVoices();
    return () => { synthRef.current?.cancel(); };
  }, []);

  const speak = useCallback((text: string, voiceEnabled: boolean) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.rate = 0.95; u.pitch = 0.9; u.volume = 1;
    const voices = synthRef.current.getVoices();
    const pref = voices.find(v => v.name === "Google UK English Female")
      || voices.find(v => v.name === "Google US English")
      || voices.find(v => v.name.includes("Samantha"))
      || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang === "en-US") || voices.find(v => v.lang.startsWith("en"));
    if (pref) u.voice = pref;
    u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
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

// ── Setup Screen ────────────────────────────────────────────────────────────
function SetupScreen({ onName }: { onName: (name: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onName(name); // instant — no delay
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#030303", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "0 24px" }}>
      <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, -50%)", width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", marginBottom: 44 }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${GOLD}55, ${GOLD}18, transparent)`, border: `1.5px solid ${GOLD}38`, boxShadow: `0 0 55px ${GOLD}28, 0 0 110px ${GOLD}14`, animation: "orb-breathe 3s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles style={{ width: 34, height: 34, color: GOLD, opacity: 0.9 }} />
        </div>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", textAlign: "center", margin: "0 0 10px" }}>Meet your AI</h1>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", margin: "0 0 36px", maxWidth: 340, lineHeight: 1.6 }}>
        Give your AI assistant a name. You'll use it as a wake word — just say <span style={{ color: GOLD }}>"Hey [name]"</span> to activate it.
      </p>
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <Input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); }} placeholder='e.g. "Aria", "Nova", "Rex"…' maxLength={20} data-testid="input-jarvis-setup-name"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${value.trim() ? GOLD + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 13, padding: "13px 18px", fontSize: 17, fontWeight: 700, color: "#fff", height: "auto", textAlign: "center", transition: "border-color 0.2s", letterSpacing: "0.02em" }}
          className="focus-visible:ring-0 placeholder:font-normal placeholder:text-white/18 placeholder:text-sm placeholder:tracking-normal" />
        <button onClick={submit} disabled={!value.trim()} data-testid="button-jarvis-setup-launch"
          style={{ background: value.trim() ? `linear-gradient(135deg, ${GOLD}, #f0c84b)` : "rgba(255,255,255,0.06)", border: "none", borderRadius: 13, padding: "13px 24px", fontSize: 15, fontWeight: 800, color: value.trim() ? "#000" : "rgba(255,255,255,0.18)", cursor: value.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
          Launch {value.trim() || "your AI"} →
        </button>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 44, flexWrap: "wrap", justifyContent: "center" }}>
        {["Voice activated", "Navigates for you", "Generates content", "Saves history"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, opacity: 0.5 }} />{f}
          </div>
        ))}
      </div>
      <style>{`@keyframes orb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
    </div>
  );
}

// ── Cinematic Intro ─────────────────────────────────────────────────────────
interface CineSegment {
  lines: { text: string; style: "hero" | "normal" | "italic" | "gold-hero" | "emphasis" | "emphasis-gold" | "contrast-l" | "contrast-r" | "list" | "cta" | "spacer" }[];
  gap: number;
}

function buildSegments(firstName: string, agentName: string): CineSegment[] {
  return [
    { lines: [{ text: `Hello, ${firstName}.`, style: "hero" }], gap: 1800 },
    { lines: [{ text: "", style: "spacer" }, { text: "You've seen what assistants can do.", style: "normal" }], gap: 1800 },
    { lines: [{ text: "", style: "spacer" }, { text: "You've heard of systems like JARVIS —", style: "normal" }, { text: "built to respond, assist, and execute.", style: "normal" }], gap: 2200 },
    { lines: [{ text: "", style: "spacer" }, { text: "But this…", style: "italic" }, { text: "", style: "spacer" }, { text: "This is something else.", style: "italic" }], gap: 2200 },
    { lines: [{ text: "", style: "spacer" }, { text: `Meet ${agentName}.`, style: "gold-hero" }], gap: 3200 },
    { lines: [{ text: "", style: "spacer" }, { text: "Not just an assistant.", style: "normal" }, { text: "Not just a voice in the background.", style: "normal" }], gap: 2000 },
    { lines: [{ text: "", style: "spacer" }, { text: "A system designed to think, adapt, and scale with you.", style: "emphasis" }], gap: 2000 },
    { lines: [{ text: "", style: "spacer" }, { text: "Others rely on tools.", style: "contrast-l" }, { text: "You now operate an ecosystem.", style: "contrast-r" }, { text: "", style: "spacer" }, { text: "Others create content.", style: "contrast-l" }, { text: "You engineer influence.", style: "contrast-r" }], gap: 2500 },
    { lines: [{ text: "", style: "spacer" }, { text: "This is where ideas turn into execution —", style: "normal" }, { text: "and execution turns into growth.", style: "normal" }], gap: 2000 },
    { lines: [{ text: "", style: "spacer" }, { text: "Every decision, optimized.", style: "list" }, { text: "Every move, calculated.", style: "list" }, { text: "Every outcome, intentional.", style: "list" }], gap: 2200 },
    { lines: [{ text: "", style: "spacer" }, { text: "You're no longer working with AI.", style: "emphasis" }, { text: "", style: "spacer" }, { text: "You're operating through it.", style: "emphasis-gold" }], gap: 2200 },
    { lines: [{ text: "", style: "spacer" }, { text: "This isn't the future Tony Stark imagined.", style: "normal" }, { text: "", style: "spacer" }, { text: "It's what comes after.", style: "hero" }], gap: 2500 },
    { lines: [{ text: "", style: "spacer" }, { text: "Whenever you're ready —", style: "normal" }, { text: "", style: "spacer" }, { text: "Give the command.", style: "cta" }], gap: 0 },
  ];
}

function CinematicIntro({ firstName, agentName, onComplete }: { firstName: string; agentName: string; onComplete: () => void }) {
  const allFlat = buildSegments(firstName, agentName).flatMap(s => s.lines);
  const segmentLengths = buildSegments(firstName, agentName).map(s => s.lines.length);
  const segmentGaps = buildSegments(firstName, agentName).map(s => s.gap);

  const [visibleCount, setVisibleCount] = useState(0);
  const [showCTA, setShowCTA] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let total = 0;
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleNext = (delay: number) => {
      if (idx >= segmentLengths.length) {
        timers.push(setTimeout(() => setShowCTA(true), delay + 500));
        timers.push(setTimeout(() => { if (!doneRef.current) { doneRef.current = true; onComplete(); } }, delay + 5000));
        return;
      }
      timers.push(setTimeout(() => {
        total += segmentLengths[idx];
        setVisibleCount(total);
        const gap = segmentGaps[idx];
        idx++;
        scheduleNext(gap);
      }, delay));
    };

    timers.push(setTimeout(() => scheduleNext(0), 600));
    return () => timers.forEach(t => clearTimeout(t));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount]);

  const lineStyle = (style: string): React.CSSProperties => {
    const base: React.CSSProperties = { animation: "cine-appear 0.75s ease forwards", opacity: 0, textAlign: "center", lineHeight: 1.65 };
    switch (style) {
      case "hero": return { ...base, fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "0.01em", marginBottom: 2 };
      case "normal": return { ...base, fontSize: 17, color: "rgba(255,255,255,0.72)", fontWeight: 400, marginBottom: 2 };
      case "italic": return { ...base, fontSize: 19, color: "rgba(255,255,255,0.82)", fontStyle: "italic", fontWeight: 400, marginBottom: 2 };
      case "gold-hero": return { ...base, fontSize: 52, fontWeight: 900, color: GOLD, textShadow: `0 0 40px ${GOLD}70, 0 0 80px ${GOLD}40`, letterSpacing: "-0.01em", marginBottom: 4, lineHeight: 1.2 };
      case "emphasis": return { ...base, fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 2 };
      case "emphasis-gold": return { ...base, fontSize: 22, fontWeight: 700, color: GOLD, marginBottom: 2 };
      case "contrast-l": return { ...base, fontSize: 16, color: "rgba(255,255,255,0.45)", fontWeight: 400, marginBottom: 1 };
      case "contrast-r": return { ...base, fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: 700, marginBottom: 6, paddingLeft: 12 };
      case "list": return { ...base, fontSize: 17, color: "rgba(255,255,255,0.8)", fontWeight: 500, marginBottom: 3 };
      case "cta": return { ...base, fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "0.01em", marginBottom: 4 };
      case "spacer": return { height: 18, display: "block" };
      default: return base;
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
      {/* Ambient gold glow */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}07 0%, transparent 65%)`, pointerEvents: "none" }} />

      {/* Animated scanline */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}30, transparent)`, animation: "scan-line 8s linear infinite", pointerEvents: "none" }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: "absolute", width: i % 2 === 0 ? 3 : 2, height: i % 2 === 0 ? 3 : 2, borderRadius: "50%", background: GOLD, opacity: 0.35, left: `${15 + i * 14}%`, animation: `float-particle-${i % 3} ${7 + i * 1.3}s ease-in-out infinite`, animationDelay: `${i * 1.1}s`, pointerEvents: "none" }} />
      ))}

      {/* Faint grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(212,180,97,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,180,97,0.03) 1px, transparent 1px)`, backgroundSize: "80px 80px", pointerEvents: "none" }} />

      {/* Skip */}
      <button onClick={() => { doneRef.current = true; onComplete(); }} data-testid="button-cinematic-skip"
        style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "6px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer", zIndex: 10, fontWeight: 500, transition: "all 0.2s", letterSpacing: "0.04em" }}
        onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
      >SKIP</button>

      {/* Text scroll container */}
      <div ref={containerRef} style={{ flex: 1, width: "100%", maxWidth: 680, padding: "80px 32px 120px", overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "flex-start", scrollbarWidth: "none", msOverflowStyle: "none" }}
        className="[&::-webkit-scrollbar]:hidden">
        {allFlat.slice(0, visibleCount).map((line, i) => (
          line.style === "spacer"
            ? <div key={i} style={lineStyle("spacer")} />
            : <div key={i} style={lineStyle(line.style)}>{line.text}</div>
        ))}

        {/* CTA button */}
        {showCTA && (
          <div style={{ textAlign: "center", marginTop: 36, animation: "cine-appear 1s ease forwards", opacity: 0 }}>
            <button onClick={() => { doneRef.current = true; onComplete(); }} data-testid="button-cinematic-enter"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #f0c84b)`, border: "none", borderRadius: 50, padding: "14px 40px", fontSize: 15, fontWeight: 800, color: "#000", cursor: "pointer", letterSpacing: "0.06em", boxShadow: `0 0 40px ${GOLD}50`, animation: "cta-glow 2s ease-in-out infinite" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >ENTER →</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cine-appear { from { opacity:0; transform:translateY(14px); filter:blur(3px); } to { opacity:1; transform:translateY(0); filter:blur(0); } }
        @keyframes scan-line { 0%{top:0} 100%{top:100%} }
        @keyframes float-particle-0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-60px)} }
        @keyframes float-particle-1 { 0%,100%{transform:translateY(-30px)} 50%{transform:translateY(40px)} }
        @keyframes float-particle-2 { 0%,100%{transform:translateY(20px)} 50%{transform:translateY(-50px)} }
        @keyframes cta-glow { 0%,100%{box-shadow:0 0 40px ${GOLD}50} 50%{box-shadow:0 0 70px ${GOLD}80} }
      `}</style>
    </div>
  );
}

// ── History row ─────────────────────────────────────────────────────────────
function HistoryRow({ command, response, action, ts }: { command: string; response: string; action?: string; ts: number }) {
  const time = new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <CheckCircle style={{ width: 11, height: 11, color: "#22c55e" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{command}"</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{action || response.slice(0, 60)}</div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0, alignSelf: "center" }}>{time}</div>
    </div>
  );
}

// ── Command Center ──────────────────────────────────────────────────────────
type Phase = "setup" | "cinematic" | "ready";

export default function Jarvis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { jarvisName, setJarvisName, isNamed, wakeWordEnabled, setWakeWordEnabled, hasSpeechRecognition, history, addToHistory, clearHistory, setIsSpeaking, sessionActive, startSession, stopSession, setPendingInject } = useJarvis();
  const { voiceOn, toggleVoice, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSR } = useVoice();

  const plan = (user as any)?.plan || "free";
  const isFree = !["growth", "pro", "elite"].includes(plan);
  const firstName = (user as any)?.name?.split(" ")[0] || "";

  // Only show cinematic once per device
  const [phase, setPhase] = useState<Phase>(() => {
    if (!localStorage.getItem("jarvis_name")) return "setup";
    if (!localStorage.getItem("jarvis_cinematic_seen")) return "cinematic";
    return "ready";
  });
  const [pendingName, setPendingName] = useState("");

  const [lastReply, setLastReply] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "navigating" | "done">("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const hasSpokenRef = useRef(false);
  const autoMicRef = useRef(false);
  const recAutoRef = useRef<any>(null);

  // Sync speaking state to global context (for sidebar icon animation)
  useEffect(() => { setIsSpeaking(speaking); }, [speaking, setIsSpeaking]);

  // Auto-mic: starts listening and auto-executes
  const startAutoListen = useCallback(() => {
    if (!autoMicRef.current || !hasSR) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recAutoRef.current) { try { recAutoRef.current.stop(); } catch {} recAutoRef.current = null; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript || "";
      if (t.trim()) {
        setStatus("idle"); setStatusLabel("");
        executeCommandRef.current(t.trim());
      }
    };
    rec.onerror = () => { setStatus("idle"); setStatusLabel(""); };
    rec.onend = () => { setStatus("idle"); setStatusLabel(""); };
    rec.start(); recAutoRef.current = rec;
    setStatus("listening"); setStatusLabel("Listening…");
  }, [hasSR]);

  // Speak greeting once on ready and start mic loop
  useEffect(() => {
    if (phase === "ready" && !hasSpokenRef.current) {
      hasSpokenRef.current = true;
      autoMicRef.current = true;
      if (voiceOn) {
        setTimeout(() => {
          speak(`Hey${firstName ? " " + firstName : ""}! "${getDailyQuote()}" — Ready when you are.`, true);
          // After greeting finishes (≈4s), start listening
          setTimeout(() => { if (autoMicRef.current) startAutoListen(); }, 4500);
        }, 800);
      } else {
        setTimeout(() => startAutoListen(), 1000);
      }
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch speaking state → restart mic when done speaking
  useEffect(() => {
    if (!speaking && autoMicRef.current && phase === "ready" && status === "idle" && !listening) {
      const t = setTimeout(() => { if (autoMicRef.current) startAutoListen(); }, 500);
      return () => clearTimeout(t);
    }
  }, [speaking]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetupComplete = (name: string) => {
    setJarvisName(name);
    setPendingName(name);
    setPhase("cinematic");
  };

  const handleCinematicDone = () => {
    localStorage.setItem("jarvis_cinematic_seen", "true");
    setPhase("ready");
  };

  const cancelNav = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setStatus("idle"); setStatusLabel(""); setCountdown(0);
  };

  const startNavCountdown = (url: string, label: string) => {
    setStatus("navigating");
    setStatusLabel(`Taking you to ${label}`);
    setCountdown(2);
    let c = 2;
    countdownRef.current = setInterval(() => {
      c--; setCountdown(c);
      if (c <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        navigate(url);
        setStatus("done"); setStatusLabel(`Opened ${label}`);
        setTimeout(() => { setStatus("idle"); setStatusLabel(""); }, 2000);
      }
    }, 1000);
  };

  const executeCommand = async (text: string) => {
    if (!text.trim() || status === "processing") return;
    stopSpeaking();
    autoMicRef.current = false;
    setStatus("processing"); setStatusLabel("Thinking…");
    try {
      const data = await apiRequest("POST", "/api/jarvis/chat", { message: text, history: history.slice(0, 8).map(h => ({ role: "user", content: h.command })), assistantName: jarvisName });
      const { reply, action, inject } = data;
      setLastReply(reply || "");
      setStatus("idle"); setStatusLabel("");
      addToHistory({ command: text, response: reply || "", action: action ? action.label : undefined });
      // Text injection into any section
      if (inject?.testId) {
        setPendingInject(inject);
      }
      if (action?.url) {
        if (voiceOn && reply) {
          speak(reply, true);
          setTimeout(() => startNavCountdown(action.url, action.label), 800);
        } else {
          startNavCountdown(action.url, action.label);
        }
      } else {
        if (voiceOn && reply) speak(reply, true);
        autoMicRef.current = true;
        if (!voiceOn) setTimeout(() => startAutoListen(), 400);
      }
    } catch (err: any) {
      setStatus("idle"); setStatusLabel("");
      autoMicRef.current = true;
      if (err?.status === 402) {
        toast({ title: "Out of credits", description: `Upgrade to Growth+ for unlimited ${jarvisName}.`, variant: "destructive" });
        addToHistory({ command: text, response: "Out of credits", action: "Upgrade needed" });
      } else {
        toast({ title: `${jarvisName} hit a snag`, description: "Please try again.", variant: "destructive" });
      }
    }
  };

  // Keep ref current to avoid stale closure in startAutoListen
  const executeCommandRef = useRef<(t: string) => void>(() => {});
  executeCommandRef.current = executeCommand;

  const handleMic = () => {
    if (listening || status === "listening") {
      // Manual stop — disable auto-mic too
      if (recAutoRef.current) { try { recAutoRef.current.stop(); } catch {} recAutoRef.current = null; }
      stopListening(); autoMicRef.current = false; setStatus("idle"); setStatusLabel(""); return;
    }
    autoMicRef.current = true;
    startAutoListen();
  };

  const statusColor = { idle: "#22c55e", listening: GOLD, processing: "#818cf8", navigating: GOLD, done: "#22c55e" }[status];
  const orbAnimation = speaking ? "orb-speak" : status === "processing" ? "orb-fast" : status === "listening" ? "orb-pulse" : "orb-breathe";

  const currentAgentName = pendingName || jarvisName || "AI";

  if (phase === "setup") {
    return <ClientLayout><SetupScreen onName={handleSetupComplete} /></ClientLayout>;
  }

  if (phase === "cinematic") {
    return (
      <ClientLayout>
        <CinematicIntro firstName={firstName || "there"} agentName={currentAgentName} onComplete={handleCinematicDone} />
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div style={{ height: "calc(100vh - 64px)", background: "#060606", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "22%", left: "50%", transform: "translate(-50%, -50%)", width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}07 0%, transparent 70%)`, pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{jarvisName}</div>
            {sessionActive ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 20, padding: "3px 10px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "dot-pulse 0.8s ease-in-out infinite" }} />
                <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, letterSpacing: "0.06em" }}>LIVE SESSION</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "3px 9px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor, boxShadow: `0 0 5px ${statusColor}`, transition: "all 0.3s" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>
                  {status === "idle" ? "Ready" : status === "listening" ? "Listening" : status === "processing" ? "Processing" : status === "navigating" ? "Navigating" : "Done"}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {hasSpeechRecognition && (
              <button onClick={() => setWakeWordEnabled(!wakeWordEnabled)} data-testid="button-wake"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: `1px solid ${wakeWordEnabled ? GOLD + "40" : "rgba(255,255,255,0.08)"}`, background: wakeWordEnabled ? `${GOLD}0e` : "transparent", cursor: "pointer", fontSize: 10, color: wakeWordEnabled ? GOLD : "rgba(255,255,255,0.3)", fontWeight: 600, transition: "all 0.2s" }}
              ><Radio style={{ width: 10, height: 10 }} />{wakeWordEnabled ? `"Hey ${jarvisName}"` : "Wake Off"}</button>
            )}
            <button onClick={toggleVoice} data-testid="button-voice"
              style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${voiceOn ? GOLD + "40" : "rgba(255,255,255,0.08)"}`, background: voiceOn ? `${GOLD}0e` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: voiceOn ? GOLD : "rgba(255,255,255,0.3)", fontWeight: 600, transition: "all 0.2s" }}
            >{voiceOn ? <Volume2 style={{ width: 10, height: 10 }} /> : <VolumeX style={{ width: 10, height: 10 }} />}{voiceOn ? "Voice On" : "Voice Off"}</button>
            <button onClick={() => setShowHistory(h => !h)} data-testid="button-history"
              style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${showHistory ? GOLD + "40" : "rgba(255,255,255,0.08)"}`, background: showHistory ? `${GOLD}0e` : "transparent", cursor: "pointer", fontSize: 10, color: showHistory ? GOLD : "rgba(255,255,255,0.3)", fontWeight: 600, transition: "all 0.2s" }}
            >{showHistory ? "Hide Log" : "Command Log"}</button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 24px", position: "relative", zIndex: 1 }}>
          {/* Orb */}
          <div style={{ position: "relative", marginBottom: 26 }}>
            <div style={{ width: 114, height: 114, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${GOLD}48, ${GOLD}16, transparent)`, border: `1.5px solid ${GOLD}${speaking ? "80" : "32"}`, boxShadow: speaking ? `0 0 65px ${GOLD}70, 0 0 130px ${GOLD}35, 0 0 200px ${GOLD}15` : status === "processing" ? `0 0 40px #818cf850, 0 0 80px #818cf820` : status === "listening" ? `0 0 45px ${GOLD}40, 0 0 90px ${GOLD}20` : `0 0 38px ${GOLD}18, 0 0 76px ${GOLD}10`, animation: `${orbAnimation} ${speaking ? "0.4s" : status === "processing" ? "0.8s" : "3s"} ease-in-out infinite`, display: "flex", alignItems: "center", justifyContent: "center", transition: "box-shadow 0.4s, border-color 0.4s" }}>
              {status === "processing" ? <Loader2 style={{ width: 38, height: 38, color: GOLD, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 38, height: 38, color: GOLD, opacity: 0.88, animation: speaking ? "sparkle-talk 0.45s ease-in-out infinite alternate" : "none" }} />}
            </div>
          </div>

          {/* Status */}
          <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 500 }}>
            {status === "navigating" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 15, color: GOLD, fontWeight: 600 }}>{statusLabel}…</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 180, height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: GOLD, width: `${((2 - countdown) / 2) * 100}%`, transition: "width 0.9s linear", borderRadius: 2 }} />
                  </div>
                  <button onClick={cancelNav} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><X style={{ width: 11, height: 11 }} />Cancel</button>
                </div>
              </div>
            ) : status === "processing" ? (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>On it…</p>
            ) : status === "done" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                <CheckCircle style={{ width: 14, height: 14, color: "#22c55e" }} />
                <p style={{ fontSize: 14, color: "#22c55e", fontWeight: 500 }}>{statusLabel}</p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.28)" }}>
                {history.length === 0 ? `What do you need, ${firstName || "friend"}?` : "Ready for your next command."}
              </p>
            )}
          </div>

          {/* Recent / Full history */}
          {!showHistory && history.length > 0 && (
            <div style={{ width: "100%", maxWidth: 500, marginBottom: 22 }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent</p>
              {history.slice(0, 3).map(h => <HistoryRow key={h.id} {...h} />)}
            </div>
          )}
          {showHistory && (
            <div style={{ width: "100%", maxWidth: 500, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", marginBottom: 22, maxHeight: 260, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Command History</p>
                {history.length > 0 && (
                  <button onClick={clearHistory} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}>
                    <Trash2 style={{ width: 10, height: 10 }} />Clear
                  </button>
                )}
              </div>
              {history.length === 0 ? <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", textAlign: "center", padding: "12px 0" }}>No commands yet</p>
                : history.map(h => <HistoryRow key={h.id} {...h} />)}
            </div>
          )}

          {/* Last AI reply */}
          {lastReply && (
            <div style={{ width: "100%", maxWidth: 520, marginBottom: 20 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 18px" }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, margin: 0 }}>{lastReply}</p>
              </div>
            </div>
          )}

          {/* Mic button — voice agent, no textbox */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button onClick={handleMic} disabled={status === "processing" || status === "navigating"} data-testid="button-jarvis-mic"
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: status === "listening" ? `linear-gradient(135deg, ${GOLD}, #f0c84b)` : "rgba(255,255,255,0.07)",
                border: `2px solid ${status === "listening" ? GOLD : "rgba(255,255,255,0.1)"}`,
                color: status === "listening" ? "#000" : "rgba(255,255,255,0.45)",
                cursor: status === "processing" || status === "navigating" ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: status === "listening" ? `0 0 40px ${GOLD}55, 0 0 80px ${GOLD}22` : "none",
                animation: status === "listening" ? "orb-pulse 1.2s ease-in-out infinite" : "none",
                transition: "all 0.3s",
              }}
            >
              {status === "listening" ? <MicOff style={{ width: 28, height: 28 }} /> : <Mic style={{ width: 28, height: 28 }} />}
            </button>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textAlign: "center" }}>
              {status === "listening" ? "Listening — tap to stop" : isFree ? "Tap to speak · 2 credits/command" : "Tap to speak"}
            </p>
          </div>

          {/* Session Control */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 20 }}>
            {!sessionActive ? (
              <button
                onClick={() => { startSession(); autoMicRef.current = true; startAutoListen(); }}
                data-testid="button-start-session"
                style={{ background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}10)`, border: `1.5px solid ${GOLD}50`, borderRadius: 50, padding: "11px 30px", fontSize: 12, fontWeight: 800, color: GOLD, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.07em", transition: "all 0.2s", boxShadow: `0 0 20px ${GOLD}15` }}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${GOLD}33, ${GOLD}18)`; e.currentTarget.style.boxShadow = `0 0 30px ${GOLD}35`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${GOLD}22, ${GOLD}10)`; e.currentTarget.style.boxShadow = `0 0 20px ${GOLD}15`; }}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD }} />
                START SESSION
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 50, padding: "7px 18px" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "dot-pulse 0.7s ease-in-out infinite" }} />
                  <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 800, letterSpacing: "0.08em" }}>LIVE · FULL ACCESS</span>
                </div>
                <button
                  onClick={() => { stopSession(); autoMicRef.current = false; }}
                  data-testid="button-stop-session"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 50, padding: "7px 20px", fontSize: 11, fontWeight: 700, color: "rgba(239,68,68,0.7)", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                >
                  END SESSION
                </button>
              </div>
            )}
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textAlign: "center", maxWidth: 260 }}>
              {sessionActive ? `${jarvisName} has full access — write in any field, navigate anywhere, speak freely` : "Start a session for continuous hands-free control over the whole app"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes orb-fast{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
        @keyframes orb-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}
        @keyframes orb-speak{0%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.1);filter:brightness(1.45)}100%{transform:scale(1.04);filter:brightness(1.15)}}
        @keyframes sparkle-talk{0%{transform:scale(1) rotate(0deg);opacity:0.85}100%{transform:scale(1.25) rotate(20deg);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.35;transform:scale(0.65)}}
      `}</style>
    </ClientLayout>
  );
}
