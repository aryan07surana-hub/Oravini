import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, ChevronLeft, ChevronRight, Phone, Clock, User, CalendarPlus, Video } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isSameMonth, isToday } from "date-fns";

type CalEvent = {
  id: string;
  title: string;
  date: Date;
  type: "call" | "booking" | "self_booking";
  clientName?: string;
  clientEmail?: string;
  time?: string;
  status?: string;
  raw?: any;
};

export default function AdminCalendar() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const { data: callFeedbacks = [], isLoading: cfLoading } = useQuery<any[]>({
    queryKey: ["/api/call-feedback/all"],
  });

  const { data: callBookings = [], isLoading: cbLoading } = useQuery<any[]>({
    queryKey: ["/api/call-bookings"],
  });

  const { data: scheduledBookings = [], isLoading: sbLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/scheduled-bookings"],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = cfLoading || cbLoading || sbLoading;

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/scheduled-bookings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] });
      setSelectedEvent(null);
      toast({ title: "Booking updated" });
    },
  });

  const events: CalEvent[] = [
    ...callFeedbacks.map((cf: any) => ({
      id: cf.id,
      title: cf.title,
      date: new Date(cf.callDate),
      type: "call" as const,
      clientName: clients.find((c: any) => c.id === cf.clientId)?.name || "Unknown Client",
      time: format(new Date(cf.callDate), "h:mm a"),
      status: "completed",
    })),
    ...callBookings.map((cb: any) => ({
      id: cb.id,
      title: `Call with ${cb.inviteeName}`,
      date: new Date(cb.startTime),
      type: "booking" as const,
      clientName: cb.client?.name || cb.inviteeName,
      clientEmail: cb.inviteeEmail,
      time: format(new Date(cb.startTime), "h:mm a"),
      status: cb.status,
      raw: cb,
    })),
    ...scheduledBookings.map((sb: any) => ({
      id: sb.id,
      title: sb.meetingType?.title ? `${sb.meetingType.title} w/ ${sb.clientName}` : `Meeting w/ ${sb.clientName}`,
      date: new Date(sb.startTime),
      type: "self_booking" as const,
      clientName: sb.clientName,
      clientEmail: sb.clientEmail,
      time: format(new Date(sb.startTime), "h:mm a"),
      status: sb.status,
      raw: sb,
    })),
  ];

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = getDay(start);

  const selectedDayEvents = selectedDay
    ? events.filter(e => isSameDay(e.date, selectedDay))
    : [];

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(e.date, day));

  const eventTypeColor = (type: string, status?: string) => {
    if (type === "self_booking") return status === "cancelled" ? "bg-red-500" : "bg-emerald-500";
    if (type === "booking") return status === "canceled" ? "bg-red-500" : "bg-primary";
    if (type === "call") return "bg-blue-500";
    return "bg-purple-500";
  };

  const eventTypeBadge = (type: string) => {
    if (type === "self_booking") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (type === "booking") return "bg-primary/10 text-primary border-primary/20";
    if (type === "call") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  };

  const eventTypeLabel = (type: string) => {
    if (type === "self_booking") return "Self-Hosted Booking";
    if (type === "booking") return "Calendly Booking";
    return "Call Record";
  };

  const monthEvents = events.filter(e => isSameMonth(e.date, currentMonth));
  const upcomingBookings = callBookings.filter((b: any) => b.status === "scheduled" && new Date(b.startTime) >= new Date());
  const upcomingSelfBookings = scheduledBookings.filter((b: any) => b.status === "scheduled" && new Date(b.startTime) >= new Date());

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground text-sm mt-1">Scheduled calls, client bookings, and content activity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(d => subMonths(d, 1))} data-testid="button-prev-month">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(new Date())} data-testid="button-today">
                      <span className="text-xs">Today</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(d => addMonths(d, 1))} data-testid="button-next-month">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-7 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
                  {days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const isTodayDay = isToday(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        data-testid={`cal-day-${format(day, "d")}`}
                        className={`relative min-h-[52px] p-1.5 rounded-lg text-left transition-all ${
                          isSelected ? "bg-primary text-primary-foreground" :
                          isTodayDay ? "bg-primary/10 border border-primary/30" :
                          "hover:bg-accent"
                        }`}
                      >
                        <span className={`text-xs font-semibold block mb-1 ${isSelected ? "text-primary-foreground" : isTodayDay ? "text-primary" : "text-foreground"}`}>
                          {format(day, "d")}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {dayEvents.slice(0, 2).map(ev => (
                            <div key={ev.id} className={`w-full h-1.5 rounded-full ${eventTypeColor(ev.type, ev.status)}`} />
                          ))}
                          {dayEvents.length > 2 && (
                            <span className={`text-[9px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>+{dayEvents.length - 2}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-xs text-muted-foreground">Self-Hosted</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Calendly</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-muted-foreground">Call Record</span></div>
                </div>
              </CardContent>
            </Card>

            {upcomingSelfBookings.length > 0 && (
              <Card className="border border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-400" /> Upcoming Self-Hosted Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoading ? Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />) :
                    upcomingSelfBookings.slice(0, 5).map((b: any) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl cursor-pointer hover:bg-muted/20"
                        data-testid={`self-booking-${b.id}`}
                        onClick={() => setSelectedEvent({
                          id: b.id, title: b.meetingType?.title || "Meeting", date: new Date(b.startTime),
                          type: "self_booking", clientName: b.clientName, clientEmail: b.clientEmail,
                          time: format(new Date(b.startTime), "h:mm a"), status: b.status, raw: b,
                        })}
                      >
                        <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Video className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{b.clientName}</p>
                          <p className="text-xs text-muted-foreground">{b.meetingType?.title || "Meeting"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-foreground">{format(new Date(b.startTime), "MMM d")}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(b.startTime), "h:mm a")}</p>
                        </div>
                        <Badge className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">Scheduled</Badge>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            )}

            {upcomingBookings.length > 0 && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" /> Upcoming Calendly Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoading ? Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />) :
                    upcomingBookings.slice(0, 5).map((b: any) => (
                      <div key={b.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl" data-testid={`booking-${b.id}`}>
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CalendarPlus className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{b.inviteeName}</p>
                          <p className="text-xs text-muted-foreground">{b.inviteeEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-foreground">{format(new Date(b.startTime), "MMM d")}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(b.startTime), "h:mm a")}</p>
                        </div>
                        <Badge className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">Scheduled</Badge>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {selectedDay ? format(selectedDay, "EEEE, MMMM d") : "Select a day"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-xs text-muted-foreground">No events on this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map(ev => (
                      <div
                        key={ev.id}
                        data-testid={`event-${ev.id}`}
                        className={`p-3 bg-card border border-card-border rounded-xl ${ev.type === "self_booking" ? "cursor-pointer hover:bg-muted/20" : ""}`}
                        onClick={() => ev.type === "self_booking" && setSelectedEvent(ev)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ev.type === "self_booking" ? "bg-emerald-500/10" : ev.type === "booking" ? "bg-primary/10" : "bg-blue-500/10"}`}>
                            {ev.type === "self_booking" ? <Video className="w-4 h-4 text-emerald-400" /> :
                             ev.type === "booking" ? <CalendarPlus className="w-4 h-4 text-primary" /> :
                             <Phone className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground leading-tight">{ev.title}</p>
                            {ev.clientName && <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><User className="w-2.5 h-2.5" />{ev.clientName}</p>}
                            {ev.time && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" />{ev.time}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`text-[9px] border ${eventTypeBadge(ev.type)}`}>
                            {eventTypeLabel(ev.type)}
                          </Badge>
                          {ev.status && ev.status !== "completed" && (
                            <Badge variant="outline" className={`text-[9px] border ${ev.status === "scheduled" ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}`}>
                              {ev.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{format(currentMonth, "MMMM")} Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-muted-foreground">Self-Hosted</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{monthEvents.filter(e => e.type === "self_booking").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        <span className="text-xs text-muted-foreground">Calendly Bookings</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{monthEvents.filter(e => e.type === "booking").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-xs text-muted-foreground">Call Records</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{monthEvents.filter(e => e.type === "call").length}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs font-semibold text-muted-foreground">Total Events</span>
                      <span className="text-sm font-bold text-primary">{monthEvents.length}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Self-hosted booking detail dialog */}
      {selectedEvent && selectedEvent.type === "self_booking" && (
        <Dialog open onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Meeting</span>
                  <span className="text-sm font-medium text-foreground">{selectedEvent.raw?.meetingType?.title || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Client</span>
                  <span className="text-sm font-medium text-foreground">{selectedEvent.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Email</span>
                  <span className="text-sm text-foreground">{selectedEvent.clientEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Start</span>
                  <span className="text-sm text-foreground">{format(new Date(selectedEvent.raw.startTime), "PPpp")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">End</span>
                  <span className="text-sm text-foreground">{format(new Date(selectedEvent.raw.endTime), "h:mm a")}</span>
                </div>
                {selectedEvent.raw?.notes && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-24">Notes</span>
                    <span className="text-sm text-foreground flex-1">{selectedEvent.raw.notes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Status</span>
                  <Badge variant="outline" className={`text-[10px] ${selectedEvent.status === "scheduled" ? "border-green-500/30 text-green-400" : selectedEvent.status === "cancelled" ? "border-red-500/30 text-red-400" : "border-muted text-muted-foreground"}`}>
                    {selectedEvent.status}
                  </Badge>
                </div>
              </div>
              {selectedEvent.status === "scheduled" && (
                <div className="flex gap-2">
                  <Button
                    data-testid="btn-cancel-booking"
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    disabled={updateBookingMutation.isPending}
                    onClick={() => updateBookingMutation.mutate({ id: selectedEvent.id, data: { status: "cancelled" } })}
                  >
                    Cancel
                  </Button>
                  <Button
                    data-testid="btn-complete-booking"
                    className="flex-1 font-semibold"
                    style={{ background: "#d4b461", color: "#000" }}
                    disabled={updateBookingMutation.isPending}
                    onClick={() => updateBookingMutation.mutate({ id: selectedEvent.id, data: { status: "completed" } })}
                  >
                    Mark Complete
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
