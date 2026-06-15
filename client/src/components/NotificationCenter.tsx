import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

const GOLD = "#d4b461";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
  });
  return r.ok ? r.json() : null;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifIcon({ message }: { message: string }) {
  if (/error|fail|issue|problem/i.test(message)) return <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
  if (/success|sent|completed|approved/i.test(message)) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  return <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unread = (notifications || []).filter((n: any) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        <Bell className="w-4 h-4 text-zinc-400" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-black"
            style={{ background: GOLD }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-10 right-0 rounded-2xl border border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ width: 320, maxHeight: 400, background: "#080810" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <p className="text-white text-xs font-black">Notifications</p>
              {unread > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black" style={{ background: `${GOLD}20`, color: GOLD }}>
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllMut.mutate()}
                  title="Mark all read"
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-600">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {[...notifications].sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime()).map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markReadMut.mutate(n.id); }}
                    className={`w-full text-left px-4 py-3 hover:bg-zinc-900/60 transition-colors flex items-start gap-3 ${!n.read ? "bg-zinc-900/30" : ""}`}
                  >
                    <div className="mt-0.5">
                      <NotifIcon message={n.message || ""} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${n.read ? "text-zinc-500" : "text-zinc-300"}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-zinc-700 mt-0.5">{timeAgo(n.created_at || n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: GOLD }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
