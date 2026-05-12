import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { UserX, UserCheck, AlertCircle } from "lucide-react";

export function OptOutToggle({ lead }: { lead: any }) {
  const { toast } = useToast();

  const optOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/dm/leads/${lead.id}/opt-out`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      toast({ title: "Lead opted out", description: "They will no longer receive broadcasts" });
    },
  });

  const optInMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/dm/leads/${lead.id}/opt-out`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads"] });
      toast({ title: "Lead opted back in" });
    },
  });

  const isOptedOut = lead.isOptedOut;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isOptedOut ? (
          <UserX className="w-4 h-4 text-red-400" />
        ) : (
          <UserCheck className="w-4 h-4 text-green-400" />
        )}
        <p className="text-xs font-semibold text-foreground">Subscription Status</p>
      </div>

      <div className={`p-4 rounded-xl border ${isOptedOut ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isOptedOut ? (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                <UserX className="w-2.5 h-2.5 mr-1" />
                Opted Out
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                <UserCheck className="w-2.5 h-2.5 mr-1" />
                Subscribed
              </Badge>
            )}
          </div>
          <Switch
            checked={!isOptedOut}
            onCheckedChange={v => {
              if (v) optInMutation.mutate();
              else optOutMutation.mutate();
            }}
            disabled={optOutMutation.isPending || optInMutation.isPending}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isOptedOut
            ? "This lead will not receive broadcasts or automated messages"
            : "This lead will receive broadcasts and automated messages"}
        </p>
      </div>

      {isOptedOut && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400 leading-relaxed">
            Opted-out leads are automatically excluded from all broadcasts and sequences. You can still send individual DMs.
          </p>
        </div>
      )}
    </div>
  );
}

export function OptOutBadge({ isOptedOut }: { isOptedOut: boolean }) {
  if (!isOptedOut) return null;

  return (
    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] gap-1">
      <UserX className="w-2.5 h-2.5" />
      Opted Out
    </Badge>
  );
}

export function OptOutFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange("all")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          value === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        All Leads
      </button>
      <button
        onClick={() => onChange("subscribed")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
          value === "subscribed"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        <UserCheck className="w-3 h-3" />
        Subscribed
      </button>
      <button
        onClick={() => onChange("opted-out")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
          value === "opted-out"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        <UserX className="w-3 h-3" />
        Opted Out
      </button>
    </div>
  );
}
