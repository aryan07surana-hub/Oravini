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
import { Settings, Mail, Lock, Save, Eye, EyeOff, Instagram, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [emailForm, setEmailForm] = useState({ newEmail: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [shortToken, setShortToken] = useState("");
  const [exchangedToken, setExchangedToken] = useState("");

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
      toast({ title: "Token exchanged!", description: `You now have a long-lived token valid for ~${days} days. Copy it and save it as META_ACCESS_TOKEN in your secrets.` });
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
                    <p className="font-semibold text-foreground text-sm mb-1">How to get a fresh token:</p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">Graph API Explorer <ExternalLink className="w-3 h-3" /></a></li>
                      <li>Select your Meta App from the dropdown</li>
                      <li>Click <strong>Generate Access Token</strong> — grant: <code className="bg-muted px-1 rounded">instagram_basic</code>, <code className="bg-muted px-1 rounded">instagram_manage_insights</code>, <code className="bg-muted px-1 rounded">pages_show_list</code>, <code className="bg-muted px-1 rounded">pages_read_engagement</code></li>
                      <li>Paste the short-lived token below to exchange it for a 60-day token</li>
                      <li>Save the result as <code className="bg-muted px-1 rounded">META_ACCESS_TOKEN</code> in Replit Secrets</li>
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
                    <div className="space-y-2">
                      <Label className="text-sm text-green-400">Your 60-day token (copy & save as META_ACCESS_TOKEN):</Label>
                      <div className="flex gap-2">
                        <Input value={exchangedToken} readOnly className="font-mono text-xs" data-testid="text-exchanged-token" />
                        <Button variant="outline" size="icon" onClick={copyToken} data-testid="button-copy-token">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">After saving it in Replit Secrets, reload the page and refresh the status above.</p>
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
