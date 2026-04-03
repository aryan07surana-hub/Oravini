import { useState, useRef, useEffect, useCallback } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Zap, RotateCcw, ChevronRight, Volume2, VolumeX, Mic, MicOff, Square, Pencil, Check, ExternalLink, Radio } from "lucide-react";
import { useJarvis, JarvisMessage } from "@/contexts/JarvisContext";
import { useLocation } from "wouter";

const GOLD = "#d4b461";

function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "").replace(/•\s/g, "")
    .replace(/^\s*[-*]\s/gm, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
}

function useVoice() {
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem("jarvis_voice") === "true");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => { synthRef.current?.cancel(); };
  }, []);

  const toggleVoice = () => setVoiceOn(v => {
    const next = !v;
    localStorage.setItem("jarvis_voice", String(next));
    if (!next) synthRef.current?.cancel();
    return next;
  });

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.rate = 1.05; u.pitch = 0.92; u.volume = 1;
    const voices = synthRef.current.getVoices();
    const pref = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang.startsWith("en-US")) || voices.find(v => v.lang.startsWith("en"));
    if (pref) u.voice = pref;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synthRef.current.speak(u);
  }, []);

  const stopSpeaking = useCallback(() => { synthRef.current?.cancel(); setSpeaking(false); }, []);

  const hasSR = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  const startListening = useCallback((onResult: (t: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    stopSpeaking();
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript || ""; if (t.trim()) onResult(t.trim()); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
    return true;
  }, [stopSpeaking]);

  const stopListening = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  return { voiceOn, toggleVoice, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSR };
}

const STARTERS = [
  "Help me grow my Instagram from 0",
  "Give me 5 viral hook ideas",
  "Analyze my content strategy",
  "Generate content ideas for me",
  "What tool should I use first?",
  "Help me write a carousel caption",
];

