import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, Tag, Send, Sparkles } from "lucide-react";
import { AiRefineButton } from "@/components/ui/AiRefineButton";

const STATUS_OPTIONS = ["new", "hot", "warm", "cold", "converted"];

export function ScheduledBroadcastDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    message: "",
    scheduledAt: "",
    scheduledTime: "",
    targetTag: "",
    targetStatus: "",
  });

  const { data: tags = [] } = useQuery<string[]>({
    queryKey: ["/api/dm/tags", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/dm/leads${clientId ? `?clientId=${clientId}` : ""}`);
      const leads = await res.json();
      const tagRes = await fetch("/api/dm/contact-tags");
      const allTags = await tagRes.json();
      const uniqueTags = new Set(allTags.map((t: any) => t.tag));
      return Array.from(uniqueTags);
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/scheduled-broadcasts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/scheduled-broadcasts"] });
      toast({ title: "Broadcast scheduled!", description: "Your message will be sent at the scheduled time." });
      onClose();
      setForm({ name: "", message: "", scheduledAt: "", scheduledTime: "", targetTag: "", targetStatus: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!form.message.trim()) return toast({ title: "Message required", variant: "destructive" });
    if (!form.scheduledAt) return toast({ title: "Date required", variant: "destructive" });
    if (!form.scheduledTime) return toast({ title: "Time required", variant: "destructive" });

    const scheduledAt = new Date(`${form.scheduledAt}T${form.scheduledTime}`);
    if (scheduledAt < new Date()) {
      return toast({ title: "Invalid date", description: "Scheduled time must be in the future", variant: "destructive" });
    }

    createMutation.mutate({
      name: form.name.trim(),
      message: form.message.trim(),
      scheduledAt: scheduledAt.toISOString(),
      targetTag: form.targetTag || null,
      targetStatus: form.targetStatus || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            Schedule Broadcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Broadcast Name *
            </Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekly Newsletter"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Date *
              </Label>
              <Input
                type="date"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="mt-1.5"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Time *
              </Label>
              <Input
                type="time"
                value={form.scheduledTime}
                onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Audience Targeting</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Filter by Tag
                </Label>
                <Select value={form.targetTag} onValueChange={v => setForm(f => ({ ...f, targetTag: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All tags</SelectItem>
                    {tags.map((tag: string) => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Filter by Status</Label>
                <Select value={form.targetStatus} onValueChange={v => setForm(f => ({ ...f, targetStatus: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Leave empty to send to all leads. Opted-out leads are automatically excluded.
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Broadcast Message *</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Write your broadcast message here..."
              rows={6}
              className="mt-1.5 resize-none"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-muted-foreground">{form.message.length} / 1000 characters</p>
              <AiRefineButton text={form.message} onAccept={v => setForm(f => ({ ...f, message: v }))} context="Instagram broadcast message" />
            </div>
          </div>

          {form.message && (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-semibold text-foreground mb-2">Preview:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{form.message}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending} className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Send className="w-4 h-4" />
            {createMutation.isPending ? "Scheduling..." : "Schedule Broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduledBroadcastsList({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  const { data: broadcasts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/scheduled-broadcasts", clientId],
    queryFn: () => fetch("/api/dm/scheduled-broadcasts").then(r => r.json()),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/scheduled-broadcasts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/scheduled-broadcasts"] });
      toast({ title: "Broadcast cancelled" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading broadcasts...</div>;
  }

  if (broadcasts.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
        <p className="text-sm text-muted-foreground">No scheduled broadcasts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {broadcasts.map((broadcast: any) => (
        <div key={broadcast.id} className="p-4 rounded-xl border border-card-border bg-card hover:border-primary/30 transition-all">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground">{broadcast.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  broadcast.status === "sent" ? "bg-green-500/10 text-green-400 border border-green-500/30" :
                  broadcast.status === "cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                  "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                }`}>
                  {broadcast.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{broadcast.message}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(broadcast.scheduledAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(broadcast.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {broadcast.recipientCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {broadcast.recipientCount} sent
                  </span>
                )}
              </div>
            </div>
            {broadcast.status === "pending" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelMutation.mutate(broadcast.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
