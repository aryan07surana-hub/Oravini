import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Mail, Lock, Save, Eye, EyeOff, Instagram, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy, ExternalLink, UserPlus, KeyRound, Users, RotateCcw, ChevronDown, ChevronUp, Trash2, Crown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [emailForm, setEmailForm] = useState({ newEmail: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [shortToken, setShortToken] = useState("");
  const [exchangedToken, setExchangedToken] = useState("");

  // Add client form
  const [clientForm, setClientForm] = useState({ name: "", email: "", password: "", plan: "free" });
  const [showClientPw, setShowClientPw] = useState(false);
  const [addedClient, setAddedClient] = useState<{ name: string; email: string; password: string } | null>(null);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setClientForm(f => ({ ...f, password: pw }));
  };

  // Client list state
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [showResetPw, setShowResetPw] = useState<Record<string, boolean>>({});
  const [justReset, setJustReset] = useState<Record<string, string>>({}); // clientId → new password shown
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const generateResetPw = (clientId: string) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setResetPasswords(p => ({ ...p, [clientId]: pw }));
  };

  // Queries
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: creditBalances = [] } = useQuery<any[]>({
    queryKey: ["/api/credits/all"],
  });

  const creditMap = creditBalances.reduce((acc: any, b: any) => {
    acc[b.userId] = b;
    return acc;
  }, {} as Record<string, any>);

  // Mutations
  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiRequest("PATCH", `/api/clients/${id}/reset-password`, { newPassword }),
    onSuccess: (_data, { id, newPassword }) => {
      setJustReset(p => ({ ...p, [id]: newPassword }));
      setResetPasswords(p => ({ ...p, [id]: "" }));
      toast({ title: "Password reset!", description: "The new password is shown below." });
    },
    onError: (err: any) => toast({ title: "Reset failed", description: err.message, variant: "destructive" }),
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      apiRequest("PATCH", `/api/clients/${id}`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Plan updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setConfirmDelete(null);
      toast({ title: "Client deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: metaAccount, isLoading: metaLoading, refetch: refetchMeta } = useQuery<any>({
    queryKey: ["/api/meta/account"],
  });

  const updateEmail = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/profile", { email: emailForm.newEmail }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/me"], updated);
      toast({ title: "Email updated!", description: "Your login email has been changed." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/change-password", {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    }),
    onSuccess: () => {
      toast({ title: "Password updated!", description: "Your password has been changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const refreshToken = useMutation({
    mutationFn: () => apiRequest("POST", "/api/meta/refresh-token", { shortToken }),
    onSuccess: (data: any) => {
      setExchangedToken(data.access_token);
      const days = data.expires_in ? Math.round(data.expires_in / 86400) : 60;
      toast({ title: "Connected!", description: `Long-lived token active — valid for ~${days} days. Connection is live.` });
      setShortToken("");
      setTimeout(() => refetchMeta(), 1000);
    },
    onError: (err: any) => toast({ title: "Exchange failed", description: err.message, variant: "destructive" }),
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    changePassword.mutate();
  };

  const copyToken = () => {
    navigator.clipboard.writeText(exchangedToken);
    toast({ title: "Copied!", description: "Token copied to clipboard." });
  };

  const addClient = useMutation({
    mutationFn: () => apiRequest("POST", "/api/clients", {
      name: clientForm.name.trim(),
      email: clientForm.email.trim(),
      password: clientForm.password,
      plan: clientForm.plan,
    }),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setAddedClient({ name: clientForm.name, email: clientForm.email, password: clientForm.password });
      setClientForm({ name: "", email: "", password: "", plan: "free" });
      toast({ title: "Client added!", description: `${created.name} can now log in.` });
    },
    onError: (err: any) => toast({ title: "Failed to add client", description: err.message, variant: "destructive" }),
  });

  const copyCredentials = () => {
    if (!addedClient) return;
    const text = `Login: ${addedClient.email}\nPassword: ${addedClient.password}\nPortal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast({ title: "Credentials copied!", description: "Share these with your client." });
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">Manage your admin account and integrations</p>
        </div>

        <div className="space-y-6">
          {/* Add Client */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Add New Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Full name</Label>
                  <Input
                    id="client-name"
                    data-testid="input-client-name"
                    placeholder="Jane Smith"
                    value={clientForm.name}
                    onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email address</Label>
                  <Input
                    id="client-email"
                    data-testid="input-client-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={clientForm.email}
                    onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password</Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="client-password"
                        data-testid="input-client-password"
                        type={showClientPw ? "text" : "password"}
                        placeholder="Set a password"
                        value={clientForm.password}
                        onChange={e => setClientForm(f => ({ ...f, password: e.target.value }))}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientPw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showClientPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generatePassword}
                      className="shrink-0 gap-1.5 text-xs border-zinc-700 text-zinc-300 hover:text-white"
                      data-testid="button-generate-password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={clientForm.plan} onValueChange={v => setClientForm(f => ({ ...f, plan: v }))}>
                    <SelectTrigger data-testid="select-client-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free — 20 credits/mo</SelectItem>
                      <SelectItem value="starter">Starter — 100 credits/mo</SelectItem>
                      <SelectItem value="pro">Pro — 500 credits/mo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                data-testid="button-add-client"
                onClick={() => addClient.mutate()}
                disabled={!clientForm.name.trim() || !clientForm.email.trim() || !clientForm.password || addClient.isPending}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {addClient.isPending ? "Creating account…" : "Create Client Account"}
              </Button>

              {/* Success state — show credentials to copy */}
              {addedClient && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-sm font-semibold text-green-400">Client account created!</p>
                  </div>
                  <div className="bg-zinc-900 rounded-md p-3 font-mono text-xs text-zinc-300 space-y-1">
                    <p><span className="text-zinc-500">Name:</span> {addedClient.name}</p>
                    <p><span className="text-zinc-500">Email:</span> {addedClient.email}</p>
                    <p><span className="text-zinc-500">Password:</span> {addedClient.password}</p>
                    <p><span className="text-zinc-500">Portal:</span> {window.location.origin}/login</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyCredentials} className="gap-1.5 text-xs border-zinc-600 text-zinc-300 hover:text-white" data-testid="button-copy-credentials">
                      <Copy className="w-3.5 h-3.5" /> Copy credentials
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddedClient(null)} className="text-xs text-zinc-500 hover:text-white">
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Accounts */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Client Accounts
                <Badge variant="outline" className="ml-auto text-xs">{clients.length} clients</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-800 rounded-lg" />)}
                </div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No clients yet. Add one above.</p>
              ) : (
                <div className="space-y-2">
                  {clients.map((client: any) => {
                    const initials = client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                    const isExpanded = expandedClient === client.id;
                    const credits = creditMap[client.id];
                    const totalCredits = credits ? credits.monthlyCredits + credits.bonusCredits : null;
                    const planColors: Record<string, string> = {
                      free: "border-zinc-600 text-zinc-400",
                      starter: "border-blue-500/40 text-blue-400",
                      pro: "border-[#d4b461]/40 text-[#d4b461]",
                    };

                    return (
                      <div key={client.id} className="rounded-lg border border-zinc-800 overflow-hidden" data-testid={`client-row-${client.id}`}>
                        {/* Main row */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                          onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                        >
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="bg-zinc-700 text-white text-xs font-bold">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{client.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{client.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`text-xs ${planColors[client.plan || "free"]}`}>
                              {client.plan === "pro" && <Crown className="w-2.5 h-2.5 mr-1" />}
                              {client.plan || "free"}
                            </Badge>
                            {totalCredits !== null && (
                              <span className="text-xs text-zinc-500 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-[#d4b461]" />{totalCredits}
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                          </div>
                        </div>

                        {/* Expanded panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-zinc-800 space-y-4 bg-zinc-900/50">
                            {/* Info row */}
                            <div className="grid grid-cols-3 gap-3 text-xs pt-2">
                              <div>
                                <p className="text-zinc-500 mb-0.5">Email</p>
                                <p className="text-zinc-200 break-all">{client.email}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 mb-0.5">Credits</p>
                                <p className="text-zinc-200">{totalCredits !== null ? `${totalCredits} total` : "Not initialized"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 mb-0.5">Joined</p>
                                <p className="text-zinc-200">{client.createdAt ? new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                              </div>
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* Update Plan */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Change Plan</p>
                              <div className="flex items-center gap-2">
                                <Select
                                  defaultValue={client.plan || "free"}
                                  onValueChange={(v) => updatePlan.mutate({ id: client.id, plan: v })}
                                >
                                  <SelectTrigger className="h-8 text-xs w-44" data-testid={`select-plan-${client.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free — 20 credits/mo</SelectItem>
                                    <SelectItem value="starter">Starter — 100 credits/mo</SelectItem>
                                    <SelectItem value="pro">Pro — 500 credits/mo</SelectItem>
                                  </SelectContent>
                                </Select>
                                {updatePlan.isPending && <span className="text-xs text-zinc-500 animate-pulse">Saving…</span>}
                              </div>
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* Reset Password */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Reset Password</p>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type={showResetPw[client.id] ? "text" : "password"}
                                    placeholder="New password"
                                    value={resetPasswords[client.id] || ""}
                                    onChange={e => setResetPasswords(p => ({ ...p, [client.id]: e.target.value }))}
                                    className="h-8 text-xs pr-9 bg-zinc-800 border-zinc-700"
                                    data-testid={`input-reset-pw-${client.id}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowResetPw(p => ({ ...p, [client.id]: !p[client.id] }))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                                  >
                                    {showResetPw[client.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generateResetPw(client.id)}
                                  className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-white px-2 gap-1"
                                  data-testid={`button-gen-reset-${client.id}`}
                                >
                                  <KeyRound className="w-3 h-3" /> Generate
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const pw = resetPasswords[client.id];
                                    if (!pw || pw.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" });
                                    resetPassword.mutate({ id: client.id, newPassword: pw });
                                  }}
                                  disabled={resetPassword.isPending}
                                  className="h-8 text-xs bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold gap-1"
                                  data-testid={`button-reset-pw-${client.id}`}
                                >
                                  <RotateCcw className="w-3 h-3" /> Reset
                                </Button>
                              </div>

                              {/* Show new password after reset */}
                              {justReset[client.id] && (
                                <div className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-zinc-500 mb-0.5">New password set</p>
                                    <p className="text-sm font-mono text-white">{justReset[client.id]}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`Email: ${client.email}\nPassword: ${justReset[client.id]}\nPortal: ${window.location.origin}/login`);
                                      toast({ title: "Credentials copied!" });
                                    }}
                                    className="h-7 text-xs text-zinc-400 hover:text-white gap-1"
                                    data-testid={`button-copy-reset-${client.id}`}
                                  >
                                    <Copy className="w-3 h-3" /> Copy all
                                  </Button>
                                </div>
                              )}
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* Delete */}
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-zinc-600">Permanently removes account and all data</p>
                              {confirmDelete === client.id ? (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} className="h-7 text-xs text-zinc-400">Cancel</Button>
                                  <Button
                                    size="sm"
                                    onClick={() => deleteClient.mutate(client.id)}
                                    disabled={deleteClient.isPending}
                                    className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                    data-testid={`button-confirm-delete-${client.id}`}
                                  >
                                    {deleteClient.isPending ? "Deleting…" : "Yes, delete"}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmDelete(client.id)}
                                  className="h-7 text-xs border-red-800/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 gap-1"
                                  data-testid={`button-delete-${client.id}`}
                                >
                                  <Trash2 className="w-3 h-3" /> Delete client
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta / Instagram Connection */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Instagram className="w-4 h-4 text-primary" />
                Meta / Instagram Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {metaLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking connection…
                </div>
              ) : metaAccount?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-400">Connected</span>
                    <Badge variant="outline" className="ml-auto text-xs border-green-500/40 text-green-400">Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Instagram account</p>
                      <p className="font-medium text-foreground">@{metaAccount.igUsername}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Page</p>
                      <p className="font-medium text-foreground">{metaAccount.pageName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Followers</p>
                      <p className="font-medium text-foreground">{metaAccount.followersCount?.toLocaleString() ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Token expires</p>
                      <p className="font-medium text-foreground">
                        {metaAccount.expiresAt ? new Date(metaAccount.expiresAt).toLocaleDateString() : "Long-lived (no expiry)"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">
                    Post syncs and profile analysis for <strong>@{metaAccount.igUsername}</strong> now use the Meta Graph API for accurate insights (views, saves, reach). Competitor profiles still use Apify.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchMeta()} className="gap-2 text-xs" data-testid="button-refresh-meta">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh status
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {metaAccount?.tokenExpired ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-400">Token expired</span>
                        <Badge variant="outline" className="ml-auto text-xs border-yellow-500/40 text-yellow-400">Needs refresh</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-red-400">Not connected</span>
                      </>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">{metaAccount?.message || "Your Meta access token is missing or expired."}</p>

                  <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-xs text-muted-foreground border border-border">
                    <p className="font-semibold text-foreground text-sm mb-1">How to reconnect:</p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">Graph API Explorer <ExternalLink className="w-3 h-3" /></a></li>
                      <li>Select your Meta App from the dropdown</li>
                      <li>Click <strong>Generate Access Token</strong> — grant: <code className="bg-muted px-1 rounded">instagram_basic</code>, <code className="bg-muted px-1 rounded">instagram_manage_insights</code>, <code className="bg-muted px-1 rounded">pages_show_list</code>, <code className="bg-muted px-1 rounded">pages_read_engagement</code></li>
                      <li>Paste the token below — it will be exchanged for a 60-day token and saved automatically</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Paste short-lived token here</Label>
                    <Input
                      data-testid="input-short-token"
                      placeholder="EAABwzL..."
                      value={shortToken}
                      onChange={(e) => setShortToken(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    data-testid="button-exchange-token"
                    disabled={!shortToken.trim() || refreshToken.isPending}
                    onClick={() => refreshToken.mutate()}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshToken.isPending ? "animate-spin" : ""}`} />
                    {refreshToken.isPending ? "Exchanging…" : "Exchange for 60-day token"}
                  </Button>

                  {exchangedToken && (
                    <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-green-400">
                        <p className="font-semibold mb-0.5">Token saved and active</p>
                        <p className="text-green-500/70">Your 60-day long-lived token is saved and in use. No further action needed.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Change Email Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Current email</Label>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New email address</Label>
                <Input
                  id="new-email"
                  data-testid="input-new-email"
                  type="email"
                  placeholder="newaddress@example.com"
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ newEmail: e.target.value })}
                />
              </div>
              <Button
                data-testid="button-update-email"
                onClick={() => updateEmail.mutate()}
                disabled={!emailForm.newEmail || emailForm.newEmail === user?.email || updateEmail.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateEmail.isPending ? "Saving..." : "Update Email"}
              </Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      data-testid="input-current-password"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      data-testid="input-new-password"
                      type={showNew ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder="Repeat new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="button-change-password"
                  disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || changePassword.isPending}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {changePassword.isPending ? "Updating..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
