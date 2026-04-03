import { useState, useRef, useEffect, useCallback } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Zap, RotateCcw, ChevronRight, Volume2, VolumeX, Mic, MicOff, Square } from "lucide-react";

const GOLD = "#d4b461";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "How do I use AI Content Ideas?",
  "Give me 5 viral hook ideas for Instagram",
  "What's the best posting schedule for growth?",
  "How do I build my content funnel?",
  "Explain my plan's features",
  "Help me write a caption for a carousel",
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

function useVoice() {
  const [voiceOn, setVoiceOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => { synthRef.current?.cancel(); };
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceOn || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    // Pick a good English voice if available
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

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    synthRef.current?.cancel();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript || "";
      if (transcript.trim()) onResult(transcript.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    return true;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const hasSpeechRecognition = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  return { voiceOn, setVoiceOn, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSpeechRecognition };
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      {!isUser && (
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}33, ${GOLD}11)`, border: `1px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <Sparkles style={{ width: 15, height: 15, color: GOLD }} />
        </div>
      )}
      <div style={{ maxWidth: "78%", background: isUser ? `${GOLD}18` : "rgba(255,255,255,0.04)", border: `1px solid ${isUser ? `${GOLD}33` : "rgba(255,255,255,0.08)"}`, borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px", fontSize: 14, lineHeight: 1.6, color: isUser ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Jarvis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const plan = (user as any)?.plan || "free";
  const isFree = !["growth", "pro", "elite"].includes(plan);

  const { voiceOn, setVoiceOn, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSpeechRecognition } = useVoice();

  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: `Hey${(user as any)?.name ? ` ${(user as any).name.split(" ")[0]}` : ""}! I'm Jarvis — your AI assistant inside Oravini. I can help you navigate the platform, generate content ideas, build your growth strategy, coach you on content creation, or just answer any questions you have.\n\nWhat do you want to work on today?`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput("");
    stopSpeaking();
    const history = messages.slice(-10);
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
      if (err?.status === 402 || (typeof err?.message === "string" && err.message.includes("credit"))) {
        toast({ title: "Not enough credits", description: "Upgrade to Growth+ for unlimited Jarvis access.", variant: "destructive" });
        setMessages(prev => [...prev, { role: "assistant", content: "You've run out of credits. Upgrade to Growth, Pro, or Elite to use Jarvis for free — or buy a credit top-up on the Credits page." }]);
      } else {
        toast({ title: "Jarvis ran into an issue", description: "Please try again.", variant: "destructive" });
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

  const handleMic = () => {
    if (listening) { stopListening(); return; }
    const started = startListening((text) => {
      setInput(text);
    });
    if (!started) toast({ title: "Microphone not supported", description: "Use Chrome or Edge for voice input.", variant: "destructive" });
  };

  const btnStyle = (active: boolean, gold = false) => ({
    background: active ? (gold ? GOLD : "rgba(255,255,255,0.12)") : "none",
    border: active ? `1px solid ${gold ? GOLD : "rgba(255,255,255,0.2)"}` : "1px solid transparent",
    borderRadius: 8,
    cursor: "pointer",
    color: active ? (gold ? "#000" : "#fff") : "rgba(255,255,255,0.35)",
    padding: "6px 8px",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.15s",
  });

  return (
    <ClientLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]" style={{ background: "#070707" }}>

        {/* Header */}
        <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#070707", flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}28, ${GOLD}10)`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: speaking ? `0 0 18px ${GOLD}70` : "none", transition: "box-shadow 0.3s" }}>
                <Sparkles style={{ width: 18, height: 18, color: GOLD }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>Jarvis</h1>
                  <Badge style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30`, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>AI</Badge>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: speaking ? GOLD : "#22c55e", boxShadow: `0 0 8px ${speaking ? GOLD : "#22c55e"}`, transition: "all 0.3s" }} />
                  {speaking && <span style={{ fontSize: 11, color: GOLD, fontWeight: 600, animation: "jarvis-pulse 1s ease-in-out infinite" }}>speaking…</span>}
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>Your full-stack Oravini assistant</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isFree && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 10px" }}>
                  <Zap style={{ width: 12, height: 12, color: GOLD }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>2 credits/msg</span>
                </div>
              )}
              {!isFree && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${GOLD}10`, border: `1px solid ${GOLD}25`, borderRadius: 8, padding: "6px 10px" }}>
                  <Sparkles style={{ width: 12, height: 12, color: GOLD }} />
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>Unlimited</span>
                </div>
              )}

              {/* Voice toggle */}
              {speaking ? (
                <button onClick={stopSpeaking} data-testid="button-jarvis-stop-speaking" style={{ ...btnStyle(true, true), gap: 6 }}>
                  <Square style={{ width: 11, height: 11 }} /> Stop
                </button>
              ) : (
                <button onClick={() => setVoiceOn(v => !v)} title={voiceOn ? "Voice on — click to mute" : "Voice off — click to enable"} data-testid="button-jarvis-voice" style={btnStyle(voiceOn)}>
                  {voiceOn ? <Volume2 style={{ width: 14, height: 14 }} /> : <VolumeX style={{ width: 14, height: 14 }} />}
                  <span>{voiceOn ? "Voice On" : "Voice Off"}</span>
                </button>
              )}

              <Button variant="ghost" size="sm" onClick={reset} className="text-xs gap-1.5 text-muted-foreground hover:text-white" data-testid="button-jarvis-reset">
                <RotateCcw className="w-3.5 h-3.5" /> New chat
              </Button>
            </div>
          </div>

          {/* Starter pills */}
          {messages.length <= 1 && (
            <div className="flex gap-2 flex-wrap mt-4">
              {STARTERS.map((s, i) => (
                <button key={i} onClick={() => send(s)} data-testid={`button-jarvis-starter-${i}`}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 100, padding: "5px 12px", fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}12`; e.currentTarget.style.borderColor = `${GOLD}30`; e.currentTarget.style.color = GOLD; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                >
                  {s} <ChevronRight style={{ width: 11, height: 11 }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {loading && (
            <div className="flex gap-3 mb-4">
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}33, ${GOLD}11)`, border: `1px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles style={{ width: 15, height: 15, color: GOLD }} />
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, opacity: 0.6, animation: "jarvis-pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "16px 28px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#070707", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: listening ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${listening ? `${GOLD}40` : "rgba(255,255,255,0.09)"}`, borderRadius: 14, padding: "8px 8px 8px 16px", transition: "all 0.2s" }}>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={listening ? "Listening… speak now" : "Ask Jarvis anything…"}
              disabled={loading}
              data-testid="input-jarvis-message"
              style={{ background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: listening ? GOLD : "rgba(255,255,255,0.85)", minHeight: 36, maxHeight: 120, padding: 0, boxShadow: "none", flex: 1 }}
              className="placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              {hasSpeechRecognition && (
                <button onClick={handleMic} data-testid="button-jarvis-mic" title={listening ? "Stop recording" : "Speak to Jarvis"}
                  style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: listening ? `${GOLD}22` : "rgba(255,255,255,0.06)", color: listening ? GOLD : "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: listening ? `0 0 12px ${GOLD}40` : "none" }}
                >
                  {listening ? <MicOff style={{ width: 15, height: 15 }} /> : <Mic style={{ width: 15, height: 15 }} />}
                </button>
              )}
              <button onClick={() => send()} disabled={loading || !input.trim()} data-testid="button-jarvis-send"
                style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: input.trim() && !loading ? GOLD : "rgba(255,255,255,0.07)", color: input.trim() && !loading ? "#000" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "not-allowed", transition: "all 0.2s" }}
              >
                <Send style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 10 }}>
            {isFree ? "2 credits per message · Upgrade to Growth+ for unlimited Jarvis access" : "Unlimited on your plan · Jarvis may make mistakes — verify important info"}
            {hasSpeechRecognition && " · 🎤 Voice input supported"}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes jarvis-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </ClientLayout>
  );
}
