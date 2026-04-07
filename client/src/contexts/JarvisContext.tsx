import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

export interface JarvisAction {
  url: string;
  label: string;
}

export interface JarvisMessage {
  role: "user" | "assistant";
  content: string;
  action?: JarvisAction;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  command: string;
  response: string;
  action?: string;
}

export interface PendingInject {
  testId: string;
  content: string;
}

const HISTORY_KEY = "jarvis_history";
const HISTORY_LIMIT = 50;

export function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

export function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}

interface JarvisContextType {
  jarvisName: string;
  setJarvisName: (name: string) => void;
  isNamed: boolean;
  bubbleOpen: boolean;
  setBubbleOpen: (open: boolean) => void;
  wakeWordEnabled: boolean;
  setWakeWordEnabled: (enabled: boolean) => void;
  pendingWakeMessage: string;
  clearPendingWakeMessage: () => void;
  hasSpeechRecognition: boolean;
  history: HistoryEntry[];
  addToHistory: (entry: Omit<HistoryEntry, "id" | "ts">) => void;
  clearHistory: () => void;
  isSpeaking: boolean;
  setIsSpeaking: (v: boolean) => void;
  // Session mode
  sessionActive: boolean;
  startSession: () => void;
  stopSession: () => void;
  // Text injection
  pendingInject: PendingInject | null;
  setPendingInject: (v: PendingInject | null) => void;
}

const JarvisContext = createContext<JarvisContextType>({
  jarvisName: "",
  setJarvisName: () => {},
  isNamed: false,
  bubbleOpen: false,
  setBubbleOpen: () => {},
  wakeWordEnabled: false,
  setWakeWordEnabled: () => {},
  pendingWakeMessage: "",
  clearPendingWakeMessage: () => {},
  hasSpeechRecognition: false,
  history: [],
  addToHistory: () => {},
  clearHistory: () => {},
  isSpeaking: false,
  setIsSpeaking: () => {},
  sessionActive: false,
  startSession: () => {},
  stopSession: () => {},
  pendingInject: null,
  setPendingInject: () => {},
});

export function useJarvis() { return useContext(JarvisContext); }

const MOTIVATIONAL_QUOTES = [
  "The best time to start was yesterday. The second best time is right now.",
  "Consistency beats talent every single time.",
  "Your content is the voice of your brand — make it worth hearing.",
  "Done is infinitely better than perfect.",
  "Small daily improvements are the key to long-term results.",
  "Content is the engine. Strategy is the fuel.",
  "Build the brand today that you'll be proud of tomorrow.",
  "You don't need more followers. You need more impact.",
  "Every piece of content is a chance to change someone's day.",
  "The creators who win are the ones who show up consistently.",
];

