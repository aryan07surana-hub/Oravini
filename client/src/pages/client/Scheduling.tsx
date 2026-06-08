import { useState, useEffect } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";
import {
  Calendar, Clock, Video, Link2, CheckCircle2, CalendarPlus,
  ExternalLink, Copy, CheckCheck, Phone, Ban, ArrowRight, Crown,
  Sparkles, Users, TrendingUp, Zap
} from "lucide-react";
import { format, isBefore, isToday, isSameDay } from "date-fns";

const GOLD = "#d4b461";

/* ─── Google Calendar Widget ────────────────────────────────── */
function GoogleCalendarWidget({ calStatus, onConnect, onDisconnect, disconnecting }: {
  calStatus?: { connected: boolean; email: string | null };
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  if (calStatus?.connected) {
    return (
      <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/15">
          <SiGoogle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">Google Calendar & Meet</p>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Connected</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Auto-generates unique Google Meet links · <span className="text-emerald-400/70">{calStatus.email ?? ""}</span></p>
        </div>
        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 gap-1.5 flex-shrink-0" onClick={onDisconnect} disabled={disconnecting}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-800">
          <SiGoogle className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">Google Calendar & Meet</p>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">Not connected</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Connect to auto-create Google Meet links for every booking</p>
        </div>
        <Button size="sm" className="gap-1.5 font-bold" style={{ background: GOLD, color: "#000" }} onClick={onConnect}>
          <SiGoogle className="w-3.5 h-3.5" /> Connect
        </Button>
      </div>
    </div>
  );
}

/* ─── Booking Card ─────────────────────────────────────────── */
function BookingCard({ booking, onClick }: { booking: any; onClick: () => void }) {
  const isPast = new Date(booking.startTime) < new Date();
  const statusColor = booking.status === "cancelled" ? "text-red-400 border-red-500/30" :
    booking.status === "completed" ? "text-zinc-400 border-zinc-500/30" :
    !isPast ? "text-emerald-400 border-emerald-500/30" : "text-zinc-500 border-zinc-600/30";

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition-colors cursor-pointer group"
    >
      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${booking.status === "cancelled" ? "bg-red-500/60" : isPast ? "bg-zinc-600" : "bg-emerald-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-white">{booking.meetingType || "Strategy Call"}</p>
          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
            {booking.status === "scheduled" && isPast ? "past" : booking.status}
          </Badge>
          {booking.meetLink && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">Meet</Badge>}
        </div>
        <p className="text-xs text-zinc-500">with {booking.coachName || "Your Coach"}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-semibold text-white">{format(new Date(booking.startTime), "MMM d, yyyy")}</p>
        <p className="text-xs text-zinc-500">{format(new Date(booking.startTime), "h:mm a")}</p>
      </div>
      {booking.status === "scheduled" && !isPast && booking.meetLink && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] border-emerald-700/40 text-emerald-400 gap-1"
          onClick={(e) => { e.stopPropagation(); window.open(booking.meetLink, "_blank"); }}
        >
          <Video className="w-3 h-3" /> Join
        </Button>
      )}
    </div>
  );
}

/* ─── Booking Detail Dialog ─────────────────────────────────── */
function BookingDetailDialog({ booking, open, onClose, onAction }: {
  booking: any;
  open: boolean;
  onClose: () => void;
  onAction: (id: string, status: string) => void;
}) {
  if (!booking) return null;
  const isPast = new Date(booking.startTime) < new Date();
  const statusColor = booking.status === "cancelled" ? "text-red-400" :
    booking.status === "completed" ? "text-zinc-400" : "text-emerald-400";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Phone className="w-4 h-4" style={{ color: GOLD }} />
            Booking Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Meeting info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{booking.meetingType || "Strategy Call"}</p>
              <Badge variant="outline" className={`text-[10px] ${statusColor} border-current/30`}>
                {booking.status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">with {booking.coachName || "Your Coach"}</p>
          </div>

          {/* Time */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Calendar className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="font-semibold text-white">{format(new Date(booking.startTime), "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="text-white">{format(new Date(booking.startTime), "h:mm a")} — {format(new Date(booking.endTime), "h:mm a")}</span>
              <span className="text-zinc-600">({Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000)} min)</span>
            </div>
          </div>

          {/* Meet link */}
          {booking.meetLink && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Google Meet</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={booking.meetLink} target="_blank" rel="noreferrer" className="text-xs text-zinc-300 hover:text-white underline truncate flex-1">
                  {booking.meetLink}
                </a>
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-emerald-700/40 text-emerald-400 hover:bg-emerald-500/10" onClick={() => navigator.clipboard.writeText(booking.meetLink)}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          {booking.status === "scheduled" && !isPast && (
            <div className="flex gap-2 pt-2">
              {booking.meetLink && (
                <Button size="sm" className="flex-1 gap-1.5 font-bold" style={{ background: GOLD, color: "#000" }} onClick={() => window.open(booking.meetLink, "_blank")}>
                  <Video className="w-3.5 h-3.5" /> Join Meet
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1.5 border-red-700/40 text-red-400" onClick={() => { onAction(booking.id, "cancelled"); onClose(); }}>
                <Ban className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function ClientScheduling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingFilter, setBookingFilter] = useState<"upcoming" | "all">("upcoming");

  // Check user tier
  const userPlan = (user as any)?.plan || "free";
  const tierNumber = userPlan === "growth" ? 3 : userPlan === "pro" ? 4 : userPlan === "elite" ? 5 : 0;
  const hasAccess = tierNumber >= 3;

  // Handle OAuth return params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cal_connected")) {
      toast({ title: "Google Calendar connected!", description: "New bookings will automatically create unique Google Meet links." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-calendar/status"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("cal_error")) {
      toast({ title: "Connection failed", description: params.get("cal_error") ?? "Unknown error", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Queries
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/client/my-bookings"],
    enabled: hasAccess,
  });

  const { data: calStatus } = useQuery<{ connected: boolean; email: string | null }>({
    queryKey: ["/api/admin/google-calendar/status"],
    enabled: hasAccess,
  });

  const disconnectCalMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/google-calendar/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-calendar/status"] });
      toast({ title: "Google Calendar disconnected" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/client/bookings/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/my-bookings"] });
      toast({ title: "Booking updated" });
    },
  });

  const upcomingBookings = bookings.filter((b: any) => b.status === "scheduled" && new Date(b.startTime) > new Date());
  const displayBookings = bookingFilter === "upcoming" ? upcomingBookings : bookings;
  const nextBooking = upcomingBookings.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  // Tier-specific settings
  const tierConfig = {
    3: {
      name: "Tier 3 · Growth",
      color: "#d4b461",
      duration: "Flexible",
      features: ["Google Meet links", "Email reminders", "Flexible scheduling"],
    },
    4: {
      name: "Tier 4 · Pro",
      color: "#34d399",
      duration: "Flexible",
      features: ["Google Meet links", "Email reminders", "Priority support"],
    },
    5: {
      name: "Tier 5 · Elite",
      color: "#d4b461",
      duration: "Flexible",
      features: ["Google Meet links", "Email reminders", "VIP scheduling", "Concierge support"],
    },
  };

  const config = tierConfig[tierNumber as 3 | 4 | 5] || null;

  if (!hasAccess) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
            <Crown className="w-12 h-12 mx-auto mb-4" style={{ color: GOLD }} />
            <h2 className="text-xl font-bold text-white mb-2">Scheduling Available for Tier 3+</h2>
            <p className="text-zinc-400 mb-6">Upgrade to Tier 3 or higher to access personal scheduling with Google Calendar integration and coaching calls.</p>
            <Button className="font-bold" style={{ background: GOLD, color: "#000" }} onClick={() => window.location.href = "/settings/plan"}>
              <Sparkles className="w-4 h-4 mr-2" /> Upgrade Now
            </Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Scheduling</h1>
            <p className="text-sm text-zinc-400 mt-1">{config?.name} • {config?.duration} scheduling</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-0" style={{ background: `${config?.color}20`, color: config?.color }}>
              <Crown className="w-3 h-3 mr-1" /> {config?.name}
            </Badge>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" style={{ color: GOLD }} />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Upcoming</span>
            </div>
            <p className="text-2xl font-black text-white">{upcomingBookings.length}</p>
            <p className="text-[10px] text-zinc-600">scheduled calls</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Total</span>
            </div>
            <p className="text-2xl font-black text-white">{bookings.length}</p>
            <p className="text-[10px] text-zinc-600">all time</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Next Call</span>
            </div>
            {nextBooking ? (
              <>
                <p className="text-sm font-bold text-white truncate">{format(new Date(nextBooking.startTime), "MMM d")}</p>
                <p className="text-[10px] text-zinc-500">{format(new Date(nextBooking.startTime), "h:mm a")}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-600">No upcoming</p>
            )}
          </div>
        </div>

        {/* Tier Configuration */}
        {config && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${config.color}18` }}>
                <Users className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{config.name} Scheduling</h3>
                <p className="text-sm text-zinc-500">{config.duration} scheduling</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Features</p>
                <div className="space-y-2">
                  {config.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Availability</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50">
                    <span className="text-xs text-zinc-400">Scheduling</span>
                    <Badge className="bg-zinc-800 text-white border-zinc-700">Flexible</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50">
                    <span className="text-xs text-zinc-400">Meeting Type</span>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Google Meet</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Calendar Integration */}
        <GoogleCalendarWidget
          calStatus={calStatus}
          onConnect={() => { window.location.href = "/api/auth/google-calendar"; }}
          onDisconnect={() => disconnectCalMutation.mutate()}
          disconnecting={disconnectCalMutation.isPending}
        />

        {/* Book a Call CTA */}
        {tierNumber === 5 && (
          <a
            href="https://calendly.com/brandversee/30min"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-5 p-5 rounded-2xl hover:opacity-90 transition-opacity group"
            style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #b89848 100%)` }}
          >
            <div className="w-10 h-10 bg-black/15 rounded-xl flex items-center justify-center shrink-0">
              <CalendarPlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-black">Book Your Next Call</p>
              <p className="text-xs text-black/70 mt-0.5">Schedule a strategy session with your coach</p>
            </div>
            <div className="flex items-center gap-2 bg-black/15 rounded-lg px-4 py-2 shrink-0 group-hover:bg-black/25 transition-colors">
              <span className="text-sm font-bold text-black">Book Now</span>
              <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>
        )}

        {/* Bookings List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" /> My Bookings
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{upcomingBookings.length} upcoming</Badge>
            </h2>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {(["upcoming", "all"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className="text-[11px] px-3 py-1 rounded-lg font-medium transition-colors capitalize"
                  style={{ background: bookingFilter === f ? GOLD : "transparent", color: bookingFilter === f ? "#000" : "#71717a" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {bookingsLoading ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-zinc-900/50 animate-pulse" />
              ))}
            </div>
          ) : displayBookings.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-14 text-center">
              <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium">No {bookingFilter === "upcoming" ? "upcoming" : ""} bookings</p>
              <p className="text-zinc-600 text-xs mt-1">Your coach will schedule calls for you</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayBookings.map((booking: any) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onClick={() => setSelectedBooking(booking)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Need Help?</p>
          <p className="text-sm text-zinc-300 mb-3">
            Your coach will reach out to schedule your calls. If you need to reschedule or have questions, contact your coach directly.
          </p>
          {tierNumber === 5 && (
            <a href="https://calendly.com/brandversee/30min" target="_blank" rel="noreferrer">
              <Button size="sm" className="gap-2 font-bold" style={{ background: GOLD, color: "#000" }}>
                <CalendarPlus className="w-3.5 h-3.5" /> Book a Strategy Call
              </Button>
            </a>
          )}
        </div>

        {/* Booking Detail Dialog */}
        <BookingDetailDialog
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onAction={(id, status) => updateBookingMutation.mutate({ id, status })}
        />

      </div>
    </ClientLayout>
  );
}
