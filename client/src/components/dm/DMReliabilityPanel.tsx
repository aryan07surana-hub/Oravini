import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, AlertCircle, CheckCircle2, XCircle, Instagram, Radio, Zap, Send, RefreshCw,
  KeyRound, MessageCircle, AtSign, MessageSquare, Clock, ArrowRight, Info,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { DmAlert } from "@shared/dmOnboarding";
import { labelEventType } from "@shared/dmOnboarding";
import { openMetaConnect } from "./metaConnect";

export interface DmHealth {
  checkedAt: string;
  connection: {
    connected: boolean; igUsername: string | null; igAccountId: string | null; fbPageName: string | null; fbPageId: string | null;
    connectedAt: string | null; tokenExpiresAt: string | null;
    tokenStatus: "valid" | "expiring" | "expired" | "invalid" | "not_connected";
    liveCheck: boolean | null; liveCheckError: string | null; scopes: string[] | null; missingScopes: string[];
  };
  webhook: {
    state: "receiving" | "quiet" | "never"; quietThresholdDays: number; lastEventAt: string | null;
    lastByType: Record<string, string | null>; events24h: number; events7d: number;
  };
  automations: { total: number; byKind: Record<string, number> };
  runs: { sent24h: number; failed24h: number; lastFailure: null | { code: number | null; title: string; fix: string; message: string | null; at: string | null } };
  alerts: DmAlert[];
}

interface LogRun {
  id: string; automationKind: string; automationName: string | null; action: string | null;
  status: "sent" | "failed" | "partial"; errorCode: number | null; errorMessage: string | null;
  explanation: null | { code: number | null; title: string; fix: string; connectionProblem: boolean }; at: string | null;
}
interface LogEntry {
  id: string; eventType: string; senderId: string | null; senderUsername: string | null; text: string | null; receivedAt: string | null; runs: LogRun[];
}

export const HEALTH_QUERY_KEY = ["/api/dm/health"];
export const LOGS_QUERY_KEY = ["/api/dm/logs"];

