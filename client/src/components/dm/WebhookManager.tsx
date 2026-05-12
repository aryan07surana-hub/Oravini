import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Plus, Trash2, Edit2, Zap, ExternalLink, Play, Pause, TestTube } from "lucide-react";

const WEBHOOK_EVENTS = [
  { value: "lead_created", label: "Lead Created", desc: "When a new lead is added" },
  { value: "lead_updated", label: "Lead Updated", desc: "When a lead is modified" },
  { value: "status_changed", label: "Status Changed", desc: "When lead status changes" },
  { value: "tag_added", label: "Tag Added", desc: "When a tag is added to a lead" },
  { value: "opted_out", label: "Opted Out", desc: "When a lead opts out" },
  { value: "trigger_fired", label: "Trigger Fired", desc: "When an auto-reply triggers" },
  { value: "sequence_enrolled", label: "Sequence Enrolled", desc: "When lead joins a sequence" },
  { value: "sequence_completed", label: "Sequence Completed", desc: "When lead completes a sequence" },
];

export function WebhookManager({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: webhooks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/webhooks", clientId],
    queryFn: () => fetch("/api/dm/webhooks").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/dm/webhooks/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks"] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/dm/webhooks/${id}/test`, {}),
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({ title: "Test successful!", description: "Webhook received the test payload." });
      } else {
        toast({ title: "Test failed", description: `Status: ${data.status}`, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            Outbound Webhooks
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Connect to Zapier, Make, or any webhook endpoint</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground mb-1">No webhooks configured</p>
          <p className="text-xs text-muted-foreground">Connect to Zapier, Make, or any HTTP endpoint</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook: any) => (
            <div key={webhook.id} className="p-4 rounded-xl border border-card-border bg-card hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-foreground">{webhook.name}</h4>
                    {webhook.isActive ? (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                        <Play className="w-2.5 h-2.5 mr-1" />Active
                      </Badge>
                    ) : (
                      <Badge className="bg-muted/20 text-muted-foreground border-border text-[10px]">
                        <Pause className="w-2.5 h-2.5 mr-1" />Paused
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      Event: <span className="font-medium text-foreground">{WEBHOOK_EVENTS.find(e => e.value === webhook.triggerEvent)?.label || webhook.triggerEvent}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{webhook.url}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Fired {webhook.fireCount || 0} times
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={webhook.isActive}
                    onCheckedChange={() => toggleMutation.mutate({ id: webhook.id, isActive: !webhook.isActive })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testMutation.mutate(webhook.id)}
                    disabled={testMutation.isPending}
                    className="gap-1"
                  >
                    <TestTube className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditing(webhook); setDialogOpen(true); }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm("Delete this webhook?")) deleteMutation.mutate(webhook.id); }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WebhookDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        existing={editing}
        clientId={clientId}
      />
    </div>
  );
}

function WebhookDialog({ open, onClose, existing, clientId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || "",
    url: existing?.url || "",
    triggerEvent: existing?.triggerEvent || "",
    triggerValue: existing?.triggerValue || "",
    isActive: existing?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/webhooks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks"] });
      toast({ title: "Webhook created!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/webhooks/${existing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/webhooks"] });
      toast({ title: "Webhook updated!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!form.url.trim()) return toast({ title: "URL required", variant: "destructive" });
    if (!form.triggerEvent) return toast({ title: "Event required", variant: "destructive" });

    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      triggerEvent: form.triggerEvent,
      triggerValue: form.triggerValue.trim() || null,
      isActive: form.isActive,
    };

    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Webhook" : "Create Webhook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Webhook Name *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Zapier Lead Sync"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Webhook URL *</Label>
            <Input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://hooks.zapier.com/..."
              className="mt-1.5 font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Trigger Event *</Label>
            <Select value={form.triggerEvent} onValueChange={v => setForm(f => ({ ...f, triggerEvent: v }))}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_EVENTS.map(event => (
                  <SelectItem key={event.value} value={event.value}>
                    <div>
                      <p className="text-xs font-medium">{event.label}</p>
                      <p className="text-[10px] text-muted-foreground">{event.desc}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Filter Value (optional)</Label>
            <Input
              value={form.triggerValue}
              onChange={e => setForm(f => ({ ...f, triggerValue: e.target.value }))}
              placeholder="e.g. hot (for status_changed)"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Only fire webhook when event matches this value
            </p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-xs font-medium text-foreground">Active</p>
              <p className="text-[10px] text-muted-foreground">Webhook will fire when active</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : existing ? "Save Changes" : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
