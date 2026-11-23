import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import ClientLayout from "@/components/layout/ClientLayout";
import { InstagramSchedulerView, type SchedulerInput, type SchedulerJob } from "@/components/InstagramSchedulerView";
import type { UnifiedStatus } from "@/components/InstagramUnifiedView";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
export default function InstagramScheduler() {
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const key = ["/api/instagram/publishing/jobs", user?.id];
  const queue = useQuery<{ enabled: boolean; jobs: SchedulerJob[] }>({ queryKey: key, enabled: !!user, refetchOnWindowFocus: false, retry: false });
  const connection = useQuery<UnifiedStatus>({ queryKey: ["/api/instagram/unified/status", user?.id], enabled: !!user, refetchOnWindowFocus: false, retry: false });
  const [idempotencyKey, setKey] = useState(() => crypto.randomUUID());
  const action = useMutation({ mutationFn: async (input: { kind: string; draft?: SchedulerInput; id?: string }) => {
    if (input.kind === "connect") {
      const data = await apiRequest("POST", "/api/instagram/unified/connect", { publishing: true });
      const url = new URL(data.authorizationUrl);
      if (url.origin !== "https://www.facebook.com" || url.pathname !== "/dialog/oauth") throw new Error("Invalid login URL");
      window.location.assign(url.href); return;
    }
    if (input.kind === "cancel") return apiRequest("POST", `/api/instagram/publishing/jobs/${input.id}/cancel`, {});
    const r = await fetch("/api/instagram/publishing/jobs", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input.draft) });
    const body = await r.json(); if (!r.ok) throw new Error(body.error || "publishing_unavailable");
    setKey(crypto.randomUUID()); return body;
  }, onSuccess: async (_r, input) => { setNotice(input.kind === "cancel" ? "Schedule cancelled. Nothing was deleted from Instagram." : input.kind === "schedule" ? "Post added to your publishing queue." : ""); await queryClient.invalidateQueries({ queryKey: key }); } });
  const error: any = action.error || queue.error || connection.error;
  return <ClientLayout><InstagramSchedulerView accounts={connection.data?.accounts || []} jobs={queue.data?.jobs || []} enabled={queue.data?.enabled || false} busy={action.isPending} error={error ? String(error.message || "Could not load publishing queue").replaceAll("_", " ") : undefined} notice={notice} onConnect={() => action.mutate({ kind: "connect" })} onSchedule={draft => action.mutate({ kind: "schedule", draft })} onCancel={id => action.mutate({ kind: "cancel", id })} /></ClientLayout>;
}
