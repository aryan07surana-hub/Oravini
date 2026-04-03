import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, X, Maximize2, RotateCcw, ChevronRight, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useLocation } from "wouter";

const GOLD = "#d4b461";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Give me 3 viral hook ideas",
  "How do I use AI Ideas?",
  "Help me plan my week of content",
];

function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/•\s/g, "")
    .replace(/^\s*[-*]\s/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export default function JarvisBubble() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: `Hey${(user as any)?.name ? ` ${(user as any).name.split(" ")[0]}` : ""}! I'm Jarvis. Ask me anything — content ideas, platform help, growth strategy. What's on your mind?`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => { synthRef.current?.cancel(); };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const speak = useCallback((text: string) => {
    if (!voiceOn || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang.startsWith("en-US"))
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synthRef.current.speak(utterance);
  }, [voiceOn]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, []);

  const hasSpeechRecognition = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const handleMic = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Mic not supported", description: "Use Chrome or Edge for voice input.", variant: "destructive" }); return; }
    stopSpeaking();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript || "";
      if (t.trim()) setInput(t.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const send = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput("");
    stopSpeaking();
    const history = messages.slice(-8);
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await apiRequest("POST", "/api/jarvis/chat", {
        message: text,
        history: history.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      speak(data.reply);
    } catch (err: any) {
      if (err?.status === 402 || (typeof err?.message === "string" && err.message.toLowerCase().includes("credit"))) {
        setMessages(prev => [...prev, { role: "assistant", content: "You're out of credits. Upgrade to Growth+ for unlimited Jarvis — or grab a credit top-up." }]);
      } else {
        toast({ title: "Jarvis is unavailable", description: "Try again in a moment.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const reset = () => {
    stopSpeaking();
    setMessages([{ role: "assistant", content: "Fresh start! What do you want to work on?" }]);
    setInput("");
  };

  const iconBtn = (active = false) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    color: active ? GOLD : "rgba(255,255,255,0.3)",
    padding: 6,
    borderRadius: 6,
    display: "flex",
    transition: "color 0.15s",
  } as React.CSSProperties);

  return (
    <>
      {/* Floating bubble — pulses gold when speaking */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="button-jarvis-bubble"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9990,
            width: 54, height: 54, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, #f0c84b)`,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 32px ${GOLD}55, 0 2px 8px rgba(0,0,0,0.4)`,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          title="Open Jarvis"
        >
          <Sparkles style={{ width: 22, height: 22, color: "#000" }} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          data-testid="panel-jarvis"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9990,
            width: 360, height: 520,
            background: "#0c0c0c",
            border: `1px solid ${speaking ? GOLD + "60" : GOLD + "30"}`,
            borderRadius: 20,
            display: "flex", flexDirection: "column",
            boxShadow: speaking
              ? `0 24px 80px rgba(0,0,0,0.7), 0 0 24px ${GOLD}30`
              : `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${GOLD}15`,
            overflow: "hidden",
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, background: "#0c0c0c", flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: speaking ? `0 0 12px ${GOLD}60` : "none", transition: "box-shadow 0.3s" }}>
              <Sparkles style={{ width: 14, height: 14, color: GOLD }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1 }}>Jarvis</div>
              <div style={{ fontSize: 11, color: speaking ? GOLD : "rgba(255,255,255,0.3)", marginTop: 2, display: "flex", alignItems: "center", gap: 5, transition: "color 0.3s" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: speaking ? GOLD : "#22c55e", transition: "background 0.3s" }} />
                {speaking ? "Speaking…" : "Online"}
              </div>
            </div>

            {/* Voice toggle */}
            <button
              onClick={() => { setVoiceOn(v => !v); if (speaking) stopSpeaking(); }}
              title={voiceOn ? "Mute Jarvis" : "Let Jarvis speak"}
              style={iconBtn(voiceOn)}
              onMouseEnter={e => (e.currentTarget.style.color = voiceOn ? GOLD : "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = voiceOn ? GOLD : "rgba(255,255,255,0.3)")}
            >
              {voiceOn ? <Volume2 style={{ width: 13, height: 13 }} /> : <VolumeX style={{ width: 13, height: 13 }} />}
            </button>

            <button onClick={reset} title="New chat" style={iconBtn()}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <RotateCcw style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => navigate("/jarvis")} title="Open full page" style={iconBtn()}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <Maximize2 style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => { setOpen(false); stopSpeaking(); }} title="Close" style={iconBtn()}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 mb-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <Sparkles style={{ width: 11, height: 11, color: GOLD }} />
                  </div>
                )}
                <div style={{ maxWidth: "82%", background: m.role === "user" ? `${GOLD}18` : "rgba(255,255,255,0.05)", border: `1px solid ${m.role === "user" ? `${GOLD}30` : "rgba(255,255,255,0.08)"}`, borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 12px", fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles style={{ width: 11, height: 11, color: GOLD }} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px 14px 14px 4px", padding: "12px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, opacity: 0.5, animation: "jp 1.2s ease-in-out infinite", animationDelay: `${j*0.2}s` }} />)}
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => send(p)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}10`; e.currentTarget.style.borderColor = `${GOLD}30`; e.currentTarget.style.color = GOLD; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                  >
                    {p} <ChevronRight style={{ width: 11, height: 11, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0c0c0c", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: listening ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${listening ? `${GOLD}40` : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "7px 8px 7px 12px", transition: "all 0.2s" }}>
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={listening ? "Listening… speak now" : "Message Jarvis…"}
                disabled={loading}
                data-testid="input-jarvis-bubble"
                style={{ background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 13, color: listening ? GOLD : "rgba(255,255,255,0.85)", minHeight: 28, maxHeight: 80, padding: 0, boxShadow: "none", flex: 1 }}
                className="placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                {hasSpeechRecognition && (
                  <button onClick={handleMic} data-testid="button-jarvis-bubble-mic" title={listening ? "Stop recording" : "Speak to Jarvis"}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: listening ? `${GOLD}22` : "rgba(255,255,255,0.05)", color: listening ? GOLD : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: listening ? `0 0 10px ${GOLD}35` : "none" }}
                  >
                    {listening ? <MicOff style={{ width: 12, height: 12 }} /> : <Mic style={{ width: 12, height: 12 }} />}
                  </button>
                )}
                <button onClick={() => send()} disabled={loading || !input.trim()} data-testid="button-jarvis-bubble-send"
                  style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: input.trim() && !loading ? GOLD : "rgba(255,255,255,0.06)", color: input.trim() && !loading ? "#000" : "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "not-allowed", transition: "all 0.15s" }}
                >
                  <Send style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes jp { 0%,80%,100%{transform:scale(0.7);opacity:0.35} 40%{transform:scale(1);opacity:1} }`}</style>
    </>
  );
}
