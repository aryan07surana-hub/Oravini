import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, TrendingUp, Users } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-300",
  starter: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  pro: "bg-[#d4b461]/20 text-[#d4b461] border border-[#d4b461]/40",
};

export default function AdminCredits() {
  const { toast } = useToast();
  const [grantForm, setGrantForm] = useState<{ userId: string; amount: string; description: string }>({ userId: "", amount: "", description: "" });

  const { data: balances = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/credits/all"],
  });

  const grantMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/credits/grant", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credits/all"] });
      setGrantForm({ userId: "", amount: "", description: "" });
      toast({ title: "Credits granted successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleGrant = () => {
    const amount = parseInt(grantForm.amount);
    if (!grantForm.userId || isNaN(amount) || amount <= 0) {
      toast({ title: "Please select a user and enter a valid amount", variant: "destructive" });
      return;
    }
    grantMutation.mutate({ userId: grantForm.userId, amount, description: grantForm.description || `Admin grant: ${amount} credits` });
  };

  const totalMonthly = balances.reduce((s: number, b: any) => s + b.monthlyCredits, 0);
  const totalBonus = balances.reduce((s: number, b: any) => s + b.bonusCredits, 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Management</h1>
          <p className="text-zinc-400 text-sm mt-1">View client balances and grant bonus credits</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-zinc-400" />
                <p className="text-zinc-400 text-xs uppercase tracking-wider">Total Clients</p>
              </div>
              <p className="text-3xl font-bold text-white">{balances.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#d4b461]" />
                <p className="text-zinc-400 text-xs uppercase tracking-wider">Monthly Credits Active</p>
              </div>
              <p className="text-3xl font-bold text-white">{totalMonthly}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <p className="text-zinc-400 text-xs uppercase tracking-wider">Bonus Credits</p>
              </div>
              <p className="text-3xl font-bold text-white">{totalBonus}</p>
            </CardContent>
          </Card>
        </div>

        {/* Grant Credits */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#d4b461]" />
              Grant Bonus Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4b461]"
                value={grantForm.userId}
                onChange={e => setGrantForm(f => ({ ...f, userId: e.target.value }))}
                data-testid="select-grant-user"
              >
                <option value="">Select client...</option>
                {balances.map((b: any) => (
                  <option key={b.userId} value={b.userId}>
                    {b.userName || b.userEmail} ({b.userPlan || "free"} — {b.monthlyCredits + b.bonusCredits} credits)
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                placeholder="Amount"
                className="w-28 bg-zinc-800 border-zinc-700 text-white"
                value={grantForm.amount}
                onChange={e => setGrantForm(f => ({ ...f, amount: e.target.value }))}
                data-testid="input-grant-amount"
              />
              <Input
                placeholder="Reason (optional)"
                className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                value={grantForm.description}
                onChange={e => setGrantForm(f => ({ ...f, description: e.target.value }))}
                data-testid="input-grant-description"
              />
              <Button
                onClick={handleGrant}
                disabled={grantMutation.isPending}
                className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold"
                data-testid="button-grant-credits"
              >
                {grantMutation.isPending ? "Granting..." : "Grant Credits"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client balances table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Client Credit Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-800 rounded" />)}
              </div>
            ) : balances.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">No credit records yet. Credits are created automatically when clients use AI features.</p>
            ) : (
              <div className="space-y-2">
                {balances.map((b: any) => (
                  <div key={b.userId} className="flex items-center justify-between py-3 px-4 bg-zinc-800/50 rounded-lg" data-testid={`credit-row-${b.userId}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                        {(b.userName || b.userEmail || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{b.userName || "Unknown"}</p>
                        <p className="text-zinc-500 text-xs">{b.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`text-xs ${PLAN_COLORS[b.userPlan || "free"]}`}>
                        {b.userPlan || "free"}
                      </Badge>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">
                          {b.monthlyCredits + b.bonusCredits} total
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {b.monthlyCredits} monthly + {b.bonusCredits} bonus
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs"
                        onClick={() => setGrantForm({ userId: b.userId, amount: "25", description: "" })}
                        data-testid={`button-quick-grant-${b.userId}`}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
