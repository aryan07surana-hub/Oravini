import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";
import {
  Copy, CheckCheck, Link2, Clock, ExternalLink, Settings2,
  CalendarDays, Video, ChevronRight, ChevronLeft, Calendar,
  Ban, CheckCircle2, Plus, Trash2, GripVertical, Globe,
  HelpCircle, Unlink, Users, TrendingUp, Phone,
  X, ArrowRight, Eye, VideoIcon,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays,
  isSameDay, isToday, isBefore, startOfDay, parseISO,
} from "date-fns";

const GOLD = "#d4b461";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATIONS = [15, 20, 30, 45, 60, 90];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
  { value: "America/Chicago", label: "Central Time (CST/CDT)" },
  { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKST/AKDT)" },
  { value: "America/Toronto", label: "Eastern — Toronto" },
  { value: "America/Vancouver", label: "Pacific — Vancouver" },
  { value: "America/Sao_Paulo", label: "Brasília Time (BRT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST/CDT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST/NZDT)" },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tzOffset(tz: string) {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value ?? tz;
  } catch { return tz; }
}

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/* ─── Types ─────────────────────────────────────────────────── */
type AvailRule = { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean };
export type CustomQuestion = { id: string; label: string; required: boolean };
type TabType = "calendar" | "bookings" | "settings" | "availability" | "ta3" | "ta4" | "ta5";

