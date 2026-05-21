import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Play, Square, Shuffle, DoorOpen } from "lucide-react";

const GOLD = "#d4b461";

interface Props {
  webinarId: string;
  attendees: { id: string; name: string }[];
}

export function BreakoutRoomsPanel({ webinarId, attendees }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/breakout-rooms`],
    refetchInterval: 5000,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/webinars/${webinarId}/breakout-rooms`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/breakout-rooms`] });
      setNewRoomName("");
      setNewRoomTopic("");
      toast({ title: "Room created!" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webinars/${webinarId}/breakout-rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/breakout-rooms`] }),
  });

  const openAllMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/breakout-rooms/open-all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/breakout-rooms`] });
      toast({ title: "All rooms opened!" });
    },
  });

  const closeAllMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/breakout-rooms/close-all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/breakout-rooms`] });
      toast({ title: "All rooms closed — attendees returned to main session" });
    },
  });

  const autoAssignMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/breakout-rooms/auto-assign`, {
      viewerIds: attendees.map(a => ({ viewerId: a.id, viewerName: a.name })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/breakout-rooms`] });
      toast({ title: "Attendees auto-assigned!" });
    },
  });

  const anyOpen = rooms.some((r: any) => r.isOpen);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>
            Breakout Rooms ({rooms.length})
          </p>
          {rooms.length > 0 && (
            anyOpen ? (
              <Button size="sm" onClick={() => closeAllMut.mutate()} className="h-6 text-[10px] gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
                <Square className="w-3 h-3" /> Close All
              </Button>
            ) : (
              <Button size="sm" onClick={() => openAllMut.mutate()} className="h-6 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
                <Play className="w-3 h-3" /> Open All
              </Button>
            )
          )}
        </div>

        {/* Quick actions */}
        {rooms.length > 0 && !anyOpen && attendees.length > 0 && (
          <Button size="sm" onClick={() => autoAssignMut.mutate()}
            className="w-full h-7 text-[10px] gap-1.5 font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-0 mb-2">
            <Shuffle className="w-3 h-3" /> Auto-Assign {attendees.length} Attendees
          </Button>
        )}

        {/* Create Room */}
        <div className="flex gap-1.5">
          <Input
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="bg-zinc-800 border-zinc-700 text-white text-xs h-7 flex-1"
          />
          <Button size="sm" onClick={() => createMut.mutate({ name: newRoomName, topic: newRoomTopic || null })}
            disabled={!newRoomName.trim()} className="h-7 px-2 border-0" style={{ background: GOLD, color: "#000" }}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <DoorOpen className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">No breakout rooms</p>
            <p className="text-[10px] text-zinc-700 mt-1">Create rooms to split attendees into smaller groups</p>
          </div>
        ) : (
          rooms.map((room: any) => (
            <div key={room.id} className="rounded-xl p-2.5 transition-all" style={{
              background: room.isOpen ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${room.isOpen ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{
                    background: room.isOpen ? "rgba(52,211,153,0.15)" : `${GOLD}12`,
                  }}>
                    <DoorOpen className="w-3 h-3" style={{ color: room.isOpen ? "#34d399" : GOLD }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{room.name}</p>
                    {room.topic && <p className="text-[10px] text-zinc-500">{room.topic}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {room.isOpen && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Open
                    </span>
                  )}
                  <button onClick={() => deleteMut.mutate(room.id)} className="p-1 text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Users className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-500">
                  {room.maxParticipants ? `Max ${room.maxParticipants}` : "Unlimited"} · {room.assignmentType}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
