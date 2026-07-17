import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarDays, Copy, CheckCheck, ExternalLink, Clock, Globe, Settings2,
  Link2, Users, Plus, Ban, CheckCircle2, Calendar, Video, Phone, Monitor,
  ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday, isBefore } from "date-fns";

const GOLD = "#d4b461";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (EST/EDT)" },
  { value: "America/Chicago", label: "Central (CST/CDT)" },
  { value: "America/Denver", label: "Mountain (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific (PST/PDT)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "America/Sao_Paulo", label: "Brasília (BRT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

type TabType = "overview" | "availability" | "bookings";
type AvailRule = { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean };

function detectPlatform(url: string): { label: string; color: string } {
  if (!url) return { label: "Custom", color: "#71717a" };
  const u = url.toLowerCase();
  if (u.includes("zoom.us")) return { label: "Zoom", color: "#2D8CFF" };
  if (u.includes("meet.google") || u.includes("google.com/meet")) return { label: "Google Meet", color: "#34A853" };
  if (u.includes("teams.microsoft") || u.includes("teams.live")) return { label: "Microsoft Teams", color: "#5059C9" };
  if (u.includes("whereby.com")) return { label: "Whereby", color: "#6C63FF" };
  if (u.includes("cal.com")) return { label: "Cal.com", color: "#111827" };
  if (u.includes("phone") || /^\+?\d[\d\s()-]+$/.test(url)) return { label: "Phone", color: "#10b981" };
  return { label: "Custom Link", color: "#71717a" };
}

function WeekCalendar({ bookings, weekStart, onPrev, onNext }: {
  bookings: any[];
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const visibleHours = HOURS.filter(h => h >= 7 && h <= 21);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
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

      <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-zinc-800">
        <div />
        {weekDays.map(day => (
          <div key={day.toISOString()} className={`p-2 text-center border-l border-zinc-800 ${isToday(day) ? "bg-yellow-500/5" : ""}`}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">{format(day, "EEE")}</p>
            <p className={`text-base font-bold ${isToday(day) ? "text-yellow-500" : "text-white"}`}>{format(day, "d")}</p>
          </div>
        ))}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <div className="grid grid-cols-[52px_repeat(7,1fr)]">
          {visibleHours.map(hour => (
            <div key={hour} className="contents">
              <div className="h-12 flex items-start justify-end pr-2 pt-1 border-b border-zinc-800/50">
                <span className="text-[10px] text-zinc-600 font-medium">{formatHour(hour)}</span>
              </div>
              {weekDays.map(day => {
                const dayBookings = bookings.filter(b => {
                  const bs = new Date(b.startTime);
                  return isSameDay(bs, day) && bs.getHours() === hour;
                });
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`h-12 border-l border-b border-zinc-800/50 relative ${isToday(day) ? "bg-yellow-500/[0.02]" : ""}`}
                  >
                    {dayBookings.map(b => (
                      <div
                        key={b.id}
                        className="absolute left-0.5 right-0.5 top-0.5 rounded-md px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 overflow-hidden"
                      >
                        <p className="text-[9px] font-bold text-white truncate">{b.clientName}</p>
                        <p className="text-[8px] text-zinc-400">{format(new Date(b.startTime), "h:mm a")}</p>
                      </div>
                    ))}
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

function AvailRow({ rule, onChange }: { rule: AvailRule; onChange: (r: AvailRule) => void }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${rule.isEnabled ? "bg-zinc-900 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/50"}`}>
      <Switch checked={rule.isEnabled} onCheckedChange={v => onChange({ ...rule, isEnabled: v })} />
      <span className={`text-sm font-semibold w-24 flex-shrink-0 ${rule.isEnabled ? "text-white" : "text-zinc-500"}`}>{DAYS[rule.dayOfWeek]}</span>
      {rule.isEnabled ? (
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Input type="time" value={rule.startTime} onChange={e => onChange({ ...rule, startTime: e.target.value })} className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white" />
          <span className="text-zinc-500 text-xs">to</span>
          <Input type="time" value={rule.endTime} onChange={e => onChange({ ...rule, endTime: e.target.value })} className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white" />
          <span className="text-xs text-zinc-500">
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

export default function ClientScheduling() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [copied, setCopied] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("Strategy Call");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [isActive, setIsActive] = useState(true);

  // Availability
  const [rules, setRules] = useState<AvailRule[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: i >= 1 && i <= 5 }))
  );

  const { data: mt, isLoading: mtLoading } = useQuery<any>({ queryKey: ["/api/scheduling/me"] });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/scheduling/bookings"] });
  const { data: availRules = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduling/availability"],
    enabled: !!mt,
  });

  useEffect(() => {
    if (mt) {
      setTitle(mt.title);
      setDuration(mt.duration);
      setDescription(mt.description ?? "");
      setLocation(mt.location ?? "");
      setTimezone(mt.timezone ?? "UTC");
      setIsActive(mt.isActive ?? true);
    }
  }, [mt?.id]);

  useEffect(() => {
    if (availRules.length > 0) {
      setRules(DAYS.map((_, i) => {
        const r = availRules.find((x: any) => x.dayOfWeek === i);
        return r
          ? { dayOfWeek: i, startTime: r.startTime, endTime: r.endTime, isEnabled: r.isEnabled ?? true }
          : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: false };
      }));
    }
  }, [availRules.length]);

  const setupMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scheduling/setup", { title, duration, description, location, timezone, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/me"] });
      toast({ title: "Saved!" });
      setSetupOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const availMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/scheduling/availability", rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/availability"] });
      toast({ title: "Availability saved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/scheduling/bookings/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/bookings"] });
      toast({ title: "Updated" });
    },
  });

  const bookingUrl = mt ? `${window.location.origin}/book/${mt.slug}` : null;
  const platform = detectPlatform(location);
  const upcomingBookings = bookings.filter((b: any) => b.status === "scheduled" && new Date(b.startTime) > new Date());
  const enabledDays = rules.filter(r => r.isEnabled).length;

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                  <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <h1 className="text-2xl font-black text-white">Scheduling</h1>
              </div>
              <p className="text-zinc-500 text-sm">Your personal booking page — share it with anyone to get calls booked</p>
            </div>
            <Button
              onClick={() => setSetupOpen(true)}
              className="gap-2 font-bold"
              style={{ background: GOLD, color: "#000" }}
            >
              <Settings2 className="w-4 h-4" />
              {mt ? "Edit Settings" : "Set Up"}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Upcoming</span>
              </div>
              <p className="text-2xl font-black text-white">{upcomingBookings.length}</p>
              <p className="text-[10px] text-zinc-600">calls booked</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Duration</span>
              </div>
              <p className="text-2xl font-black text-white">{mt?.duration ?? "—"}</p>
              <p className="text-[10px] text-zinc-600">minutes per call</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Available</span>
              </div>
              <p className="text-2xl font-black text-white">{enabledDays}</p>
              <p className="text-[10px] text-zinc-600">days / week</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Status</span>
              </div>
              <p className="text-sm font-black text-white">{mt ? (mt.isActive ? "Active" : "Paused") : "Not set up"}</p>
              <p className="text-[10px] text-zinc-600">{mt?.isActive ? "accepting bookings" : "paused"}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit mb-6">
            {([
              { id: "overview" as TabType, label: "Overview", icon: CalendarDays },
              { id: "availability" as TabType, label: "Availability", icon: Clock },
              { id: "bookings" as TabType, label: "Bookings", icon: Users },
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

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Not set up yet */}
              {!mt && !mtLoading && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30` }}>
                    <CalendarDays className="w-6 h-6" style={{ color: GOLD }} />
                  </div>
                  <p className="text-white font-black text-lg mb-1">Set up your booking page</p>
                  <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">Create your personal scheduling link. Share it with prospects and clients so they can book calls with you directly.</p>
                  <Button onClick={() => setSetupOpen(true)} className="font-bold gap-2" style={{ background: GOLD, color: "#000" }}>
                    <Sparkles className="w-4 h-4" /> Get Started
                  </Button>
                </div>
              )}

              {/* Booking link */}
              {mt && (
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                      <Link2 className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">Your Booking Link</p>
                      <p className="text-xs text-zinc-500">Share this link so people can book calls with you</p>
                    </div>
                    {mt.isActive
                      ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>
                      : <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/30 text-[10px]">Paused</Badge>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60">
                      <span className="text-sm text-zinc-300 font-mono truncate">{bookingUrl}</span>
                    </div>
                    <Button onClick={copyLink} className="gap-2 font-bold flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                      {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                    </Button>
                    <Button variant="outline" size="icon" className="border-zinc-700 flex-shrink-0" onClick={() => window.open(bookingUrl!, "_blank")}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Video Platform */}
              {mt && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <p className="text-sm font-bold text-white mb-4">Video Platform</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { name: "Zoom", icon: Video, desc: "Paste your personal Zoom link", color: "#2D8CFF", hint: "zoom.us/j/..." },
                      { name: "Google Meet", icon: Monitor, desc: "Use your Google Meet link", color: "#34A853", hint: "meet.google.com/..." },
                      { name: "Microsoft Teams", icon: Users, desc: "Use your Teams meeting link", color: "#5059C9", hint: "teams.microsoft.com/..." },
                    ].map(p => {
                      const isSelected = location.toLowerCase().includes(p.name === "Zoom" ? "zoom.us" : p.name === "Google Meet" ? "meet.google" : "teams.microsoft");
                      return (
                        <div
                          key={p.name}
                          className="rounded-xl border p-4 transition-all"
                          style={{
                            borderColor: isSelected ? `${p.color}60` : "rgba(255,255,255,0.08)",
                            background: isSelected ? `${p.color}10` : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <p.icon className="w-4 h-4" style={{ color: p.color }} />
                            <p className="text-xs font-bold text-white">{p.name}</p>
                            {isSelected && <Badge className="text-[9px] px-1.5" style={{ background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40` }}>Active</Badge>}
                          </div>
                          <p className="text-[11px] text-zinc-500">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-zinc-500 mb-2">Current meeting link</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60">
                        {location ? (
                          <>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: platform.color }} />
                            <span className="text-xs text-zinc-300 truncate">{location}</span>
                            <Badge className="text-[9px] px-1.5 flex-shrink-0" style={{ background: `${platform.color}20`, color: platform.color, border: `1px solid ${platform.color}40` }}>
                              {platform.label}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">No link set — click Edit Settings to add one</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 flex-shrink-0" onClick={() => setSetupOpen(true)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar preview */}
              {mt && (
                <WeekCalendar
                  bookings={bookings}
                  weekStart={weekStart}
                  onPrev={() => setWeekStart(s => subWeeks(s, 1))}
                  onNext={() => setWeekStart(s => addWeeks(s, 1))}
                />
              )}
            </div>
          )}

          {/* ═══ AVAILABILITY TAB ═══ */}
          {activeTab === "availability" && (
            <div className="space-y-5 max-w-2xl">
              {!mt && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-10 text-center">
                  <p className="text-zinc-400 text-sm mb-3">Set up your booking page first to configure availability</p>
                  <Button onClick={() => setSetupOpen(true)} style={{ background: GOLD, color: "#000" }} className="font-bold">Set Up Now</Button>
                </div>
              )}

              {mt && (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4" style={{ color: GOLD }} />
                      <p className="text-sm font-bold text-white">Timezone</p>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">Prospects see available slots in their local time</p>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm max-w-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                        {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <p className="text-sm font-bold text-white">Weekly Hours</p>
                      </div>
                      <span className="text-xs text-zinc-500">{enabledDays} days active</span>
                    </div>
                    <div className="space-y-2">
                      {rules.map((rule, i) => (
                        <AvailRow key={i} rule={rule} onChange={r => setRules(rs => rs.map((x, j) => j === i ? r : x))} />
                      ))}
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={() => availMutation.mutate()} disabled={availMutation.isPending} className="font-bold" style={{ background: GOLD, color: "#000" }}>
                        {availMutation.isPending ? "Saving…" : "Save Availability"}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Week Preview</p>
                    <div className="overflow-x-auto"><div className="grid grid-cols-7 gap-2 min-w-[350px]">
                      {rules.map((rule, i) => (
                        <div key={i} className={`rounded-lg p-2 text-center ${rule.isEnabled ? "bg-zinc-800 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/30"}`}>
                          <p className={`text-[10px] font-bold ${rule.isEnabled ? "text-white" : "text-zinc-600"}`}>{DAYS_SHORT[i]}</p>
                          {rule.isEnabled ? (
                            <div className="mt-1">
                              <p className="text-[9px] text-zinc-400">{rule.startTime}</p>
                              <p className="text-[9px] text-zinc-600">—</p>
                              <p className="text-[9px] text-zinc-400">{rule.endTime}</p>
                            </div>
                          ) : <p className="text-[9px] text-zinc-700 mt-1">Off</p>}
                        </div>
                      ))}
                    </div></div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ BOOKINGS TAB ═══ */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-16 text-center">
                  <CalendarDays className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-medium">No bookings yet</p>
                  <p className="text-zinc-600 text-xs mt-1">Share your booking link to start receiving calls</p>
                  {bookingUrl && (
                    <Button onClick={copyLink} className="mt-4 gap-2 font-bold" style={{ background: GOLD, color: "#000" }}>
                      <Copy className="w-4 h-4" /> Copy Your Link
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" /> All Bookings
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{upcomingBookings.length} upcoming</Badge>
                    </h2>
                  </div>
                  {bookings.map((b: any) => {
                    const isPast = new Date(b.startTime) < new Date();
                    const statusColor = b.status === "cancelled" ? "border-red-500/30 text-red-400" : b.status === "completed" ? "border-zinc-500/30 text-zinc-400" : !isPast ? "border-emerald-500/30 text-emerald-400" : "border-zinc-600/30 text-zinc-500";
                    return (
                      <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition-colors group">
                        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${b.status === "cancelled" ? "bg-red-500/60" : isPast ? "bg-zinc-600" : "bg-emerald-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">{b.clientName}</p>
                            <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
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
                            {b.meetLink && (
                              <button onClick={() => window.open(b.meetLink, "_blank")} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors" title="Join">
                                <Video className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => updateBooking.mutate({ id: b.id, status: "completed" })} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors" title="Complete">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => updateBooking.mutate({ id: b.id, status: "cancelled" })} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors" title="Cancel">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Setup / Edit Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4" style={{ color: GOLD }} />
              {mt ? "Edit Booking Settings" : "Set Up Booking Page"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Call Name</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Strategy Call" className="bg-zinc-900 border-zinc-700 text-white" />
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
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Video / Meeting Link</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="https://zoom.us/j/... or Teams/Meet link" className="bg-zinc-900 border-zinc-700 text-white" />
              <p className="text-[11px] text-zinc-600">Paste your Zoom, Google Meet, or Microsoft Teams link. This will be included with every booking.</p>
              {location && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: detectPlatform(location).color }} />
                  <span className="text-[11px]" style={{ color: detectPlatform(location).color }}>{detectPlatform(location).label} detected</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will you cover on this call?" rows={2} className="bg-zinc-900 border-zinc-700 text-white resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                  {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div>
                <p className="text-sm font-semibold text-white">Accept bookings</p>
                <p className="text-xs text-zinc-500">Turn off to pause new bookings temporarily</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-zinc-700 text-white" onClick={() => setSetupOpen(false)}>Cancel</Button>
              <Button
                onClick={() => setupMutation.mutate()}
                disabled={!title.trim() || !duration || setupMutation.isPending}
                className="flex-1 font-bold"
                style={{ background: GOLD, color: "#000" }}
              >
                {setupMutation.isPending ? "Saving…" : mt ? "Save Changes" : "Create Booking Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </ClientLayout>
  );
}