/* ─── Weekly Calendar View ──────────────────────────────────── */
function WeeklyCalendar({ bookings, weekStart, onPrev, onNext, onBookingClick, onSlotClick }: {
  bookings: any[];
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onBookingClick: (b: any) => void;
  onSlotClick: (date: Date, hour: number) => void;
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const visibleHours = HOURS.filter(h => h >= 7 && h <= 21); // 7 AM to 9 PM

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <button onClick={onPrev} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-white">
          {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </h3>
        <button onClick={onNext} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-800">
        <div className="p-2" />
        {weekDays.map(day => (
          <div key={day.toISOString()} className={`p-2 text-center border-l border-zinc-800 ${isToday(day) ? "bg-yellow-500/5" : ""}`}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">{format(day, "EEE")}</p>
            <p className={`text-lg font-bold ${isToday(day) ? "text-yellow-500" : "text-white"}`}>{format(day, "d")}</p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[520px] overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {visibleHours.map(hour => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="h-14 flex items-start justify-end pr-2 pt-1 border-b border-zinc-800/50">
                <span className="text-[10px] text-zinc-600 font-medium">{formatHour(hour)}</span>
              </div>
              {/* Day cells */}
              {weekDays.map(day => {
                const dayBookings = bookings.filter(b => {
                  const bStart = new Date(b.startTime);
                  return isSameDay(bStart, day) && bStart.getHours() === hour;
                });
                const isPast = isBefore(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour), new Date());

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`h-14 border-l border-b border-zinc-800/50 relative group cursor-pointer transition-colors ${isPast ? "bg-zinc-950" : "hover:bg-zinc-900/50"} ${isToday(day) ? "bg-yellow-500/[0.02]" : ""}`}
                    onClick={() => !isPast && onSlotClick(day, hour)}
                  >
                    {/* Booking blocks */}
                    {dayBookings.map(b => {
                      const bStart = new Date(b.startTime);
                      const bEnd = new Date(b.endTime);
                      const durationMins = (bEnd.getTime() - bStart.getTime()) / 60000;
                      const heightPx = Math.min((durationMins / 60) * 56, 112); // max 2 rows
                      const topOffset = (bStart.getMinutes() / 60) * 56;
                      const statusColor = b.status === "cancelled" ? "bg-red-500/20 border-red-500/40" :
                        b.status === "completed" ? "bg-zinc-700/30 border-zinc-600/40" :
                        "bg-emerald-500/15 border-emerald-500/40";

                      return (
                        <div
                          key={b.id}
                          onClick={(e) => { e.stopPropagation(); onBookingClick(b); }}
                          className={`absolute left-0.5 right-0.5 rounded-lg border px-1.5 py-0.5 overflow-hidden cursor-pointer hover:brightness-125 transition-all z-10 ${statusColor}`}
                          style={{ top: `${topOffset}px`, height: `${heightPx}px`, minHeight: "20px" }}
                        >
                          <p className="text-[10px] font-bold text-white truncate">{b.clientName}</p>
                          <p className="text-[9px] text-zinc-400 truncate">{format(bStart, "h:mm a")}</p>
                        </div>
                      );
                    })}

                    {/* Hover indicator */}
                    {!isPast && dayBookings.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3 h-3 text-zinc-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
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
          {/* Client info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{booking.clientName}</p>
              <Badge variant="outline" className={`text-[10px] ${statusColor} border-current/30`}>
                {booking.status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">{booking.clientEmail}</p>
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
                <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
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
          {booking.status === "scheduled" && (
            <div className="flex gap-2 pt-2">
              {booking.meetLink && (
                <Button size="sm" className="flex-1 gap-1.5 font-bold" style={{ background: GOLD, color: "#000" }} onClick={() => window.open(booking.meetLink, "_blank")}>
                  <VideoIcon className="w-3.5 h-3.5" /> Join Meet
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-emerald-700/40 text-emerald-400" onClick={() => { onAction(booking.id, "completed"); onClose(); }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </Button>
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

/* ─── Create Booking Dialog ─────────────────────────────────── */
function CreateBookingDialog({ open, onClose, meetingType, prefillDate, prefillHour }: {
  open: boolean;
  onClose: () => void;
  meetingType: any;
  prefillDate?: Date;
  prefillHour?: number;
}) {
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [date, setDate] = useState(prefillDate ? format(prefillDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(prefillHour !== undefined ? `${String(prefillHour).padStart(2, "0")}:00` : "09:00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (prefillDate) setDate(format(prefillDate, "yyyy-MM-dd"));
    if (prefillHour !== undefined) setTime(`${String(prefillHour).padStart(2, "0")}:00`);
  }, [prefillDate, prefillHour]);

  const createMutation = useMutation({
    mutationFn: () => {
      const startTime = new Date(`${date}T${time}:00`);
      return apiRequest("POST", "/api/admin/scheduled-bookings", {
        meetingTypeId: meetingType?.id,
        clientName,
        clientEmail,
        startTime: startTime.toISOString(),
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] });
      toast({ title: "Booking created!", description: "Confirmation email sent to client with Google Meet link." });
      onClose();
      setClientName(""); setClientEmail(""); setNotes("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="w-4 h-4" style={{ color: GOLD }} />
            Create Booking
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client Name</label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" className="bg-zinc-900 border-zinc-700 text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client Email</label>
            <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="john@example.com" type="email" className="bg-zinc-900 border-zinc-700 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
          </div>
          {meetingType && (
            <p className="text-xs text-zinc-500">Duration: {meetingType.duration} min · Ends at {(() => {
              const [h, m] = time.split(":").map(Number);
              const endMin = h * 60 + m + meetingType.duration;
              return `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
            })()}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for this call..." rows={2} className="bg-zinc-900 border-zinc-700 text-white resize-none" />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
            <p className="text-[11px] text-zinc-500">
              <span className="text-emerald-400 font-semibold">✓</span> Confirmation email will be sent to the client<br/>
              <span className="text-emerald-400 font-semibold">✓</span> Google Meet link auto-generated (if connected)<br/>
              <span className="text-emerald-400 font-semibold">✓</span> 24h and 1h reminders will be sent automatically
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-zinc-700" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!clientName.trim() || !clientEmail.trim() || createMutation.isPending}
              className="flex-1 font-bold"
              style={{ background: GOLD, color: "#000" }}
            >
              {createMutation.isPending ? "Creating…" : "Create Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

/* ─── Availability Row (multi-block) ───────────────────────── */
function AvailRow({ rule, onChange }: { rule: AvailRule; onChange: (r: AvailRule) => void }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${rule.isEnabled ? "bg-zinc-900 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/50"}`}>
      <Switch checked={rule.isEnabled} onCheckedChange={v => onChange({ ...rule, isEnabled: v })} />
      <span className={`text-sm font-semibold w-24 ${rule.isEnabled ? "text-white" : "text-zinc-500"}`}>{DAYS[rule.dayOfWeek]}</span>
      {rule.isEnabled ? (
        <div className="flex items-center gap-2 flex-1">
          <Input type="time" value={rule.startTime} onChange={e => onChange({ ...rule, startTime: e.target.value })} className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white" />
          <span className="text-zinc-500 text-xs">to</span>
          <Input type="time" value={rule.endTime} onChange={e => onChange({ ...rule, endTime: e.target.value })} className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white" />
          <span className="text-xs text-zinc-500 ml-1">
            {(() => {
              const [sh, sm] = rule.startTime.split(":").map(Number);
              const [eh, em] = rule.endTime.split(":").map(Number);
              const mins = (eh * 60 + em) - (sh * 60 + sm);
              return mins > 0 ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}` : "";
            })()}
          </span>
        </div>
      ) : (
        <span className="text-xs text-zinc-600">Unavailable</span>
      )}
    </div>
  );
}

/* ─── Calendar & Meeting Platform Integration ────────────────── */
function CalendarIntegrationWidget({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data: integrations } = useQuery<any>({
    queryKey: ["/api/admin/calendar-integrations"],
    staleTime: 30000,
  });

  const calendarProviders = [
    { id: "google", name: "Google Calendar", icon: SiGoogle, color: "#4285F4", connected: integrations?.google?.connected || false, email: integrations?.google?.email },
    { id: "outlook", name: "Outlook Calendar", icon: Calendar, color: "#0078D4", connected: integrations?.outlook?.connected || false, email: integrations?.outlook?.email },
    { id: "apple", name: "Apple Calendar", icon: Calendar, color: "#000000", connected: integrations?.apple?.connected || false, email: integrations?.apple?.email },
  ];

  const meetingPlatforms = [
    { id: "google-meet", name: "Google Meet", icon: Video, color: "#00897B", connected: integrations?.googleMeet?.connected || false },
    { id: "zoom", name: "Zoom", icon: Video, color: "#2D8CFF", connected: integrations?.zoom?.connected || false },
    { id: "teams", name: "Microsoft Teams", icon: Users, color: "#505AC9", connected: integrations?.teams?.connected || false },
  ];

  const connectedCalendars = calendarProviders.filter(p => p.connected).length;
  const connectedMeetings = meetingPlatforms.filter(p => p.connected).length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Calendar & Meeting Integration</p>
          <p className="text-xs text-zinc-500 mt-0.5">{connectedCalendars} calendar{connectedCalendars !== 1 ? 's' : ''} · {connectedMeetings} meeting platform{connectedMeetings !== 1 ? 's' : ''} connected</p>
        </div>
        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 gap-1.5" onClick={onOpenSettings}>
          <Settings2 className="w-3.5 h-3.5" /> Configure
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {/* Calendar Providers */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Calendar Providers</p>
          <div className="grid gap-2">
            {calendarProviders.map(provider => {
              const Icon = provider.icon;
              return (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-3 rounded-xl transition-all"
                  style={{
                    background: provider.connected ? `${provider.color}12` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${provider.connected ? `${provider.color}35` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: provider.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{provider.name}</p>
                      {provider.connected && provider.email && (
                        <p className="text-xs text-zinc-500">{provider.email}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={provider.connected ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "border-zinc-700 text-zinc-500"} variant="outline">
                    {provider.connected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meeting Platforms */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Meeting Platforms</p>
          <div className="grid gap-2">
            {meetingPlatforms.map(platform => {
              const Icon = platform.icon;
              return (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-3 rounded-xl transition-all"
                  style={{
                    background: platform.connected ? `${platform.color}12` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${platform.connected ? `${platform.color}35` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${platform.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: platform.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{platform.name}</p>
                      <p className="text-xs text-zinc-500">Auto-generates meeting links</p>
                    </div>
                  </div>
                  <Badge className={platform.connected ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "border-zinc-700 text-zinc-500"} variant="outline">
                    {platform.connected ? "Active" : "Inactive"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Integration Settings Dialog ────────────────────────────── */
function IntegrationSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [activeProvider, setActiveProvider] = useState<"google" | "outlook" | "apple" | "zoom" | "teams">("google");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const { data: integrations } = useQuery<any>({
    queryKey: ["/api/admin/calendar-integrations"],
    enabled: open,
  });

  const saveIntegration = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/calendar-integrations/configure", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar-integrations"] });
      toast({ title: "Integration saved!", description: "Your settings have been updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const disconnectIntegration = useMutation({
    mutationFn: (provider: string) => apiRequest("DELETE", `/api/admin/calendar-integrations/${provider}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar-integrations"] });
      toast({ title: "Disconnected successfully" });
    },
  });

  const providers = [
    { id: "google" as const, name: "Google Calendar", icon: SiGoogle, color: "#4285F4", fields: ["clientId", "clientSecret"] },
    { id: "outlook" as const, name: "Outlook", icon: Calendar, color: "#0078D4", fields: ["clientId", "clientSecret"] },
    { id: "apple" as const, name: "Apple iCloud", icon: Calendar, color: "#000000", fields: ["apiKey", "webhookUrl"] },
    { id: "zoom" as const, name: "Zoom", icon: Video, color: "#2D8CFF", fields: ["clientId", "clientSecret"] },
    { id: "teams" as const, name: "Microsoft Teams", icon: Users, color: "#505AC9", fields: ["clientId", "clientSecret"] },
  ];

  const currentProvider = providers.find(p => p.id === activeProvider);
  const isConnected = integrations?.[activeProvider]?.connected || false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5" style={{ color: GOLD }} />
            Calendar & Meeting Integration
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[600px]">
          {/* Sidebar */}
          <div className="w-56 border-r border-zinc-800 pr-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2 px-2">Calendars</p>
            {providers.filter(p => ["google", "outlook", "apple"].includes(p.id)).map(provider => {
              const Icon = provider.icon;
              const connected = integrations?.[provider.id]?.connected || false;
              return (
                <button
                  key={provider.id}
                  onClick={() => setActiveProvider(provider.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: activeProvider === provider.id ? "rgba(255,255,255,0.06)" : "transparent",
                    color: activeProvider === provider.id ? "#fff" : "#a1a1aa",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: provider.color }} />
                  {provider.name}
                  {connected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2 px-2 mt-4">Meetings</p>
            {providers.filter(p => ["zoom", "teams"].includes(p.id)).map(provider => {
              const Icon = provider.icon;
              const connected = integrations?.[provider.id]?.connected || false;
              return (
                <button
                  key={provider.id}
                  onClick={() => setActiveProvider(provider.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: activeProvider === provider.id ? "rgba(255,255,255,0.06)" : "transparent",
                    color: activeProvider === provider.id ? "#fff" : "#a1a1aa",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: provider.color }} />
                  {provider.name}
                  {connected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {currentProvider && (
              <>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${currentProvider.color}20` }}>
                    <currentProvider.icon className="w-5 h-5" style={{ color: currentProvider.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{currentProvider.name}</p>
                    <p className="text-xs text-zinc-500">OAuth 2.0 Configuration</p>
                  </div>
                  {isConnected && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Connected</Badge>
                  )}
                </div>

                <div className="space-y-4">
                  {currentProvider.fields.includes("clientId") && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Client ID</label>
                      <Input
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        placeholder="Enter your client ID"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("clientSecret") && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Client Secret</label>
                      <Input
                        type="password"
                        value={clientSecret}
                        onChange={e => setClientSecret(e.target.value)}
                        placeholder="Enter your client secret"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("apiKey") && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">API Key</label>
                      <Input
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("webhookUrl") && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Webhook URL</label>
                      <Input
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="Enter webhook URL"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  )}

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Redirect URI</p>
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2">
                      <code className="flex-1 text-xs text-amber-300 font-mono break-all">
                        {window.location.origin}/api/auth/{activeProvider}/callback
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/auth/${activeProvider}/callback`);
                        toast({ title: "Copied to clipboard" });
                      }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-2">Add this URL to your OAuth app's authorized redirect URIs</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Setup Instructions</p>
                    <ol className="space-y-2 text-xs text-zinc-400">
                      {activeProvider === "google" && (
                        <>
                          <li>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline text-zinc-300">Google Cloud Console</a></li>
                          <li>2. Create OAuth 2.0 credentials</li>
                          <li>3. Enable Google Calendar API</li>
                          <li>4. Add the redirect URI above</li>
                          <li>5. Enter your Client ID and Secret</li>
                        </>
                      )}
                      {activeProvider === "outlook" && (
                        <>
                          <li>1. Go to <a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="underline text-zinc-300">Azure Portal</a></li>
                          <li>2. Register a new application</li>
                          <li>3. Add Calendar.ReadWrite permissions</li>
                          <li>4. Add the redirect URI above</li>
                          <li>5. Enter your Client ID and Secret</li>
                        </>
                      )}
                      {activeProvider === "zoom" && (
                        <>
                          <li>1. Go to <a href="https://marketplace.zoom.us" target="_blank" rel="noreferrer" className="underline text-zinc-300">Zoom Marketplace</a></li>
                          <li>2. Create an OAuth app</li>
                          <li>3. Add meeting:write scopes</li>
                          <li>4. Add the redirect URI above</li>
                          <li>5. Enter your Client ID and Secret</li>
                        </>
                      )}
                      {activeProvider === "teams" && (
                        <>
                          <li>1. Go to <a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="underline text-zinc-300">Azure Portal</a></li>
                          <li>2. Register a new application</li>
                          <li>3. Add OnlineMeetings.ReadWrite permissions</li>
                          <li>4. Add the redirect URI above</li>
                          <li>5. Enter your Client ID and Secret</li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-700/40 text-red-400"
                      onClick={() => disconnectIntegration.mutate(activeProvider)}
                      disabled={disconnectIntegration.isPending}
                    >
                      {disconnectIntegration.isPending ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 font-bold"
                      style={{ background: GOLD, color: "#000" }}
                      onClick={() => saveIntegration.mutate({
                        provider: activeProvider,
                        clientId,
                        clientSecret,
                        apiKey,
                        webhookUrl,
                      })}
                      disabled={saveIntegration.isPending || (!clientId && !apiKey)}
                    >
                      {saveIntegration.isPending ? "Saving..." : "Save & Connect"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function AdminScheduling() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("calendar");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [availOpen, setAvailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [integrationSettingsOpen, setIntegrationSettingsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingFilter, setBookingFilter] = useState<"upcoming" | "all">("upcoming");
  const [prefillDate, setPrefillDate] = useState<Date | undefined>();
  const [prefillHour, setPrefillHour] = useState<number | undefined>();

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

  // ── Call settings state
  const [title, setTitle] = useState("Strategy Call");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  // ── Availability state
  const [rules, setRules] = useState<AvailRule[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: i >= 1 && i <= 5 }))
  );
  const [timezone, setTimezone] = useState("UTC");

  // ── Queries
  const { data: meetingTypes = [], isLoading: mtLoading } = useQuery<any[]>({ queryKey: ["/api/admin/meeting-types"] });
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/scheduled-bookings"] });
  const { data: calStatus } = useQuery<{ connected: boolean; email: string | null }>({ queryKey: ["/api/admin/google-calendar/status"] });

  const primary = meetingTypes.find((m: any) => m.isActive) ?? meetingTypes[0] ?? null;
  const bookingUrl = primary ? `${window.location.origin}/book/${primary.slug}` : null;

  // Sync form when primary loads
  useEffect(() => {
    if (primary) {
      setTitle(primary.title);
      setDuration(primary.duration);
      setDescription(primary.description ?? "");
      setLocation(primary.location ?? "");
      setIsActive(primary.isActive ?? true);
      setTimezone(primary.timezone ?? "UTC");
      try { setCustomQuestions(JSON.parse(primary.customQuestions ?? "[]")); } catch { setCustomQuestions([]); }
    }
  }, [primary?.id]);

  // Availability rules
  const { data: existingRules } = useQuery<any[]>({
    queryKey: ["/api/admin/meeting-types", primary?.id, "availability"],
    queryFn: () => primary ? fetch(`/api/admin/meeting-types/${primary.id}/availability`, { credentials: "include" }).then(r => r.json()) : Promise.resolve([]),
    enabled: !!primary,
  });
  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      setRules(DAYS.map((_, i) => {
        const r = existingRules.find((x: any) => x.dayOfWeek === i);
        return r ? { dayOfWeek: i, startTime: r.startTime, endTime: r.endTime, isEnabled: r.isEnabled ?? true }
          : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: false };
      }));
    }
  }, [existingRules]);

  // ── Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      const slug = slugify(title) || "strategy-call";
      const body = { title, slug, duration, description, location, isActive, timezone, customQuestions: JSON.stringify(customQuestions) };
      return primary ? apiRequest("PATCH", `/api/admin/meeting-types/${primary.id}`, body) : apiRequest("POST", "/api/admin/meeting-types", body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types"] }); setSettingsOpen(false); toast({ title: "Settings saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveAvailMutation = useMutation({
    mutationFn: () => {
      if (!primary) return Promise.reject("No meeting type yet");
      return Promise.all([
        apiRequest("PUT", `/api/admin/meeting-types/${primary.id}/availability`, rules),
        apiRequest("PATCH", `/api/admin/meeting-types/${primary.id}`, { timezone }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types", primary?.id, "availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types"] });
      setAvailOpen(false);
      toast({ title: "Availability saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/admin/scheduled-bookings/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] }); toast({ title: "Booking updated" }); },
  });

  const disconnectCalMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/google-calendar/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-calendar/status"] });
      toast({ title: "Google Calendar disconnected" });
    },
  });

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addQuestion() {
    if (!newQuestion.trim()) return;
    setCustomQuestions(qs => [...qs, { id: `q_${Date.now()}`, label: newQuestion.trim(), required: false }]);
    setNewQuestion("");
  }

  const upcomingBookings = bookings.filter((b: any) => b.status === "scheduled" && new Date(b.startTime) > new Date());
  const displayBookings = bookingFilter === "upcoming" ? upcomingBookings : bookings;
  const enabledDays = rules.filter(r => r.isEnabled);

  // Stats
  const totalThisWeek = bookings.filter((b: any) => {
    const d = new Date(b.startTime);
    return d >= weekStart && d <= endOfWeek(weekStart, { weekStartsOn: 0 });
  }).length;
  const nextBooking = upcomingBookings.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Scheduling</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your calendar, bookings, and availability</p>
          </div>
          <Button onClick={() => { setPrefillDate(undefined); setPrefillHour(undefined); setCreateOpen(true); }} className="gap-2 font-bold" style={{ background: GOLD, color: "#000" }}>
            <Plus className="w-4 h-4" /> New Booking
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">This Week</span>
            </div>
            <p className="text-2xl font-black text-white">{totalThisWeek}</p>
            <p className="text-[10px] text-zinc-600">bookings</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Upcoming</span>
            </div>
            <p className="text-2xl font-black text-white">{upcomingBookings.length}</p>
            <p className="text-[10px] text-zinc-600">scheduled</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Next Call</span>
            </div>
            {nextBooking ? (
              <>
                <p className="text-sm font-bold text-white truncate">{nextBooking.clientName}</p>
                <p className="text-[10px] text-zinc-500">{format(new Date(nextBooking.startTime), "MMM d, h:mm a")}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-600">No upcoming</p>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4" style={{ color: GOLD }} />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase">Booking Link</span>
            </div>
            {bookingUrl ? (
              <button onClick={copyLink} className="text-xs text-zinc-300 hover:text-white truncate block w-full text-left">
                {copied ? "✓ Copied!" : primary?.slug ? `/book/${primary.slug}` : "—"}
              </button>
            ) : (
              <p className="text-xs text-zinc-600">Not set up</p>
            )}
            <p className="text-[10px] text-zinc-600">{primary?.isActive ? "Active" : "Paused"}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit overflow-x-auto">
          {([
            { id: "calendar" as TabType, label: "Calendar", icon: Calendar },
            { id: "bookings" as TabType, label: "Bookings", icon: Users },
            { id: "ta3" as TabType, label: "TA3", icon: TrendingUp },
            { id: "ta4" as TabType, label: "TA4", icon: TrendingUp },
            { id: "ta5" as TabType, label: "TA5", icon: TrendingUp },
            { id: "availability" as TabType, label: "Availability", icon: CalendarDays },
            { id: "settings" as TabType, label: "Settings", icon: Settings2 },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: activeTab === tab.id ? GOLD : "transparent", color: activeTab === tab.id ? "#000" : "#71717a" }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ CALENDAR TAB ═══ */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            <WeeklyCalendar
              bookings={bookings}
              weekStart={weekStart}
              onPrev={() => setWeekStart(s => subWeeks(s, 1))}
              onNext={() => setWeekStart(s => addWeeks(s, 1))}
              onBookingClick={b => setSelectedBooking(b)}
              onSlotClick={(date, hour) => {
                setPrefillDate(date);
                setPrefillHour(hour);
                setCreateOpen(true);
              }}
            />
            {/* Today's schedule */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: GOLD }} />
                Today's Schedule
              </h3>
              {(() => {
                const todayBookings = bookings.filter((b: any) => isSameDay(new Date(b.startTime), new Date()) && b.status === "scheduled");
                if (todayBookings.length === 0) return <p className="text-xs text-zinc-600">No calls scheduled for today</p>;
                return (
                  <div className="space-y-2">
                    {todayBookings.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((b: any) => (
                      <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 cursor-pointer transition-colors">
                        <div className="w-1.5 h-8 rounded-full bg-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{b.clientName}</p>
                          <p className="text-xs text-zinc-500">{b.clientEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-white">{format(new Date(b.startTime), "h:mm a")}</p>
                          <p className="text-[10px] text-zinc-500">{Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000)} min</p>
                        </div>
                        {b.meetLink && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] border-emerald-700/40 text-emerald-400 gap-1" onClick={(e) => { e.stopPropagation(); window.open(b.meetLink, "_blank"); }}>
                            <VideoIcon className="w-3 h-3" /> Join
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═══ BOOKINGS TAB ═══ */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Booking link card */}
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <Link2 className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Your Booking Link</p>
                  <p className="text-xs text-zinc-500">Share with prospects to let them book calls</p>
                </div>
              </div>
              {bookingUrl ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60">
                    <span className="text-sm text-zinc-300 font-mono truncate">{bookingUrl}</span>
                  </div>
                  <Button onClick={copyLink} className="gap-2 font-bold flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                    {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </Button>
                  <Button variant="outline" size="icon" className="border-zinc-700 flex-shrink-0" onClick={() => window.open(bookingUrl, "_blank")}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-zinc-400 text-sm mb-2">Set up your call type to get your booking link</p>
                  <Button onClick={() => setActiveTab("settings")} style={{ background: GOLD, color: "#000" }} className="font-bold">Set Up Now</Button>
                </div>
              )}
            </div>

            {/* Google Calendar */}
            <GoogleCalendarWidget calStatus={calStatus} onConnect={() => { window.location.href = "/api/auth/google-calendar"; }} onDisconnect={() => disconnectCalMutation.mutate()} disconnecting={disconnectCalMutation.isPending} />

            {/* Bookings list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" /> All Bookings
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{upcomingBookings.length} upcoming</Badge>
                </h2>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                  {(["upcoming", "all"] as const).map(f => (
                    <button key={f} onClick={() => setBookingFilter(f)} className="text-[11px] px-3 py-1 rounded-lg font-medium transition-colors capitalize"
                      style={{ background: bookingFilter === f ? GOLD : "transparent", color: bookingFilter === f ? "#000" : "#71717a" }}>{f}</button>
                  ))}
                </div>
              </div>
              {bookingsLoading ? (
                <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : displayBookings.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-14 text-center">
                  <CalendarDays className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-medium">No {bookingFilter === "upcoming" ? "upcoming" : ""} bookings</p>
                  <p className="text-zinc-600 text-xs mt-1">Share your booking link or create one manually</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayBookings.map((b: any) => {
                    const isPast = new Date(b.startTime) < new Date();
                    return (
                      <div key={b.id} onClick={() => setSelectedBooking(b)} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition-colors cursor-pointer group">
                        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${b.status === "cancelled" ? "bg-red-500/60" : isPast ? "bg-zinc-600" : "bg-emerald-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">{b.clientName}</p>
                            <Badge variant="outline" className={`text-[10px] ${b.status === "cancelled" ? "border-red-500/30 text-red-400" : b.status === "completed" ? "border-zinc-500/30 text-zinc-400" : !isPast ? "border-emerald-500/30 text-emerald-400" : "border-zinc-600/30 text-zinc-500"}`}>
                              {b.status === "scheduled" && isPast ? "past" : b.status}
                            </Badge>
                            {b.meetLink && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">Meet</Badge>}
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{b.clientEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-white">{format(new Date(b.startTime), "MMM d, yyyy")}</p>
                          <p className="text-xs text-zinc-500">{format(new Date(b.startTime), "h:mm a")} — {format(new Date(b.endTime), "h:mm a")}</p>
                        </div>
                        {b.status === "scheduled" && !isPast && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); updateBookingMutation.mutate({ id: b.id, status: "completed" }); }} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors" title="Complete"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); updateBookingMutation.mutate({ id: b.id, status: "cancelled" }); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors" title="Cancel"><Ban className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ AVAILABILITY TAB ═══ */}
        {activeTab === "availability" && (
          <div className="space-y-5">
            {/* Timezone */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-sm font-bold text-white">Timezone</p>
              </div>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm">
                  <SelectValue placeholder="Select timezone…" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-600 mt-2">All times below are in your selected timezone. Prospects see slots in their local time.</p>
            </div>

            {/* Weekly availability */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-bold text-white">Weekly Availability</p>
                </div>
                <p className="text-xs text-zinc-500">{enabledDays.length} days active</p>
              </div>
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <AvailRow key={i} rule={rule} onChange={r => setRules(rs => rs.map((x, j) => j === i ? r : x))} />
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => saveAvailMutation.mutate()}
                  disabled={saveAvailMutation.isPending || !primary}
                  className="font-bold"
                  style={{ background: GOLD, color: "#000" }}
                >
                  {saveAvailMutation.isPending ? "Saving…" : "Save Availability"}
                </Button>
              </div>
            </div>

            {/* Quick reference: what the calendar looks like */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-zinc-400" />
                <p className="text-sm font-bold text-white">Schedule Preview</p>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {rules.map((rule, i) => (
                  <div key={i} className={`rounded-lg p-2 text-center ${rule.isEnabled ? "bg-zinc-800 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/30"}`}>
                    <p className={`text-[10px] font-bold ${rule.isEnabled ? "text-white" : "text-zinc-600"}`}>{DAYS_SHORT[i]}</p>
                    {rule.isEnabled ? (
                      <div className="mt-1">
                        <p className="text-[9px] text-zinc-400">{rule.startTime}</p>
                        <p className="text-[9px] text-zinc-600">to</p>
                        <p className="text-[9px] text-zinc-400">{rule.endTime}</p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-700 mt-1">Off</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {activeTab === "settings" && (
          <div className="space-y-5 max-w-2xl">
            {/* Call Settings */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-sm font-bold text-white">Call Settings</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Call Name</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Strategy Call" className="bg-zinc-900 border-zinc-700 text-white" />
                {title && <p className="text-[11px] text-zinc-600">Link: /book/{slugify(title) || "strategy-call"}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
                <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {DURATIONS.map(d => <SelectItem key={d} value={String(d)} className="text-white">{d} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Meeting Link</label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Zoom link, Google Meet URL, or phone number" className="bg-zinc-900 border-zinc-700 text-white" />
                <p className="text-[11px] text-zinc-600">If Google Calendar is connected, a unique Meet link is auto-generated for each booking.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will you cover in this call?" rows={2} className="bg-zinc-900 border-zinc-700 text-white resize-none" />
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div>
                  <p className="text-sm font-semibold text-white">Accept bookings</p>
                  <p className="text-xs text-zinc-500">Turn off to pause all new bookings</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            {/* Custom Questions */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-sm font-bold text-white">Custom Questions</p>
                <span className="text-xs text-zinc-500">— ask prospects anything extra</span>
              </div>

              {customQuestions.length > 0 && (
                <div className="space-y-2">
                  {customQuestions.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                      <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                      <span className="text-sm text-white flex-1 truncate">{q.label}</span>
                      <button
                        onClick={() => setCustomQuestions(qs => qs.map((x, j) => j === i ? { ...x, required: !x.required } : x))}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-colors ${q.required ? "border-yellow-600/40 text-yellow-500 bg-yellow-600/10" : "border-zinc-700 text-zinc-500"}`}
                      >
                        {q.required ? "Required" : "Optional"}
                      </button>
                      <button onClick={() => setCustomQuestions(qs => qs.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addQuestion()}
                  placeholder="e.g. What's your biggest challenge right now?"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm"
                />
                <Button type="button" onClick={addQuestion} disabled={!newQuestion.trim()} variant="outline" className="border-zinc-700 flex-shrink-0 gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>

            {/* Google Calendar */}
            <GoogleCalendarWidget calStatus={calStatus} onConnect={() => { window.location.href = "/api/auth/google-calendar"; }} onDisconnect={() => disconnectCalMutation.mutate()} disconnecting={disconnectCalMutation.isPending} />

            {/* Save */}
            <div className="flex justify-end">
              <Button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending || !title.trim()}
                className="font-bold px-8"
                style={{ background: GOLD, color: "#000" }}
              >
                {saveSettingsMutation.isPending ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ DIALOGS ═══ */}
        <BookingDetailDialog
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onAction={(id, status) => updateBookingMutation.mutate({ id, status })}
        />

        <CreateBookingDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          meetingType={primary}
          prefillDate={prefillDate}
          prefillHour={prefillHour}
        />

        {/* ═══ TA3 TAB ═══ */}
        {activeTab === "ta3" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tier 3 Scheduling</h3>
                  <p className="text-sm text-zinc-500">Flexible scheduling for growing businesses</p>
                </div>
              </div>

              {/* Google Calendar Integration */}
              <div className="mb-6">
                <GoogleCalendarWidget 
                  calStatus={calStatus} 
                  onConnect={() => { window.location.href = "/api/auth/google-calendar"; }} 
                  onDisconnect={() => disconnectCalMutation.mutate()} 
                  disconnecting={disconnectCalMutation.isPending} 
                />
              </div>

              {/* TA3 Settings */}
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">TA3 Call Configuration</p>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Scheduling Type</p>
                        <p className="text-xs text-zinc-500">Flexible scheduling available</p>
                      </div>
                      <Badge className="bg-zinc-800 text-white border-zinc-700">Flexible</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Auto Meeting Links</p>
                        <p className="text-xs text-zinc-500">Google Meet links generated automatically</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        {calStatus?.connected ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-zinc-700 text-white gap-2 justify-start">
                      <Plus className="w-4 h-4" />
                      Create TA3 Booking
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-white gap-2 justify-start">
                      <Link2 className="w-4 h-4" />
                      Get Booking Link
                    </Button>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-semibold text-white uppercase tracking-wider">Integration Status</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Google Calendar</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Connected" : "○ Not Connected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Google Meet</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Active" : "○ Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Email Reminders</span>
                      <span className="text-emerald-400">✓ Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TA4 TAB ═══ */}
        {activeTab === "ta4" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tier 4 Scheduling</h3>
                  <p className="text-sm text-zinc-500">Premium scheduling for scaling businesses</p>
                </div>
              </div>

              {/* Google Calendar Integration */}
              <div className="mb-6">
                <GoogleCalendarWidget 
                  calStatus={calStatus} 
                  onConnect={() => { window.location.href = "/api/auth/google-calendar"; }} 
                  onDisconnect={() => disconnectCalMutation.mutate()} 
                  disconnecting={disconnectCalMutation.isPending} 
                />
              </div>

              {/* TA4 Settings */}
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">TA4 Call Configuration</p>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Scheduling Type</p>
                        <p className="text-xs text-zinc-500">Premium flexible scheduling</p>
                      </div>
                      <Badge className="bg-zinc-800 text-white border-zinc-700">Flexible</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Auto Meeting Links</p>
                        <p className="text-xs text-zinc-500">Google Meet links generated automatically</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        {calStatus?.connected ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Priority Booking</p>
                        <p className="text-xs text-zinc-500">Enhanced scheduling options</p>
                      </div>
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">Enabled</Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-zinc-700 text-white gap-2 justify-start">
                      <Plus className="w-4 h-4" />
                      Create TA4 Booking
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-white gap-2 justify-start">
                      <Link2 className="w-4 h-4" />
                      Get Booking Link
                    </Button>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-semibold text-white uppercase tracking-wider">Integration Status</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Google Calendar</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Connected" : "○ Not Connected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Google Meet + Recording</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Active" : "○ Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Priority Scheduling</span>
                      <span className="text-emerald-400">✓ Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Email Reminders</span>
                      <span className="text-emerald-400">✓ Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TA5 TAB ═══ */}
        {activeTab === "ta5" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tier 5 Scheduling</h3>
                  <p className="text-sm text-zinc-500">VIP white-glove service for elite clients</p>
                </div>
              </div>

              {/* Google Calendar Integration */}
              <div className="mb-6">
                <GoogleCalendarWidget 
                  calStatus={calStatus} 
                  onConnect={() => { window.location.href = "/api/auth/google-calendar"; }} 
                  onDisconnect={() => disconnectCalMutation.mutate()} 
                  disconnecting={disconnectCalMutation.isPending} 
                />
              </div>

              {/* TA5 Settings */}
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">TA5 Call Configuration</p>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Scheduling Type</p>
                        <p className="text-xs text-zinc-500">VIP unlimited scheduling</p>
                      </div>
                      <Badge className="bg-zinc-800 text-white border-zinc-700">Unlimited</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Auto Meeting Links</p>
                        <p className="text-xs text-zinc-500">Google Meet links generated automatically</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        {calStatus?.connected ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">VIP Scheduling</p>
                        <p className="text-xs text-zinc-500">Exclusive access to all time slots</p>
                      </div>
                      <Badge style={{ background: `${GOLD}18`, color: GOLD, borderColor: `${GOLD}40` }}>VIP</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Concierge Service</p>
                        <p className="text-xs text-zinc-500">Dedicated booking coordinator</p>
                      </div>
                      <Badge style={{ background: `${GOLD}18`, color: GOLD, borderColor: `${GOLD}40` }}>Active</Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-zinc-700 text-white gap-2 justify-start">
                      <Plus className="w-4 h-4" />
                      Create TA5 Booking
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-white gap-2 justify-start">
                      <Link2 className="w-4 h-4" />
                      Get VIP Link
                    </Button>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-semibold text-white uppercase tracking-wider">Integration Status</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Google Calendar</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Connected" : "○ Not Connected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Google Meet + Recording</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Active" : "○ Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Auto Transcription</span>
                      <span className={calStatus?.connected ? "text-emerald-400" : "text-zinc-600"}>
                        {calStatus?.connected ? "✓ Active" : "○ Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">VIP Priority Scheduling</span>
                      <span className="text-emerald-400">✓ Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Concierge Support</span>
                      <span className="text-emerald-400">✓ Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Email Reminders</span>
                      <span className="text-emerald-400">✓ Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