function ActionCard({ action, onClick }: { action: { url: string; label: string }; onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid="button-jarvis-action"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`, border: `1px solid ${GOLD}40`, borderRadius: 10, padding: "9px 14px", cursor: "pointer", transition: "all 0.2s", fontSize: 13, fontWeight: 600, color: GOLD }}
      onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}28`; e.currentTarget.style.borderColor = `${GOLD}70`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`; e.currentTarget.style.borderColor = `${GOLD}40`; }}
    >
      <ExternalLink style={{ width: 13, height: 13 }} />
      {action.label}
    </button>
  );
}

function MessageBubble({ msg, onAction }: { msg: JarvisMessage; onAction: (url: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      {!isUser && (
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}33, ${GOLD}11)`, border: `1px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <Sparkles style={{ width: 15, height: 15, color: GOLD }} />
        </div>
      )}
      <div style={{ maxWidth: "78%" }}>
        <div style={{ background: isUser ? `${GOLD}18` : "rgba(255,255,255,0.04)", border: `1px solid ${isUser ? `${GOLD}33` : "rgba(255,255,255,0.08)"}`, borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: isUser ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {msg.content}
        </div>
        {msg.action && <ActionCard action={msg.action} onClick={() => onAction(msg.action!.url)} />}
      </div>
    </div>
  );
}

export default function Jarvis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { jarvisName, setJarvisName, wakeWordEnabled, setWakeWordEnabled, hasSpeechRecognition } = useJarvis();
  const plan = (user as any)?.plan || "free";
  const isFree = !["growth", "pro", "elite"].includes(plan);
  const firstName = (user as any)?.name?.split(" ")[0] || "";

  const { voiceOn, toggleVoice, speaking, listening, speak, stopSpeaking, startListening, stopListening, hasSR } = useVoice();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(jarvisName);

  const [messages, setMessages] = useState<JarvisMessage[]>([{
    role: "assistant",
    content: `Hey${firstName ? ` ${firstName}` : ""}! I'm ${jarvisName} — your personal AI inside Oravini. Think of me as your strategist, content coach, and hype person all rolled into one.\n\nI can take you anywhere on the platform, help you create content, analyze your competitors, build your strategy — literally anything.\n\nWhat do you want to work on today? 🚀`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Update greeting if name changes
  useEffect(() => {
    setMessages(prev => {
      const first = prev[0];
      if (first?.role === "assistant" && prev.length === 1) {
        return [{ ...first, content: `Hey${firstName ? ` ${firstName}` : ""}! I'm ${jarvisName} — your personal AI inside Oravini. Think of me as your strategist, content coach, and hype person all rolled into one.\n\nI can take you anywhere on the platform, help you create content, analyze competitors, build your strategy — literally anything.\n\nWhat do you want to work on? 🚀` }];
      }
      return prev;
    });
  }, [jarvisName]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveName = () => {
    setJarvisName(nameInput);
    setEditingName(false);
    toast({ title: `Name updated to "${nameInput.trim() || "Jarvis"}"`, description: `Just say "Hey ${nameInput.trim() || "Jarvis"}" to wake me up!` });
  };

  const handleAction = (url: string) => {
    // Handle pre-filled AI Ideas URLs
    navigate(url);
  };

  const send = async (msg?: string) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput("");
    stopSpeaking();
    const history = messages.slice(-12);
    const newMsg: JarvisMessage = { role: "user", content: text };
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);
    try {
      const data = await apiRequest("POST", "/api/jarvis/chat", {
        message: text,
        history: history.map(m => ({ role: m.role, content: m.content })),
        assistantName: jarvisName,
      });
      const assistantMsg: JarvisMessage = {
        role: "assistant",
        content: data.reply,
        action: data.action || undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (voiceOn) speak(data.reply);
    } catch (err: any) {
      if (err?.status === 402 || (typeof err?.message === "string" && err.message.includes("credit"))) {
        toast({ title: "Not enough credits", description: `Upgrade to Growth+ for unlimited ${jarvisName} access.`, variant: "destructive" });
        setMessages(prev => [...prev, { role: "assistant", content: `You're out of credits. Upgrade to Growth, Pro, or Elite for unlimited me — or grab a top-up on the Credits page.`, action: { url: "/credits", label: "Buy Credits" } }]);
      } else {
        toast({ title: `${jarvisName} hit a snag`, description: "Please try again.", variant: "destructive" });
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
    setMessages([{ role: "assistant", content: `Fresh start! What are we working on today?` }]);
    setInput("");
  };

  const handleMic = () => {
    if (listening) { stopListening(); return; }
    const ok = startListening(t => setInput(t));
    if (!ok) toast({ title: "Mic not supported", description: "Use Chrome or Edge for voice input.", variant: "destructive" });
  };

  const iconBtn = (active: boolean, goldStyle = false) => ({
    display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${active ? (goldStyle ? GOLD + "60" : "rgba(255,255,255,0.2)") : "rgba(255,255,255,0.08)"}`, background: active ? (goldStyle ? `${GOLD}18` : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.04)", color: active ? (goldStyle ? GOLD : "#fff") : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <ClientLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]" style={{ background: "#070707" }}>

        {/* Header */}
        <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#070707", flexShrink: 0 }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}28, ${GOLD}10)`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: speaking ? `0 0 20px ${GOLD}70` : "none", transition: "box-shadow 0.3s" }}>
                <Sparkles style={{ width: 18, height: 18, color: GOLD }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                        autoFocus
                        data-testid="input-jarvis-rename"
                        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}40`, borderRadius: 8, padding: "4px 10px", fontSize: 16, fontWeight: 800, color: "#fff", width: 160, height: 32 }}
                        className="focus-visible:ring-0"
                        maxLength={20}
                      />
                      <button onClick={saveName} data-testid="button-jarvis-savename" style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: GOLD, display: "flex" }}>
                        <Check style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>{jarvisName}</h1>
                      <button onClick={() => { setNameInput(jarvisName); setEditingName(true); }} title="Rename" data-testid="button-jarvis-rename"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: "2px 4px", display: "flex", borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                      >
                        <Pencil style={{ width: 12, height: 12 }} />
                      </button>
                    </>
                  )}
                  <Badge style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30`, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>AI</Badge>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: speaking ? GOLD : "#22c55e", boxShadow: `0 0 8px ${speaking ? GOLD : "#22c55e"}`, transition: "all 0.3s" }} />
                  {speaking && <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>speaking…</span>}
                  {wakeWordEnabled && !speaking && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Radio style={{ width: 10, height: 10, color: "#22c55e" }} /> listening for "Hey {jarvisName}"
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  Your full-stack Oravini assistant {editingName ? "· press Enter to save" : "· click ✏️ to rename"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {isFree ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 10px" }}>
                  <Zap style={{ width: 12, height: 12, color: GOLD }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>2 credits/msg</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${GOLD}10`, border: `1px solid ${GOLD}25`, borderRadius: 8, padding: "6px 10px" }}>
                  <Sparkles style={{ width: 12, height: 12, color: GOLD }} />
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>Unlimited</span>
                </div>
              )}

              {/* Wake word toggle */}
              {hasSpeechRecognition && (
                <button onClick={() => setWakeWordEnabled(!wakeWordEnabled)} data-testid="button-jarvis-wake"
                  style={iconBtn(wakeWordEnabled, true)}
                  title={wakeWordEnabled ? `Wake word active — say "Hey ${jarvisName}"` : "Enable wake word"}
                >
                  <Radio style={{ width: 12, height: 12 }} />
                  {wakeWordEnabled ? "Wake On" : "Wake Off"}
                </button>
              )}

              {/* TTS button */}
              {speaking ? (
                <button onClick={stopSpeaking} data-testid="button-jarvis-stop" style={{ ...iconBtn(true, true) }}>
                  <Square style={{ width: 11, height: 11 }} /> Stop
                </button>
              ) : (
                <button onClick={toggleVoice} data-testid="button-jarvis-voice" style={iconBtn(voiceOn)}>
                  {voiceOn ? <Volume2 style={{ width: 13, height: 13 }} /> : <VolumeX style={{ width: 13, height: 13 }} />}
                  {voiceOn ? "Voice On" : "Voice Off"}
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
          {messages.map((m, i) => <MessageBubble key={i} msg={m} onAction={handleAction} />)}
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

        {/* Input */}
        <div style={{ padding: "16px 28px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#070707", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: listening ? "rgba(212,180,97,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${listening ? `${GOLD}40` : "rgba(255,255,255,0.09)"}`, borderRadius: 14, padding: "8px 8px 8px 16px", transition: "all 0.2s" }}>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={listening ? "Listening… speak now" : `Ask ${jarvisName} anything…`}
              disabled={loading}
              data-testid="input-jarvis-message"
              style={{ background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: listening ? GOLD : "rgba(255,255,255,0.85)", minHeight: 36, maxHeight: 120, padding: 0, boxShadow: "none", flex: 1 }}
              className="placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              {hasSR && (
                <button onClick={handleMic} data-testid="button-jarvis-mic" title={listening ? "Stop" : "Speak"}
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
            {isFree ? "2 credits per message · Upgrade to Growth+ for unlimited access" : "Unlimited on your plan · Always verify important advice"}
            {(hasSR || hasSpeechRecognition) && " · 🎤 Voice supported"}
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
