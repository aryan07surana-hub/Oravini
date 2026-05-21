import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Users, Play, Square, Clock } from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

interface Props {
  webinarId: string;
}

export function BackstagePanel({ webinarId }: Props) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/backstage/messages`],
    refetchInterval: 3000,
  });

  const { data: practiceSession } = useQuery<any>({
    queryKey: [`/api/webinars/${webinarId}/practice`],
    refetchInterval: 5000,
  });

  const sendMsg = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/backstage/messages`, { message: msg }),
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/backstage/messages`] }); },
  });

  const startPractice = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/practice/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/practice`] }),
  });

  const endPractice = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/practice/end`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/practice`] }),
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Practice Session Header */}
      <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>Green Room</p>
          {practiceSession ? (
            <Button size="sm" onClick={() => endPractice.mutate()} className="h-6 text-[10px] gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
              <Square className="w-3 h-3" /> End Practice
            </Button>
          ) : (
            <Button size="sm" onClick={() => startPractice.mutate()} className="h-6 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
              <Play className="w-3 h-3" /> Start Practice
            </Button>
          )}
        </div>
        {practiceSession && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-bold">Practice session active</span>
            <Clock className="w-3 h-3 text-green-400 ml-auto" />
          </div>
        )}
        <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed">
          Private space for hosts & panelists. Attendees cannot see this area.
        </p>
      </div>

      {/* Backstage Chat */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">Backstage chat is empty</p>
            <p className="text-[10px] text-zinc-700 mt-1">Messages here are only visible to hosts & panelists</p>
          </div>
        ) : (
          messages.map((m: any, i: number) => (
            <div key={m.id || i} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold" style={{ color: m.senderRole === "host" ? GOLD : "#60a5fa" }}>
                  {m.senderName}
                </span>
                <span className="text-[9px] text-zinc-700">{m.createdAt ? format(new Date(m.createdAt), "h:mm a") : ""}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl max-w-[92%] text-xs leading-relaxed" style={{ background: `${GOLD}10` }}>
                {m.message}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 flex gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}12` }}>
        <Input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMsg.mutate(); }}
          placeholder="Message backstage team…"
          className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 flex-1"
        />
        <Button size="sm" onClick={() => sendMsg.mutate()} disabled={!msg.trim()} className="h-8 px-2.5" style={{ background: GOLD, color: "#000" }}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
