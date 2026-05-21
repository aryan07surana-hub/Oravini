import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Captions, Mic, Globe, FileText, Loader2 } from "lucide-react";

const GOLD = "#d4b461";

interface Props {
  webinarId: string;
  isLive: boolean;
  elapsed: number;
  wsRef?: React.MutableRefObject<WebSocket | null>;
}

export function CaptionsPanel({ webinarId, isLive, elapsed, wsRef }: Props) {
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [language, setLanguage] = useState("en");
  const [liveCaptions, setLiveCaptions] = useState<{ text: string; time: number }[]>([]);
  const recognitionRef = useRef<any>(null);
  const captionsEndRef = useRef<HTMLDivElement>(null);

  const { data: transcript } = useQuery<any>({
    queryKey: [`/api/webinars/${webinarId}/transcript`],
    enabled: !isLive,
  });

  const addCaptionMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/webinars/${webinarId}/captions`, data),
  });

  const generateTranscriptMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/transcript/generate`),
  });

  // Web Speech API for live captions
  const startCaptions = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "en" ? "en-US" : language;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const isFinal = result.isFinal;

        if (isFinal && text.trim()) {
          const captionData = {
            text: text.trim(),
            speakerName: "Host",
            language,
            startTime: elapsed,
            isFinal: true,
          };
          addCaptionMut.mutate(captionData);
          setLiveCaptions(c => [...c.slice(-50), { text: text.trim(), time: elapsed }]);

          // Broadcast caption to all viewers via WebSocket
          if (wsRef?.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "wr_caption",
              webinarId,
              text: text.trim(),
              language,
              startTime: elapsed,
            }));
          }
        }
      }
    };

    recognition.onerror = () => {
      // Restart on error
      setTimeout(() => {
        if (captionsEnabled) recognition.start();
      }, 1000);
    };

    recognition.onend = () => {
      if (captionsEnabled) recognition.start();
    };

    recognition.start();
    recognitionRef.current = recognition;
    setCaptionsEnabled(true);
  }, [language, elapsed, captionsEnabled, addCaptionMut]);

  const stopCaptions = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setCaptionsEnabled(false);
  }, []);

  useEffect(() => { captionsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [liveCaptions]);

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const hasSpeechApi = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="p-3 flex-shrink-0 space-y-2" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>Live Captions</p>
          {isLive && (
            captionsEnabled ? (
              <Button size="sm" onClick={stopCaptions} className="h-6 text-[10px] gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
                <Mic className="w-3 h-3" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startCaptions} disabled={!hasSpeechApi}
                className="h-6 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
                <Mic className="w-3 h-3" /> Enable
              </Button>
            )
          )}
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-3 h-3 text-zinc-500" />
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded text-[10px] text-white px-2 py-1 flex-1">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="pt">Portuguese</option>
            <option value="hi">Hindi</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
          </select>
        </div>

        {captionsEnabled && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-bold">Captions active — streaming to viewers</span>
          </div>
        )}

        {!hasSpeechApi && (
          <p className="text-[10px] text-amber-400 leading-relaxed">
            ⚠️ Browser doesn't support Speech Recognition. Use Chrome or Edge for live captions.
          </p>
        )}
      </div>

      {/* Live Caption Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLive ? (
          liveCaptions.length === 0 ? (
            <div className="text-center py-8">
              <Captions className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs text-zinc-600">{captionsEnabled ? "Listening..." : "Enable captions to start"}</p>
              <p className="text-[10px] text-zinc-700 mt-1">Live speech will be transcribed and sent to viewers</p>
            </div>
          ) : (
            liveCaptions.map((c, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[9px] text-zinc-600 flex-shrink-0 mt-0.5 font-mono w-10">
                  {Math.floor(c.time / 60)}:{String(c.time % 60).padStart(2, "0")}
                </span>
                <p className="text-xs text-white leading-relaxed">{c.text}</p>
              </div>
            ))
          )
        ) : (
          // Post-event: show transcript
          transcript ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-xs font-bold text-white">Full Transcript</p>
              </div>
              {(transcript.segments || []).map((seg: any, i: number) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[9px] text-zinc-600 flex-shrink-0 mt-0.5 font-mono w-10">
                    {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, "0")}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold" style={{ color: GOLD }}>{seg.speaker}</span>
                    <p className="text-xs text-white leading-relaxed">{seg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs text-zinc-600">No transcript available</p>
              <Button size="sm" onClick={() => generateTranscriptMut.mutate()}
                disabled={generateTranscriptMut.isPending}
                className="mt-3 h-7 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
                {generateTranscriptMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                Generate from Captions
              </Button>
            </div>
          )
        )}
        <div ref={captionsEndRef} />
      </div>
    </div>
  );
}
