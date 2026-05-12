import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link2, Plus, Trash2, Copy, Check, ExternalLink, MousePointerClick, TrendingUp } from "lucide-react";

export function ClickTrackingPanel({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/click-links", clientId],
    queryFn: () => fetch("/api/dm/click-links").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/click-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/click-links"] });
      toast({ title: "Link deleted" });
    },
  });

  const copyLink = (shortCode: string, id: string) => {
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/r/${shortCode}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedId(id);
    toast({ title: "Link copied!", description: "Tracking URL copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalClicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Click Tracking Links
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Generate trackable short links for your DMs</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Create Link
        </Button>
      </div>

      {totalClicks > 0 && (
        <div className="p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalClicks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Link2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground mb-1">No tracking links yet</p>
          <p className="text-xs text-muted-foreground">Create short links to track clicks in your DMs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => (
            <div key={link.id} className="p-4 rounded-xl border border-card-border bg-card hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    {link.label && <h4 className="text-sm font-semibold text-foreground">{link.label}</h4>}
                    <Badge variant="secondary" className="gap-1">
                      <MousePointerClick className="w-2.5 h-2.5" />
                      {link.clickCount || 0} clicks
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Original:</p>
                      <a
                        href={link.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate flex items-center gap-1"
                      >
                        {link.originalUrl}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Tracking:</p>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {window.location.origin}/r/{link.shortCode}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(link.shortCode, link.id)}
                    className="gap-1"
                  >
                    {copiedId === link.id ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(link.id); }}
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

      <CreateLinkDialog open={dialogOpen} onClose={() => setDialogOpen(false)} clientId={clientId} />
    </div>
  );
}

function CreateLinkDialog({ open, onClose, clientId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    originalUrl: "",
    label: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/click-links", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/click-links"] });
      toast({ title: "Tracking link created!" });
      setForm({ originalUrl: "", label: "" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.originalUrl.trim()) {
      return toast({ title: "URL required", variant: "destructive" });
    }

    try {
      new URL(form.originalUrl);
    } catch {
      return toast({ title: "Invalid URL", description: "Please enter a valid URL", variant: "destructive" });
    }

    createMutation.mutate({
      originalUrl: form.originalUrl.trim(),
      label: form.label.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Create Tracking Link
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Original URL *</Label>
            <Input
              value={form.originalUrl}
              onChange={e => setForm(f => ({ ...f, originalUrl: e.target.value }))}
              placeholder="https://example.com/your-page"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              The destination URL where users will be redirected
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Label (optional)</Label>
            <Input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Landing Page, Product Link"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              A friendly name to identify this link
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-primary font-medium mb-1">How it works:</p>
            <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>We generate a short tracking URL</li>
              <li>Share it in your DMs or bio</li>
              <li>Track every click in real-time</li>
            </ol>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending} className="gap-2">
            <Link2 className="w-4 h-4" />
            {createMutation.isPending ? "Creating..." : "Create Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
