import { useMutation, useQuery } from "@tanstack/react-query";
import ClientLayout from "@/components/layout/ClientLayout";
import { InstagramUnifiedView, type UnifiedMedia, type UnifiedStatus } from "@/components/InstagramUnifiedView";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
const base = "/api/instagram/unified";
const messages: Record<string, string> = {
  choose_account: "Choose which shared Instagram account to use below.", no_accounts: "No professional Instagram account was shared. Reconnect and choose an account in Meta.",
  cancelled: "Connection cancelled. You can try again when you are ready.", state_invalid: "This connection link expired or was already used. Start again from Connect Instagram.",
  login_required: "Sign into Oravini, then start the connection again.", not_configured: "The new Instagram connection is still being configured.", configuration_pending: "The Meta login configuration is awaiting its permission check.",
  refresh_cooldown: "Stats can be refreshed once every 15 minutes. Please try again later.", reconnect_required: "Meta access is no longer valid. Reconnect Instagram to continue.",
  permission_missing: "Meta did not grant access to this data. Check the account and permissions in your connection.", meta_rate_limited: "Meta has temporarily limited requests. Please try again later.",
  business_portfolio_required: "Choose a business portfolio and professional Instagram account in Meta.", meta_unavailable: "Meta could not be reached. Please try again later.",
};
const emptyStatus: UnifiedStatus = { configured: false, connected: false, accounts: [], selectedAccountId: null, lastSyncedAt: null, reconnectRequired: false };
export default function InstagramUnified() {
  const { user } = useAuth();
  const key = [`${base}/status`, user?.id];
  const status = useQuery<UnifiedStatus>({ queryKey: key, enabled: !!user, refetchOnWindowFocus: false, retry: false });
  const current = status.data ?? emptyStatus;
  const canShowMedia = current.connected && !!current.selectedAccountId && !current.reconnectRequired;
  const media = useQuery<{ media: UnifiedMedia[] }>({ queryKey: [`${base}/media`, user?.id, current.selectedAccountId], enabled: !!user && canShowMedia, refetchOnWindowFocus: false, retry: false });
  const mutation = useMutation({
    mutationFn: async ({ action, accountId }: { action: string; accountId?: string }) => {
      const data = await apiRequest("POST", `${base}/${action}`, accountId ? { accountId } : {});
      if (action === "connect") {
        const url = new URL(data.authorizationUrl);
        if (url.origin !== "https://www.facebook.com" || url.pathname !== "/dialog/oauth") throw new Error("connection_unavailable");
        window.location.assign(url.href);
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: [`${base}/media`, user?.id] });
    },
    onError: async () => { await queryClient.invalidateQueries({ queryKey: key }); },
  });
  const error: any = mutation.error || status.error || media.error;
  const errorCode = error?.data?.error;
  const result = new URLSearchParams(window.location.search).get("result") || "";
  return <ClientLayout><InstagramUnifiedView
    status={current} media={canShowMedia ? media.data?.media ?? [] : []} loading={status.isLoading}
    busy={mutation.isPending} error={error ? messages[errorCode] || "The connection could not be loaded. Try again, or contact support.oravini@gmail.com." : undefined}
    notice={messages[result]}
    onConnect={() => mutation.mutate({ action: "connect" })}
    onAccount={accountId => mutation.mutate({ action: "account", accountId })}
    onSync={() => mutation.mutate({ action: "sync" })}
    onRemove={() => { if (window.confirm("Remove this Instagram insights connection and its stored account data and snapshots? Your separate messaging connection and Instagram posts will not be changed.")) mutation.mutate({ action: "remove" }); }}
  /></ClientLayout>;
}
