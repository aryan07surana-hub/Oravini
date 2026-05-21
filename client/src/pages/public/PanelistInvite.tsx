import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, ShieldCheck, Shield, CheckCircle, X } from "lucide-react";

const GOLD = "#d4b461";

const ROLE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  host: { label: "Host", icon: Crown, color: "#d4b461" },
  co_host: { label: "Co-Host", icon: ShieldCheck, color: "#34d399" },
  panelist: { label: "Panelist", icon: Shield, color: "#60a5fa" },
};

export default function PanelistInvite() {
  const params = useParams<{ token: string }>();
  const [, nav] = useLocation();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!params?.token) return;
    fetch(`/api/webinar-invite/${params.token}`)
      .then(r => r.json())
      .then(data => { setInvite(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params?.token]);

  const accept = async () => {
    setAccepting(true);
    try {
      // 1. Mark invitation as accepted
      const r = await fetch(`/api/webinar-invite/${params?.token}/accept`, { method: "POST" });
      if (!r.ok) throw new Error("Accept failed");

      // 2. Fetch a LiveKit panelist token (lets them publish video/audio)
      const tokenRes = await fetch(`/api/webinars/${invite.webinarId}/livekit/panelist-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: params?.token }),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        // Store token in sessionStorage so the panelist studio can use it
        sessionStorage.setItem(`panelist-token-${invite.webinarId}`, JSON.stringify({
          token: tokenData.token,
          url: tokenData.url,
          room: tokenData.room,
          role: tokenData.role,
          panelistId: invite.id,
          panelistName: invite.name,
          permissions: tokenData.permissions,
        }));
      }

      setAccepted(true);
      // Redirect to panelist view
      setTimeout(() => {
        nav(`/webinar-panelist/${invite.webinarId}?token=${encodeURIComponent(params?.token || "")}`);
      }, 1500);
    } catch (err: any) {
      console.error(err);
    }
    setAccepting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#040406" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (!invite || invite.message) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#040406" }}>
        <div className="text-center px-6 max-w-sm">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-zinc-800">
            <X className="w-7 h-7 text-zinc-500" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Invalid Invite</h2>
          <p className="text-sm text-zinc-400">This invitation link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_INFO[invite.role] || ROLE_INFO.panelist;
  const Icon = roleInfo.icon;

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#040406" }}>
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${GOLD}20` }}>
            <CheckCircle className="w-7 h-7" style={{ color: GOLD }} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">You're In!</h2>
          <p className="text-sm text-zinc-400 mb-6">Redirecting to the green room…</p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: GOLD }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#040406" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${GOLD}07 0%, transparent 65%)` }} />
      <div className="relative w-full max-w-md rounded-3xl p-8 text-center" style={{ background: "#0c0c10", border: `1px solid ${GOLD}25` }}>
        <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: `${roleInfo.color}15`, border: `1px solid ${roleInfo.color}40` }}>
          <Icon className="w-9 h-9" style={{ color: roleInfo.color }} />
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: roleInfo.color }}>
          {roleInfo.label} Invitation
        </p>
        <h1 className="text-2xl font-black text-white mb-2 leading-tight">You're Invited!</h1>
        <p className="text-sm text-zinc-400 mb-1">
          You've been invited to join <span className="font-bold text-white">{invite.name}</span> as a {roleInfo.label.toLowerCase()}.
        </p>
        {invite.email && <p className="text-xs text-zinc-500 mb-6">{invite.email}</p>}

        <div className="text-left space-y-2 mb-6 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your permissions:</p>
          {invite.canShareScreen && <p className="text-xs text-zinc-300 flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400" /> Share your screen</p>}
          {invite.canChat && <p className="text-xs text-zinc-300 flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400" /> Send chat messages</p>}
          {invite.canManagePolls && <p className="text-xs text-zinc-300 flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400" /> Manage polls</p>}
          {invite.canMuteOthers && <p className="text-xs text-zinc-300 flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400" /> Mute attendees</p>}
          {invite.canRemoveAttendees && <p className="text-xs text-zinc-300 flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400" /> Remove attendees</p>}
        </div>

        <Button onClick={accept} disabled={accepting || invite.status === "accepted"}
          className="w-full h-11 font-black text-sm" style={{ background: GOLD, color: "#000" }}>
          {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> :
            invite.status === "accepted" ? "Already Accepted" : "Accept & Join"}
        </Button>

        <p className="text-[10px] text-zinc-600 mt-4">
          By accepting, you agree to participate as a {roleInfo.label.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}
