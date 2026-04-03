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

// Parse [GO /path "Label"] action tags from AI reply
export function parseReply(raw: string): { text: string; action?: JarvisAction } {
  const match = raw.match(/\[GO\s+(\S+)\s+"([^"]+)"\]/);
  if (!match) return { text: raw.trim() };
  return {
    text: raw.replace(match[0], "").trim(),
    action: { url: match[1], label: match[2] },
  };
}

interface JarvisContextType {
  jarvisName: string;
  setJarvisName: (name: string) => void;
  bubbleOpen: boolean;
  setBubbleOpen: (open: boolean) => void;
  wakeWordEnabled: boolean;
  setWakeWordEnabled: (enabled: boolean) => void;
  pendingWakeMessage: string;
  clearPendingWakeMessage: () => void;
  hasSpeechRecognition: boolean;
}

const JarvisContext = createContext<JarvisContextType>({
  jarvisName: "Jarvis",
  setJarvisName: () => {},
  bubbleOpen: false,
  setBubbleOpen: () => {},
  wakeWordEnabled: false,
  setWakeWordEnabled: () => {},
  pendingWakeMessage: "",
  clearPendingWakeMessage: () => {},
  hasSpeechRecognition: false,
});

export function useJarvis() {
  return useContext(JarvisContext);
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [jarvisName, setJarvisNameState] = useState(() =>
    localStorage.getItem("jarvis_name") || "Jarvis"
  );
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabledState] = useState(() =>
    localStorage.getItem("jarvis_wake") === "true"
  );
  const [pendingWakeMessage, setPendingWakeMessage] = useState("");

  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(wakeWordEnabled);
  const nameRef = useRef(jarvisName);

  useEffect(() => { nameRef.current = jarvisName; }, [jarvisName]);
  useEffect(() => { enabledRef.current = wakeWordEnabled; }, [wakeWordEnabled]);

  const hasSpeechRecognition = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const setJarvisName = useCallback((name: string) => {
    const clean = name.trim() || "Jarvis";
    setJarvisNameState(clean);
    localStorage.setItem("jarvis_name", clean);
  }, []);

  const stopWake = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const startWake = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !enabledRef.current || recognitionRef.current) return;

    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = false;

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          const transcript = e.results[i][0].transcript.trim().toLowerCase();
          const n = nameRef.current.toLowerCase();
          const patterns = [`hey ${n}`, `hi ${n}`, `ok ${n}`, `okay ${n}`, `yo ${n}`, `${n},`];
          for (const pat of patterns) {
            if (transcript.includes(pat)) {
              const afterIdx = transcript.indexOf(pat) + pat.length;
              const command = transcript.slice(afterIdx).replace(/^[,\s]+/, "").trim();
              setBubbleOpen(true);
              if (command) setPendingWakeMessage(command);
              break;
            }
          }
        }
      };

      rec.onend = () => {
        recognitionRef.current = null;
        if (enabledRef.current) setTimeout(startWake, 800);
      };

      rec.onerror = (e: any) => {
        recognitionRef.current = null;
        if (e.error === "not-allowed") {
          setWakeWordEnabledState(false);
          enabledRef.current = false;
          localStorage.setItem("jarvis_wake", "false");
        } else {
          if (enabledRef.current) setTimeout(startWake, 2000);
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch {}
  }, []);

  const setWakeWordEnabled = useCallback((enabled: boolean) => {
    setWakeWordEnabledState(enabled);
    enabledRef.current = enabled;
    localStorage.setItem("jarvis_wake", String(enabled));
    if (!enabled) stopWake();
    else startWake();
  }, [startWake, stopWake]);

  useEffect(() => {
    if (wakeWordEnabled) startWake();
    return () => stopWake();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <JarvisContext.Provider value={{
      jarvisName, setJarvisName,
      bubbleOpen, setBubbleOpen,
      wakeWordEnabled, setWakeWordEnabled,
      pendingWakeMessage, clearPendingWakeMessage: () => setPendingWakeMessage(""),
      hasSpeechRecognition,
    }}>
      {children}
    </JarvisContext.Provider>
  );
}
