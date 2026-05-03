import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Info, Instagram, CheckCircle2, WifiOff, Link } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SendDM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedReply, setSelectedReply] = useState("");
  const [sent, setSent] = useState(false);

  const activeClientId = user?.id || "";

  const { data: account } = useQuery<any>({
    queryKey: ["/api/meta/account"],
    staleTime: 30000,
  });

  const { data: replies = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/quick-replies", activeClientId],
    queryFn: () => fetch(`/api/dm/quick-replies${activeClientId ? `?clientId=${activeClientId}` : ""}`).then(r => r.json()),
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/instagram/send-dm", data),
    onSuccess: () => {
      toast({ title: "DM sent!", description: "Your message was delivered." });
      setSent(true);
      setMessage("");
      setRecipientId("");
      setSelectedReply("");
      setTimeout(() => setSent(false), 4000);
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const applyTemplate = (replyId: string) => {
    const r = replies.find((r: any) => r.id === replyId);
    if (r) setMessage(r.content);
    setSelectedReply(replyId);
  };

  const isConnected = account?.connected;

  return (
    <ClientLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Send a DM</h1>
            <p className="text-xs text-muted-foreground">Send an Instagram Direct Message to any lead</p>
          </div>
        </div>

        {/* Connection status */}
        {account && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${isConnected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {isConnected ? (
              <>
                <Instagram className="w-4 h-4 flex-shrink-0" />
                <span>Connected as <strong>@{account.igUsername}</strong></span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>Instagram not connected — </span>
                <a href="/dm-tracker" className="underline underline-offset-2 font-semibold">Connect in DM Tracker → Instagram tab</a>
              </>
            )}
          </div>
        )}

        <Card className="border-card-border">
          <CardContent className="p-6 space-y-5">

            <div>
              <Label className="text-xs text-muted-foreground">Recipient Instagram User ID *</Label>
              <Input
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                placeholder="e.g. 17841400000000000"
                className="mt-1.5 font-mono text-sm"
                data-testid="input-dm-recipient-id"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                The numeric Instagram user ID — not the @handle. Find it via the Meta Graph API Explorer or any profile lookup tool.
              </p>
            </div>

            {replies.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Quick Reply Template</Label>
                <Select value={selectedReply} onValueChange={applyTemplate}>
                  <SelectTrigger className="mt-1.5 text-xs" data-testid="select-quick-reply">
                    <SelectValue placeholder="Choose a template to prefill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {replies.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Message *</Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={6}
                className="mt-1.5 resize-none"
                data-testid="input-dm-message"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{message.length} / 1000 characters</p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Instagram only allows DMs to users who have messaged your business within the last 24 hours. This is an Instagram policy and cannot be bypassed.
              </p>
            </div>

            <Button
              onClick={() => sendMutation.mutate({ recipientId, message })}
              disabled={!recipientId.trim() || !message.trim() || sendMutation.isPending || sent}
              className="w-full gap-2"
              data-testid="button-send-dm"
            >
              {sent ? (
                <><CheckCircle2 className="w-4 h-4" /> Sent!</>
              ) : sendMutation.isPending ? (
                "Sending..."
              ) : (
                <><Send className="w-4 h-4" /> Send DM</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