export function getDailyQuote() {
  const day = new Date().getDay();
  return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [jarvisName, setJarvisNameState] = useState(() => localStorage.getItem("jarvis_name") || "");
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabledState] = useState(() => {
    const saved = localStorage.getItem("jarvis_wake");
    if (saved !== null) return saved === "true";
    return !!localStorage.getItem("jarvis_name");
  });
  const [pendingWakeMessage, setPendingWakeMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionActive, setSessionActiveState] = useState(() => localStorage.getItem("jarvis_session") === "true");
  const [pendingInject, setPendingInject] = useState<PendingInject | null>(null);

  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(wakeWordEnabled);
  const nameRef = useRef(jarvisName);
  // followUpUntilRef: epoch ms until which ANY speech is treated as a command (no wake word needed)
  const followUpUntilRef = useRef<number>(
    localStorage.getItem("jarvis_session") === "true" ? Date.now() + 86400000 : 0
  );
  const sessionActiveRef = useRef(sessionActive);

  useEffect(() => { nameRef.current = jarvisName; }, [jarvisName]);
  useEffect(() => { enabledRef.current = wakeWordEnabled; }, [wakeWordEnabled]);
  useEffect(() => { sessionActiveRef.current = sessionActive; }, [sessionActive]);

  const hasSpeechRecognition = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const setJarvisName = useCallback((name: string) => {
    const clean = name.trim();
    setJarvisNameState(clean);
    localStorage.setItem("jarvis_name", clean);
    if (clean && !localStorage.getItem("jarvis_wake")) {
      setWakeWordEnabledState(true);
      enabledRef.current = true;
      localStorage.setItem("jarvis_wake", "true");
    }
  }, []);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, "id" | "ts">) => {
    const full: HistoryEntry = { ...entry, id: Math.random().toString(36).slice(2), ts: Date.now() };
    setHistory(prev => {
      const next = [full, ...prev].slice(0, HISTORY_LIMIT);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const stopWake = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const startWake = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !enabledRef.current || recognitionRef.current || !nameRef.current) return;
    try {
      const rec = new SR();
      rec.lang = "en-US"; rec.continuous = true; rec.interimResults = false;
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          const t = e.results[i][0].transcript.trim().toLowerCase();
          const n = nameRef.current.toLowerCase();
          // Follow-up / session mode: any speech is a command
          if (followUpUntilRef.current > Date.now()) {
            if (t.length >= 3) {
              setBubbleOpen(true);
              setPendingWakeMessage(t);
            }
            return;
          }
          // Normal wake word mode
          for (const pat of [`hey ${n}`, `hi ${n}`, `ok ${n}`, `yo ${n}`, `${n},`, n]) {
            if (t.includes(pat)) {
              const cmd = t.slice(t.indexOf(pat) + pat.length).replace(/^[,\s]+/, "").trim();
              setBubbleOpen(true);
              if (cmd) setPendingWakeMessage(cmd);
              break;
            }
          }
        }
      };
      rec.onend = () => { recognitionRef.current = null; if (enabledRef.current) setTimeout(startWake, 800); };
      rec.onerror = (e: any) => {
        recognitionRef.current = null;
        if (e.error === "not-allowed") { setWakeWordEnabledState(false); enabledRef.current = false; localStorage.setItem("jarvis_wake", "false"); }
        else if (enabledRef.current) setTimeout(startWake, 2000);
      };
      rec.start();
      recognitionRef.current = rec;
    } catch {}
  }, []);

  const setWakeWordEnabled = useCallback((enabled: boolean) => {
    setWakeWordEnabledState(enabled);
    enabledRef.current = enabled;
    localStorage.setItem("jarvis_wake", String(enabled));
    if (!enabled) stopWake(); else startWake();
  }, [startWake, stopWake]);

  const startSession = useCallback(() => {
    setSessionActiveState(true);
    localStorage.setItem("jarvis_session", "true");
    // Open follow-up window for 24h — mic always on during session
    followUpUntilRef.current = Date.now() + 86400000;
    // Ensure wake word listener is running
    if (!enabledRef.current) {
      setWakeWordEnabledState(true);
      enabledRef.current = true;
      localStorage.setItem("jarvis_wake", "true");
      startWake();
    }
  }, [startWake]);

  const stopSession = useCallback(() => {
    setSessionActiveState(false);
    localStorage.setItem("jarvis_session", "false");
    // Reset follow-up window
    followUpUntilRef.current = 0;
  }, []);

  useEffect(() => { if (wakeWordEnabled && jarvisName) startWake(); return () => stopWake(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When AI finishes speaking, extend follow-up window
  const prevSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    const wasOn = prevSpeakingRef.current;
    prevSpeakingRef.current = isSpeaking;
    if (wasOn && !isSpeaking) {
      // Session mode: keep open 24h; normal: 15s
      const duration = sessionActiveRef.current ? 86400000 : 15000;
      followUpUntilRef.current = Date.now() + duration;
    }
  }, [isSpeaking]);

  return (
    <JarvisContext.Provider value={{
      jarvisName, setJarvisName, isNamed: !!jarvisName,
      bubbleOpen, setBubbleOpen,
      wakeWordEnabled, setWakeWordEnabled,
      pendingWakeMessage, clearPendingWakeMessage: () => setPendingWakeMessage(""),
      hasSpeechRecognition, history, addToHistory, clearHistory,
      isSpeaking, setIsSpeaking,
      sessionActive, startSession, stopSession,
      pendingInject, setPendingInject,
    }}>
      {children}
    </JarvisContext.Provider>
  );
}
