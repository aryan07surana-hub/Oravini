import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Check, Clock, Send, Loader2, ToggleLeft, ToggleRight, Wand2 } from "lucide-react";

const GOLD = "#d4b461";

const EMAIL_TYPES = [
  { id: "confirmation", label: "Confirmation", icon: "✅", desc: "Sent immediately on registration" },
  { id: "reminder_24h", label: "24h Reminder", icon: "⏰", desc: "Sent 24 hours before" },
  { id: "reminder_1h", label: "1h Reminder", icon: "🔴", desc: "Sent 1 hour before" },
  { id: "reminder_15m", label: "15m Reminder", icon: "🚨", desc: "Sent 15 minutes before" },
  { id: "followup", label: "Follow-up", icon: "🙏", desc: "Sent after webinar ends" },
  { id: "replay", label: "Replay", icon: "🎬", desc: "Sent when replay is available" },
];

interface Props {
  webinarId: string;
}

export function EmailAutomationPanel({ webinarId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const { data: emails = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/emails`],
  });

  const initDefaultsMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/emails/init-defaults`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/emails`] });
      toast({ title: "Default email templates created!" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/webinars/${webinarId}/emails/${id}`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/emails`] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, subject, bodyHtml }: { id: string; subject: string; bodyHtml: string }) =>
      apiRequest("PATCH", `/api/webinars/${webinarId}/emails/${id}`, { subject, bodyHtml }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/emails`] });
      setEditingId(null);
      toast({ title: "Email updated!" });
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/webinars/${webinarId}/emails/${id}/test`),
    onSuccess: () => toast({ title: "Test email sent to your inbox!" }),
    onError: () => toast({ title: "Configure SMTP to send emails", variant: "destructive" }),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/webinars/${webinarId}/emails/${id}/send`),
    onSuccess: (data: any) => toast({ title: `Sent to ${data?.sent || 0} registrants!` }),
  });

  const startEdit = (email: any) => {
    setEditingId(email.id);
    setEditSubject(email.subject);
    setEditBody(email.bodyHtml);
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>Email Automation</p>
          {emails.length === 0 && (
            <Button size="sm" onClick={() => initDefaultsMut.mutate()} disabled={initDefaultsMut.isPending}
              className="h-6 text-[10px] gap-1 border-0" style={{ background: `${GOLD}20`, color: GOLD }}>
              <Wand2 className="w-3 h-3" /> Init Defaults
            </Button>
          )}
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Automated emails for registration confirmations, reminders, and follow-ups.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {emails.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">No emails configured</p>
            <p className="text-[10px] text-zinc-700 mt-1">Click "Init Defaults" to set up all email templates</p>
          </div>
        ) : (
          EMAIL_TYPES.map(emailType => {
            const email = emails.find((e: any) => e.type === emailType.id);
            if (!email) return null;

            if (editingId === email.id) {
              return (
                <div key={email.id} className="rounded-xl p-3 space-y-2" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
                  <p className="text-xs font-bold text-white">{emailType.icon} {emailType.label}</p>
                  <Input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                    placeholder="Subject line" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
                  <Textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white text-xs min-h-[100px] resize-none" />
                  <p className="text-[9px] text-zinc-600">Variables: {"{{name}}"} {"{{webinarTitle}}"} {"{{date}}"} {"{{time}}"} {"{{watchUrl}}"} {"{{replayUrl}}"}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => updateMut.mutate({ id: email.id, subject: editSubject, bodyHtml: editBody })}
                      className="h-6 text-[10px] font-bold border-0" style={{ background: GOLD, color: "#000" }}>Save</Button>
                    <Button size="sm" onClick={() => setEditingId(null)} className="h-6 text-[10px] bg-zinc-700 text-zinc-300 border-0">Cancel</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={email.id} className="rounded-xl p-2.5 transition-all" style={{
                background: email.enabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                border: `1px solid ${email.enabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)"}`,
                opacity: email.enabled ? 1 : 0.6,
              }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{emailType.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{emailType.label}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{email.subject}</p>
                  </div>
                  <button onClick={() => toggleMut.mutate({ id: email.id, enabled: !email.enabled })} className="flex-shrink-0">
                    {email.enabled ? (
                      <ToggleRight className="w-5 h-5 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-zinc-600" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => startEdit(email)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    Edit
                  </button>
                  <button onClick={() => testMut.mutate(email.id)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5">
                    <Send className="w-2.5 h-2.5" /> Test
                  </button>
                  <button onClick={() => sendMut.mutate(email.id)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5"
                    style={{ background: `${GOLD}15` }}>
                    <Mail className="w-2.5 h-2.5" /> Send All
                  </button>
                  {email.sentCount > 0 && (
                    <span className="ml-auto text-[9px] text-zinc-500 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> {email.sentCount} sent
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
