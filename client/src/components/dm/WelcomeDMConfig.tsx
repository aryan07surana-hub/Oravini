import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Heart, Clock, Sparkles } from "lucide-react";
import { AiRefineButton } from "@/components/ui/AiRefineButton";

export function WelcomeDMConfig({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<any>({
    queryKey: ["/api/dm/welcome-dm", clientId],
    queryFn: () => fetch("/api/dm/welcome-dm").then(r => r.json()),
  });

  const [form, setForm] = useState({
    isActive: false,
    message: "",
    delayMinutes: 0,
  });

  useEffect(() => {
    if (config) {
      setForm({
        isActive: config.isActive || false,
        message: config.message || "",
        delayMinutes: config.delayMinutes || 0,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/dm/welcome-dm", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/welcome-dm"] });
      toast({ title: "Welcome DM settings saved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (form.isActive && !form.message.trim()) {
      return toast({ title: "Message required", variant: "destructive" });
    }
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Welcome DM</h3>
          <p className="text-xs text-muted-foreground">Automatically welcome new leads</p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-card-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Enable Welcome DM</p>
            <p className="text-xs text-muted-foreground">Send automatic welcome message to new leads</p>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
          />
        </div>

        {form.isActive && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Delay (minutes)
              </Label>
              <Input
                type="number"
                value={form.delayMinutes}
                onChange={e => setForm(f => ({ ...f, delayMinutes: parseInt(e.target.value) || 0 }))}
                min={0}
                className="mt-1.5"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Wait time before sending (0 = instant)
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Welcome Message *
              </Label>
              <Textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Hey {{first_name}}! 👋 Thanks for reaching out..."
                rows={6}
                className="mt-1.5 resize-none"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Use variables: {"{"}{"{"} first_name {"}"}{"}"}, {"{"}{"{"} name {"}"}{"}"}, {"{"}{"{"} instagram {"}"}{"}"}
                </p>
                <AiRefineButton
                  text={form.message}
                  onAccept={v => setForm(f => ({ ...f, message: v }))}
                  context="Instagram welcome DM message"
                />
              </div>
            </div>

            {form.message && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs font-semibold text-foreground mb-2">Preview:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {form.message.replace(/\{\{first_name\}\}/g, "John").replace(/\{\{name\}\}/g, "John Doe").replace(/\{\{instagram\}\}/g, "@johndoe")}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full gap-2"
      >
        <Heart className="w-4 h-4" />
        {saveMutation.isPending ? "Saving..." : "Save Welcome DM Settings"}
      </Button>

      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
        <p className="text-xs font-semibold text-primary mb-2">How it works:</p>
        <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
          <li>When a new lead is added to your system</li>
          <li>Wait for the specified delay (if any)</li>
          <li>Automatically send the welcome message</li>
          <li>Variables are replaced with actual lead data</li>
        </ol>
      </div>
    </div>
  );
}
