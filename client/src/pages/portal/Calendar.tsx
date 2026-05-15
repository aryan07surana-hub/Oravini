import PortalLayout from "./Layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarRange, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek,
} from "date-fns";

const GOLD = "#d4b461";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  cancelled: "#ef4444",
  completed: "#6b7280",
};

function EventDot({ status }: { status: string }) {
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 inline-block" style={{ background: STATUS_COLORS[status] || GOLD }} />;
}

export default function PortalCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/admin/scheduled-bookings"] });
  const { data: callBookings = [] } = useQuery<any[]>({ queryKey: ["/api/call-bookings"] });

  const allEvents = [
    ...bookings.map((b) => ({ ...b, _source: "scheduled" })),
    ...callBookings.map((b) => ({ ...b, _source: "call", scheduledAt: b.scheduledAt || b.requestedAt })),
  ].filter((e) => e.scheduledAt);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsOnDay = (day: Date) => allEvents.filter((e) => isSameDay(new Date(e.scheduledAt), day));
  const selectedEvents = selected ? eventsOnDay(selected) : [];

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarRange className="w-6 h-6" style={{ color: GOLD }} />
              Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{allEvents.length} events total</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const events = eventsOnDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selected && isSameDay(day, selected);
                  const today = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelected(isSameDay(day, selected || new Date("invalid")) ? null : day)}
                      className={`min-h-[72px] p-2 border-b border-r border-border text-left transition-colors hover:bg-accent ${
                        isSelected ? "bg-accent" : ""
                      } ${!isCurrentMonth ? "opacity-30" : ""}`}
                    >
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${today ? "text-black font-bold" : "text-foreground"}`}
                        style={today ? { background: GOLD } : {}}>
                        {format(day, "d")}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {events.slice(0, 3).map((e, i) => (
                          <div key={i} className="flex items-center gap-1 truncate">
                            <EventDot status={e.status} />
                            <span className="text-[9px] text-muted-foreground truncate">{e.title || e.type || "Event"}</span>
                          </div>
                        ))}
                        {events.length > 3 && <span className="text-[9px] text-muted-foreground">+{events.length - 3} more</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] capitalize text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="rounded-xl border border-border bg-card p-4">
              {selected ? (
                <>
                  <p className="font-semibold text-sm mb-3" style={{ color: GOLD }}>{format(selected, "EEEE, MMMM d")}</p>
                  {selectedEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events on this day.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedEvents.map((e, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <EventDot status={e.status} />
                            <p className="text-sm font-medium text-foreground">{e.title || e.type || "Event"}</p>
                          </div>
                          {e.scheduledAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {format(new Date(e.scheduledAt), "h:mm a")}
                            </p>
                          )}
                          {(e.clientName || e.clientEmail) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" /> {e.clientName || e.clientEmail}
                            </p>
                          )}
                          <Badge className={`mt-2 text-[10px] capitalize px-1.5`} style={{ background: `${STATUS_COLORS[e.status]}22`, color: STATUS_COLORS[e.status], border: `1px solid ${STATUS_COLORS[e.status]}44` }}>
                            {e.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarRange className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Click a day to see events</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Upcoming</p>
              {allEvents
                .filter((e) => new Date(e.scheduledAt) >= new Date() && e.status !== "cancelled")
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .slice(0, 5)
                .map((e, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                    <EventDot status={e.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{e.title || e.type || "Event"}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(e.scheduledAt), "MMM d · h:mm a")}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
