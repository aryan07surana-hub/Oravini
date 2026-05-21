import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus, Trash2, Shield, ShieldCheck, Video, Monitor,
  MessageSquare, Copy, Check, Crown, Users,
} from "lucide-react";

const GOLD = "#d4b461";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  host: { label: "Host", color: "#d4b461", icon: Crown },
  co_host: { label: "Co-Host", color: "#34d399", icon: ShieldCheck },
  panelist: { label: "Panelist", color: "#60a5fa", icon: Shield },
  attendee: { label: "Attendee", color: "#a1a1aa", icon: Users },
};

interface Props {
  webinarId: string;
}

export function PanelistsPanel({ webinarId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"co_host" | "panelist">("panelist");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: panelists = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/panelists`],
  });

  const inviteMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/webinars/${webinarId}/panelists`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/panelists`] });
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
      toast({ title: "Panelist invited!" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webinars/${webinarId}/panelists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/panelists`] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/webinars/${webinarId}/panelists/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/panelists`] }),
  });

  const copyInviteLink = (token: string, id: string) => {
    const link = `${window.location.origin}/webinar-invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>
          Panelists ({panelists.length})
        </p>
        <Button size="sm" onClick={() => setShowInvite(!showInvite)} className="h-6 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
          <UserPlus className="w-3 h-3" /> Invite
        </Button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="p-3 space-y-2 flex-shrink-0" style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${GOLD}12` }}>
          <Input
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            placeholder="Name"
            className="bg-zinc-800 border-zinc-700 text-white text-xs h-7"
          />
          <Input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="Email"
            className="bg-zinc-800 border-zinc-700 text-white text-xs h-7"
          />
          <div className="flex gap-1.5">
            {(["co_host", "panelist"] as const).map(role => (
              <button key={role} onClick={() => setInviteRole(role)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: inviteRole === role ? `${ROLE_LABELS[role].color}20` : "rgba(255,255,255,0.04)",
                  color: inviteRole === role ? ROLE_LABELS[role].color : "rgba(255,255,255,0.4)",
                  border: `1px solid ${inviteRole === role ? ROLE_LABELS[role].color + "50" : "rgba(255,255,255,0.08)"}`,
                }}>
                {ROLE_LABELS[role].label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => inviteMut.mutate({ email: inviteEmail, name: inviteName, role: inviteRole })}
            disabled={!inviteEmail.trim() || !inviteName.trim()} className="w-full h-7 text-xs font-bold" style={{ background: GOLD, color: "#000" }}>
            Send Invite
          </Button>
        </div>
      )}

      {/* Panelist List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {panelists.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">No panelists yet</p>
            <p className="text-[10px] text-zinc-700 mt-1">Invite co-hosts and panelists to present with you</p>
          </div>
        ) : (
          panelists.map((p: any) => {
            const roleInfo = ROLE_LABELS[p.role] || ROLE_LABELS.panelist;
            const Icon = roleInfo.icon;
            return (
              <div key={p.id} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: `hsl(${p.name.charCodeAt(0) * 7 % 360}, 45%, 35%)` }}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ color: roleInfo.color, background: `${roleInfo.color}15` }}>
                      <Icon className="w-2.5 h-2.5" /> {roleInfo.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  {/* Status badge */}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    p.status === "joined" ? "bg-green-400/15 text-green-400" :
                    p.status === "accepted" ? "bg-blue-400/15 text-blue-400" :
                    "bg-zinc-700/50 text-zinc-400"
                  }`}>
                    {p.status === "joined" ? "● Live" : p.status === "accepted" ? "✓ Accepted" : "⏳ Pending"}
                  </span>

                  {/* Permissions toggles */}
                  <button onClick={() => updateMut.mutate({ id: p.id, data: { canShareScreen: !p.canShareScreen } })}
                    className={`p-1 rounded ${p.canShareScreen ? "text-green-400" : "text-zinc-600"}`} title="Screen share">
                    <Monitor className="w-3 h-3" />
                  </button>
                  <button onClick={() => updateMut.mutate({ id: p.id, data: { canChat: !p.canChat } })}
                    className={`p-1 rounded ${p.canChat ? "text-green-400" : "text-zinc-600"}`} title="Chat">
                    <MessageSquare className="w-3 h-3" />
                  </button>

                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => copyInviteLink(p.inviteToken, p.id)} className="p-1 text-zinc-500 hover:text-white" title="Copy invite link">
                      {copiedId === p.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button onClick={() => deleteMut.mutate(p.id)} className="p-1 text-zinc-600 hover:text-red-400" title="Remove">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
