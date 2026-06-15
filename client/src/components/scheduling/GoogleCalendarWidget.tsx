import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiGoogle } from "react-icons/si";
import { Video, Unlink } from "lucide-react";

const GOLD = "#d4b461";

interface GoogleCalendarWidgetProps {
  calStatus: { connected: boolean; email: string | null } | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}

export function GoogleCalendarWidget({
  calStatus,
  onConnect,
  onDisconnect,
  disconnecting,
}: GoogleCalendarWidgetProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#4285F412" }}
          >
            <SiGoogle className="w-5 h-5" style={{ color: "#4285F4" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Google Calendar</p>
            {calStatus?.connected ? (
              <p className="text-xs text-zinc-500">{calStatus.email}</p>
            ) : (
              <p className="text-xs text-zinc-500">Not connected</p>
            )}
          </div>
        </div>
        <Badge
          className={
            calStatus?.connected
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "border-zinc-700 text-zinc-500"
          }
          variant="outline"
        >
          {calStatus?.connected ? "Connected" : "Not connected"}
        </Badge>
      </div>

      <div className="p-5 space-y-4">
        {calStatus?.connected ? (
          <>
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">
                  Google Meet Integration Active
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                New bookings will automatically generate unique Google Meet links and
                create calendar events.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="w-full border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-700/40 gap-2"
            >
              <Unlink className="w-4 h-4" />
              {disconnecting ? "Disconnecting..." : "Disconnect Google Calendar"}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${GOLD}20` }}
                >
                  <span className="text-xs font-bold" style={{ color: GOLD }}>1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Auto-generate Google Meet links</p>
                  <p className="text-xs text-zinc-500">Every booking gets a unique video call link</p>
                </div>
              </div>
            </div>

            <Button
              onClick={onConnect}
              className="w-full font-bold gap-2"
              style={{ background: "#4285F4", color: "#fff" }}
            >
              <SiGoogle className="w-4 h-4" />
              Connect Google Calendar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
