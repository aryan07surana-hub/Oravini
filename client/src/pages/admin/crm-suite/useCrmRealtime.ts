import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

/**
 * Subscribe to /ws and invalidate React Query caches whenever the server emits
 * a CRM event. Multiple admins see updates without page refresh.
 *
 * The connection is shared with the chat WebSocket — we just listen for
 * `type: "crm_event"` payloads and ignore the rest.
 */
export function useCrmRealtime() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    let ws: WebSocket | null = null;
    let closed = false;
    let retryTimer: any = null;

    const connect = () => {
      ws = new WebSocket(`${proto}//${window.location.host}/ws?userId=${user.id}`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type !== "crm_event") return;
          const e = data.event;
          // Coarse-grained invalidation — keeps the implementation simple and
          // good enough for an admin-only tool.
          if (!e?.kind) return;
          const k = String(e.kind);
          if (k.startsWith("contact"))     queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
          if (k.startsWith("opportunity")) queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/opportunities"] });
          if (k.startsWith("task"))        queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tasks"] });
          if (k.startsWith("activity"))    queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
          if (k.startsWith("stage") || k.startsWith("pipeline")) {
            queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/pipelines"] });
            queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/opportunities"] });
          }
          if (k.startsWith("tag")) queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tags"] });
          // Always nudge dashboard
          queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/smart-lists"] });
        } catch { /* ignore non-JSON or partial */ }
      };
      ws.onclose = () => {
        if (closed) return;
        retryTimer = setTimeout(connect, 2500);
      };
      ws.onerror = () => { try { ws?.close(); } catch {} };
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      try { ws?.close(); } catch {}
    };
  }, [user?.id]);
}