export function useDmHealth(enabled = true) {
  return useQuery<DmHealth>({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: () => apiRequest("GET", "/api/dm/health"),
    enabled,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

const KIND_LABEL: Record<string, string> = {
  dm_trigger: "DM keyword auto-replies",
  comment_reply: "Comment-to-DM",
  welcome_dm: "Welcome DM",
  story_reply: "Story mention thank-you",
};

function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function AlertCard({ alert, onOpenLogs, onOpenWizard, compact }: { alert: DmAlert; onOpenLogs?: () => void; onOpenWizard?: () => void; compact?: boolean }) {
  const isError = alert.level === "error";
  const Icon = isError ? AlertCircle : AlertTriangle;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${isError ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"}`} data-testid={`dm-alert-${alert.code}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isError ? "text-red-400" : "text-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isError ? "text-red-400" : "text-amber-400"}`}>{alert.title}</p>
        {!compact && <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>}
        <p className="text-xs text-foreground/80 mt-1"><span className="font-semibold">Fix: </span>{alert.fix}</p>
      </div>
      {alert.action === "reconnect" && (
        <Button size="sm" variant={isError ? "default" : "outline"} className="gap-1.5 flex-shrink-0" onClick={() => openMetaConnect()}>
          <Instagram className="w-3.5 h-3.5" />Reconnect
        </Button>
      )}
      {alert.action === "open_logs" && onOpenLogs && (
        <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={onOpenLogs}>View log<ArrowRight className="w-3.5 h-3.5" /></Button>
      )}
      {alert.action === "open_wizard" && onOpenWizard && (
        <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={onOpenWizard}>Run test<ArrowRight className="w-3.5 h-3.5" /></Button>
      )}
    </div>
  );
}

/** Banner shown at the top of the DM Automation page when something is broken. */
export function DMHealthAlertBanner({ onOpenLogs, onOpenWizard }: { onOpenLogs?: () => void; onOpenWizard?: () => void }) {
  const { data } = useDmHealth();
  const alerts = data?.alerts ?? [];
  if (!alerts.length) return null;
  const sorted = [...alerts].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  return (
    <div className="space-y-2" data-testid="dm-health-banner">
      {sorted.slice(0, 2).map(a => <AlertCard key={a.code} alert={a} compact onOpenLogs={onOpenLogs} onOpenWizard={onOpenWizard} />)}
      {sorted.length > 2 && onOpenLogs && (
        <button className="text-xs text-muted-foreground underline" onClick={onOpenLogs}>+{sorted.length - 2} more issue{sorted.length - 2 === 1 ? "" : "s"} — see Status &amp; Logs</button>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, status, children }: { icon: any; title: string; status: "ok" | "warn" | "bad" | "idle"; children: React.ReactNode }) {
  const color = status === "ok" ? "text-green-400" : status === "warn" ? "text-amber-400" : status === "bad" ? "text-red-400" : "text-muted-foreground";
  const dot = status === "ok" ? "bg-green-400" : status === "warn" ? "bg-amber-400" : status === "bad" ? "bg-red-400" : "bg-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        <span className={`ml-auto w-2 h-2 rounded-full ${dot}`} />
      </div>
      <div className="text-xs space-y-1">{children}</div>
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const c = tone === "ok" ? "text-green-400" : tone === "warn" ? "text-amber-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={`text-right break-all ${c}`}>{v}</span>
    </div>
  );
}

const EVENT_ICON: Record<string, any> = { dm: MessageCircle, comment: MessageSquare, story_mention: AtSign };

function RunStatus({ run }: { run: LogRun }) {
  if (run.status === "sent") return <span className="inline-flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3.5 h-3.5" />Sent</span>;
  if (run.status === "partial") return <span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />Partly sent</span>;
  return <span className="inline-flex items-center gap-1 text-red-400"><XCircle className="w-3.5 h-3.5" />Failed</span>;
}

export function DMReliabilityPanel({ onOpenWizard }: { onOpenWizard?: () => void }) {
  const { data: health, isLoading, isFetching, refetch } = useDmHealth();
  const { data: logs, isLoading: logsLoading } = useQuery<{ entries: LogEntry[] }>({
    queryKey: LOGS_QUERY_KEY,
    queryFn: () => apiRequest("GET", "/api/dm/logs?limit=50"),
    refetchInterval: 15000,
    retry: 1,
  });

  const refresh = async () => {
    await apiRequest("GET", "/api/dm/health?refresh=1").then(d => queryClient.setQueryData(HEALTH_QUERY_KEY, d)).catch(() => refetch());
    queryClient.invalidateQueries({ queryKey: LOGS_QUERY_KEY });
  };

  if (isLoading) {
    return <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>;
  }
  if (!health) {
    return <p className="text-sm text-muted-foreground">Status is unavailable right now. Try again in a moment.</p>;
  }

  const c = health.connection;
  const tokenTone = c.tokenStatus === "valid" ? "ok" : c.tokenStatus === "expiring" ? "warn" : c.tokenStatus === "not_connected" ? undefined : "bad";
  const daysLeft = c.tokenExpiresAt ? Math.ceil((new Date(c.tokenExpiresAt).getTime() - Date.now()) / 86400000) : null;
  const connStatus = !c.connected ? "bad" : c.tokenStatus === "expired" || c.tokenStatus === "invalid" || !c.igAccountId ? "bad" : c.tokenStatus === "expiring" || c.missingScopes.length ? "warn" : "ok";
  const whStatus = health.webhook.state === "receiving" ? "ok" : health.automations.total > 0 ? "warn" : "idle";
  const sendStatus = health.runs.failed24h === 0 ? (health.runs.sent24h ? "ok" : "idle") : health.runs.failed24h > health.runs.sent24h ? "bad" : "warn";

  return (
    <div className="space-y-5" data-testid="dm-reliability-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Status &amp; Logs</p>
          <p className="text-[11px] text-muted-foreground">Checked {ago(health.checkedAt)} · refreshes automatically</p>
        </div>
        <div className="flex gap-2">
          {onOpenWizard && <Button size="sm" variant="outline" onClick={onOpenWizard}>Setup wizard</Button>}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={refresh} disabled={isFetching} data-testid="button-refresh-health">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />Re-check
          </Button>
        </div>
      </div>

      {health.alerts.length > 0 ? (
        <div className="space-y-2">{health.alerts.map(a => <AlertCard key={a.code} alert={a} onOpenWizard={onOpenWizard} />)}</div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-green-500/30 bg-green-500/10 text-sm text-green-400" data-testid="dm-health-ok">
          <CheckCircle2 className="w-4 h-4" />All systems normal{health.automations.total === 0 ? " — no automations are active yet." : "."}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={KeyRound} title="Connection" status={connStatus}>
          <KV k="Instagram" v={c.igUsername ? `@${c.igUsername}` : c.connected ? "not linked" : "not connected"} tone={c.igUsername ? "ok" : "bad"} />
          <KV k="Facebook Page" v={c.fbPageName ?? "—"} />
          <KV k="Token" v={
            c.tokenStatus === "not_connected" ? "—"
              : c.tokenStatus === "valid" ? (c.liveCheck ? "valid (verified)" : "valid")
              : c.tokenStatus === "expiring" ? "expiring soon" : c.tokenStatus
          } tone={tokenTone} />
          <KV k="Expires" v={c.tokenExpiresAt ? `${format(new Date(c.tokenExpiresAt), "MMM d, yyyy")}${daysLeft != null ? ` (${daysLeft > 0 ? `${daysLeft}d` : "past"})` : ""}` : "—"} tone={tokenTone} />
          {c.missingScopes.length > 0 && <KV k="Missing" v={c.missingScopes.join(", ")} tone="warn" />}
          {c.connected && c.tokenStatus !== "valid" && (
            <Button size="sm" className="w-full mt-2 gap-1.5" onClick={() => openMetaConnect()}><Instagram className="w-3.5 h-3.5" />Reconnect</Button>
          )}
        </StatCard>

        <StatCard icon={Radio} title="Webhook events" status={whStatus}>
          <KV k="State" v={health.webhook.state === "receiving" ? "receiving" : health.webhook.state === "quiet" ? `quiet > ${health.webhook.quietThresholdDays}d` : "nothing received yet"} tone={health.webhook.state === "receiving" ? "ok" : health.automations.total ? "warn" : undefined} />
          <KV k="Last event" v={ago(health.webhook.lastEventAt)} />
          <KV k="Last DM" v={ago(health.webhook.lastByType.dm)} />
          <KV k="Last comment" v={ago(health.webhook.lastByType.comment)} />
          <KV k="24h / 7d" v={`${health.webhook.events24h} / ${health.webhook.events7d}`} />
        </StatCard>

        <StatCard icon={Zap} title="Active automations" status={health.automations.total ? "ok" : "idle"}>
          {Object.entries(KIND_LABEL).map(([k, label]) => <KV key={k} k={label} v={health.automations.byKind[k] ?? 0} />)}
          {health.automations.total === 0 && onOpenWizard && <Button size="sm" variant="outline" className="w-full mt-2" onClick={onOpenWizard}>Set one up</Button>}
        </StatCard>

        <StatCard icon={Send} title="Sends (24h)" status={sendStatus}>
          <KV k="Delivered" v={health.runs.sent24h} tone={health.runs.sent24h ? "ok" : undefined} />
          <KV k="Failed" v={health.runs.failed24h} tone={health.runs.failed24h ? "bad" : undefined} />
          {health.runs.lastFailure && (
            <div className="pt-1 border-t border-border mt-1">
              <p className="text-red-400 font-semibold">{health.runs.lastFailure.title}{health.runs.lastFailure.code ? ` · code ${health.runs.lastFailure.code}` : ""}</p>
              <p className="text-muted-foreground">{ago(health.runs.lastFailure.at)}</p>
            </div>
          )}
        </StatCard>
      </div>

      {/* Run log */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Recent automation runs</p>
          <span className="text-[11px] text-muted-foreground ml-auto">Trigger → matched → result</span>
        </div>
        {logsLoading ? (
          <div className="p-4 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : !logs?.entries?.length ? (
          <div className="p-8 text-center space-y-2" data-testid="dm-logs-empty">
            <Info className="w-6 h-6 text-muted-foreground/60 mx-auto" />
            <p className="text-sm text-muted-foreground">No Instagram events yet.</p>
            <p className="text-[11px] text-muted-foreground">Comments, DMs and story mentions will appear here as they arrive, with what each automation did.</p>
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="dm-logs">
            {logs.entries.map(e => {
              const Icon = EVENT_ICON[e.eventType] ?? MessageCircle;
              return (
                <div key={e.id} className="px-4 py-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-semibold text-foreground capitalize">{labelEventType(e.eventType)}</span>
                    {e.senderUsername && <span className="text-muted-foreground">@{e.senderUsername}</span>}
                    {e.text && <span className="text-muted-foreground italic truncate">“{e.text}”</span>}
                    <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0" title={e.receivedAt ? format(new Date(e.receivedAt), "PPpp") : ""}>{ago(e.receivedAt)}</span>
                  </div>
                  {e.runs.length === 0 ? (
                    <p className="pl-5 text-muted-foreground">→ No automation matched</p>
                  ) : e.runs.map(r => (
                    <div key={r.id} className="pl-5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground">→ Matched</span>
                        <span className="text-foreground font-medium">{r.automationName ?? KIND_LABEL[r.automationKind] ?? r.automationKind}</span>
                        <span className="text-muted-foreground">→</span>
                        <RunStatus run={r} />
                        {r.errorCode != null && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono text-[10px]">Meta error {r.errorCode}</span>}
                      </div>
                      {r.explanation && (
                        <div className="rounded-lg bg-muted/20 border border-border p-2 space-y-0.5">
                          <p className="text-foreground font-semibold">{r.explanation.title}</p>
                          <p className="text-muted-foreground">{r.explanation.fix}</p>
                          {r.errorMessage && <p className="text-[10px] font-mono text-muted-foreground/70 break-all">{r.errorMessage}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
