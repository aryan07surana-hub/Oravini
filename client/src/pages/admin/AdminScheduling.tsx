import { useState, useEffect } from "react";
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
import {
  Copy, CheckCheck, Link2, Clock, ExternalLink, Settings2,
  CalendarDays, Video, ChevronRight, X, Check, User, Mail,
  Calendar, Pencil, MoreHorizontal, Ban, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DURATIONS = [15, 20, 30, 45, 60, 90];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ─── Availability row ─────────────────────────────────────── */
type AvailRule = { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean };

function AvailRow({ rule, onChange }: { rule: AvailRule; onChange: (r: AvailRule) => void }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${rule.isEnabled ? "bg-zinc-900 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/50"}`}>
      <Switch
        checked={rule.isEnabled}
        onCheckedChange={v => onChange({ ...rule, isEnabled: v })}
        data-testid={`avail-toggle-${rule.dayOfWeek}`}
      />
      <span className={`text-sm font-semibold w-24 ${rule.isEnabled ? "text-white" : "text-zinc-500"}`}>
        {DAYS[rule.dayOfWeek]}
      </span>
      {rule.isEnabled ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            type="time"
            value={rule.startTime}
            onChange={e => onChange({ ...rule, startTime: e.target.value })}
            className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white"
          />
          <span className="text-zinc-500 text-xs">to</span>
          <Input
            type="time"
            value={rule.endTime}
            onChange={e => onChange({ ...rule, endTime: e.target.value })}
            className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white"
          />
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

/* ─── Booking card ─────────────────────────────────────────── */
function BookingCard({ booking, onAction }: { booking: any; onAction: (id: string, status: string) => void }) {
  const isUpcoming = booking.status === "scheduled" && new Date(booking.startTime) > new Date();
  const isPast = new Date(booking.startTime) < new Date();
  return (
    <div
      data-testid={`booking-card-${booking.id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition-colors group"
    >
      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
        booking.status === "cancelled" ? "bg-red-500/60" :
        isPast ? "bg-zinc-600" : "bg-emerald-500"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white">{booking.clientName}</p>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              booking.status === "cancelled" ? "border-red-500/30 text-red-400" :
              booking.status === "completed" ? "border-zinc-500/30 text-zinc-400" :
              isUpcoming ? "border-emerald-500/30 text-emerald-400" :
              "border-zinc-600/30 text-zinc-500"
            }`}
          >
            {booking.status === "scheduled" && isPast ? "past" : booking.status}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{booking.clientEmail}</p>
        {booking.notes && <p className="text-xs text-zinc-600 mt-0.5 italic truncate">{booking.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-semibold text-white">{format(new Date(booking.startTime), "MMM d, yyyy")}</p>
        <p className="text-xs text-zinc-500">{format(new Date(booking.startTime), "h:mm a")}</p>
        <p className="text-xs text-zinc-600">{booking.meetingType?.duration ?? 30} min</p>
      </div>
      {booking.status === "scheduled" && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAction(booking.id, "completed")}
            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors"
            title="Mark complete"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAction(booking.id, "cancelled")}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
            title="Cancel"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function AdminScheduling() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [availOpen, setAvailOpen] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<"upcoming" | "all">("upcoming");

  // Form state for settings
  const [title, setTitle] = useState("Strategy Call");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Availability
  const [rules, setRules] = useState<AvailRule[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: i >= 1 && i <= 5 }))
  );

  const { data: meetingTypes = [], isLoading: mtLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/meeting-types"],
  });
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/scheduled-bookings"],
  });

  // Primary meeting type = first active one, or first one
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
    }
  }, [primary?.id]);

  // Availability rules query (for the primary meeting type)
  const { data: existingRules } = useQuery<any[]>({
    queryKey: ["/api/admin/meeting-types", primary?.id, "availability"],
    queryFn: () => primary
      ? fetch(`/api/admin/meeting-types/${primary.id}/availability`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!primary,
  });
  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      setRules(DAYS.map((_, i) => {
        const r = existingRules.find((x: any) => x.dayOfWeek === i);
        return r
          ? { dayOfWeek: i, startTime: r.startTime, endTime: r.endTime, isEnabled: r.isEnabled ?? true }
          : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: false };
      }));
    }
  }, [existingRules]);

  // Save call settings
  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      const slug = slugify(title) || "strategy-call";
      const body = { title, slug, duration, description, location, isActive };
      return primary
        ? apiRequest("PATCH", `/api/admin/meeting-types/${primary.id}`, body)
        : apiRequest("POST", "/api/admin/meeting-types", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types"] });
      setSettingsOpen(false);
      toast({ title: "Settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Save availability
  const saveAvailMutation = useMutation({
    mutationFn: () => {
      if (!primary) return Promise.reject("No meeting type yet");
      return apiRequest("PUT", `/api/admin/meeting-types/${primary.id}/availability`, rules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types", primary?.id, "availability"] });
      setAvailOpen(false);
      toast({ title: "Availability saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Update booking status
  const updateBookingMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/scheduled-bookings/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] });
      toast({ title: "Booking updated" });
    },
  });

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const upcomingBookings = bookings.filter((b: any) =>
    b.status === "scheduled" && new Date(b.startTime) > new Date()
  );
  const displayBookings = bookingFilter === "upcoming" ? upcomingBookings : bookings;

  const enabledDays = rules.filter(r => r.isEnabled);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduling</h1>
          <p className="text-sm text-zinc-400 mt-1">Share your link — prospects pick a time and book a call with you</p>
        </div>

        {/* ── YOUR BOOKING LINK ── */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}18` }}>
              <Link2 className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Your Booking Link</p>
              <p className="text-xs text-zinc-500">Share this with anyone you want to book a call</p>
            </div>
          </div>
          <div className="px-6 py-5">
            {mtLoading ? (
              <Skeleton className="h-12 w-full rounded-xl" />
            ) : bookingUrl ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/60">
                  <span className="text-sm text-zinc-300 font-mono truncate">{bookingUrl}</span>
                </div>
                <Button
                  onClick={copyLink}
                  data-testid="button-copy-link"
                  className="gap-2 font-bold flex-shrink-0 h-11"
                  style={{ background: GOLD, color: "#000" }}
                >
                  {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 border-zinc-700 flex-shrink-0"
                  onClick={() => window.open(bookingUrl, "_blank")}
                  title="Preview booking page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-zinc-400 text-sm mb-3">Set up your call type to get your booking link</p>
                <Button onClick={() => setSettingsOpen(true)} style={{ background: GOLD, color: "#000" }} className="font-bold">
                  Set Up Now
                </Button>
              </div>
            )}

            {/* Quick stats row */}
            {primary && (
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  <span>{primary.duration} min call</span>
                </div>
                {primary.location && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Video className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    <span className="truncate max-w-[200px]">{primary.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  <span>{enabledDays.length} days available</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${primary.isActive ? "bg-emerald-500" : "bg-zinc-500"}`} />
                  <span className={primary.isActive ? "text-emerald-400" : "text-zinc-500"}>
                    {primary.isActive ? "Accepting bookings" : "Paused"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TWO COLUMNS: settings + availability ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Call Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            data-testid="button-call-settings"
            className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 hover:bg-zinc-900 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15` }}>
                <Settings2 className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Call Settings</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {primary
                ? `"${primary.title}" · ${primary.duration} min${primary.location ? ` · ${primary.location.slice(0, 25)}${primary.location.length > 25 ? "…" : ""}` : ""}`
                : "Set your call name, duration, and meeting link"
              }
            </p>
          </button>

          {/* Availability */}
          <button
            onClick={() => setAvailOpen(true)}
            data-testid="button-set-availability"
            className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 hover:bg-zinc-900 transition-all group"
            disabled={!primary}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#3b82f615" }}>
                <CalendarDays className="w-4 h-4 text-blue-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Your Availability</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {enabledDays.length > 0
                ? enabledDays.map(r => DAYS[r.dayOfWeek].slice(0, 3)).join(", ") + ` · ${enabledDays[0]?.startTime} – ${enabledDays[enabledDays.length - 1]?.endTime}`
                : "Set which days and hours you're available"}
            </p>
          </button>

        </div>

        {/* ── BOOKINGS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              Bookings
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                {upcomingBookings.length} upcoming
              </Badge>
            </h2>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {(["upcoming", "all"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className="text-[11px] px-3 py-1 rounded-lg font-medium transition-colors capitalize"
                  style={{
                    background: bookingFilter === f ? GOLD : "transparent",
                    color: bookingFilter === f ? "#000" : "#71717a",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {bookingsLoading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : displayBookings.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-14 text-center">
              <CalendarDays className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium">No {bookingFilter === "upcoming" ? "upcoming" : ""} bookings yet</p>
              <p className="text-zinc-600 text-xs mt-1">Share your booking link to start getting calls</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayBookings.map((b: any) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onAction={(id, status) => updateBookingMutation.mutate({ id, status })}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── SETTINGS DIALOG ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Call Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Call Name</label>
              <Input
                data-testid="input-call-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Strategy Call"
                className="bg-zinc-900 border-zinc-700 text-white"
              />
              {title && (
                <p className="text-[11px] text-zinc-600">Booking link: /book/{slugify(title) || "strategy-call"}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
              <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                <SelectTrigger data-testid="select-duration" className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {DURATIONS.map(d => (
                    <SelectItem key={d} value={String(d)} className="text-white">{d} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Meeting Link</label>
              <Input
                data-testid="input-location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Zoom link, Google Meet URL, or phone"
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description (optional)</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What will you cover in this call?"
                rows={2}
                className="bg-zinc-900 border-zinc-700 text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div>
                <p className="text-sm font-semibold text-white">Accept bookings</p>
                <p className="text-xs text-zinc-500">Turn off to pause all new bookings</p>
              </div>
              <Switch
                data-testid="toggle-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button
                data-testid="button-save-settings"
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending || !title.trim()}
                className="flex-1 font-bold"
                style={{ background: GOLD, color: "#000" }}
              >
                {saveSettingsMutation.isPending ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AVAILABILITY DIALOG ── */}
      <Dialog open={availOpen} onOpenChange={setAvailOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Your Availability</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-zinc-500 -mt-1">Set which days and hours prospects can book a call</p>
          <div className="space-y-2 pt-1 max-h-[60vh] overflow-y-auto pr-1">
            {rules.map((rule, i) => (
              <AvailRow key={i} rule={rule} onChange={r => setRules(rs => rs.map((x, j) => j === i ? r : x))} />
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setAvailOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-save-availability"
              onClick={() => saveAvailMutation.mutate()}
              disabled={saveAvailMutation.isPending}
              className="flex-1 font-bold"
              style={{ background: GOLD, color: "#000" }}
            >
              {saveAvailMutation.isPending ? "Saving…" : "Save Availability"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
