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
import { SiGoogle } from "react-icons/si";
import {
  Copy, CheckCheck, Link2, Clock, ExternalLink, Settings2,
  CalendarDays, Video, ChevronRight, Calendar,
  Ban, CheckCircle2, Plus, Trash2, GripVertical, Globe,
  HelpCircle, Unlink,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DURATIONS = [15, 20, 30, 45, 60, 90];

const TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "America/New_York", label: "Eastern Time — US & Canada (EST/EDT)" },
  { value: "America/Chicago", label: "Central Time — US & Canada (CST/CDT)" },
  { value: "America/Denver", label: "Mountain Time — US & Canada (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific Time — US & Canada (PST/PDT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKST/AKDT)" },
  { value: "America/Honolulu", label: "Hawaii Time (HST)" },
  { value: "America/Toronto", label: "Eastern Time — Toronto (EST/EDT)" },
  { value: "America/Vancouver", label: "Pacific Time — Vancouver (PST/PDT)" },
  { value: "America/Sao_Paulo", label: "Brasília Time — Brazil (BRT)" },
  { value: "America/Buenos_Aires", label: "Argentina Time (ART)" },
  { value: "America/Bogota", label: "Colombia Time (COT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST/CDT)" },
  { value: "Europe/London", label: "London Time (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris Time (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin Time (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam Time (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid Time (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome Time (CET/CEST)" },
  { value: "Europe/Zurich", label: "Zurich Time (CET/CEST)" },
  { value: "Europe/Stockholm", label: "Stockholm Time (CET/CEST)" },
  { value: "Europe/Moscow", label: "Moscow Time (MSK)" },
  { value: "Africa/Cairo", label: "Cairo Time (EET)" },
  { value: "Africa/Lagos", label: "Lagos Time (WAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg Time (SAST)" },
  { value: "Asia/Dubai", label: "Dubai Time (GST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Asia/Dhaka", label: "Bangladesh Time (BST)" },
  { value: "Asia/Bangkok", label: "Indochina Time (ICT)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (HKT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Asia/Seoul", label: "Korea Standard Time (KST)" },
  { value: "Australia/Sydney", label: "Sydney Time (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne Time (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Brisbane Time (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (NZST/NZDT)" },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tzOffset(tz: string) {
  try {
    const s = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value ?? tz;
    return s;
  } catch { return tz; }
}

/* ─── Types ─────────────────────────────────────────────────── */
type AvailRule = { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean };
export type CustomQuestion = { id: string; label: string; required: boolean };

/* ─── Availability row ─────────────────────────────────────── */
function AvailRow({ rule, onChange }: { rule: AvailRule; onChange: (r: AvailRule) => void }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${rule.isEnabled ? "bg-zinc-900 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/50"}`}>
      <Switch checked={rule.isEnabled} onCheckedChange={v => onChange({ ...rule, isEnabled: v })} data-testid={`avail-toggle-${rule.dayOfWeek}`} />
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

/* ─── Booking card ─────────────────────────────────────────── */
function BookingCard({ booking, onAction }: { booking: any; onAction: (id: string, status: string) => void }) {
  const isPast = new Date(booking.startTime) < new Date();
  return (
    <div data-testid={`booking-card-${booking.id}`} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition-colors group">
      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${booking.status === "cancelled" ? "bg-red-500/60" : isPast ? "bg-zinc-600" : "bg-emerald-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white">{booking.clientName}</p>
          <Badge variant="outline" className={`text-[10px] ${booking.status === "cancelled" ? "border-red-500/30 text-red-400" : booking.status === "completed" ? "border-zinc-500/30 text-zinc-400" : !isPast ? "border-emerald-500/30 text-emerald-400" : "border-zinc-600/30 text-zinc-500"}`}>
            {booking.status === "scheduled" && isPast ? "past" : booking.status}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{booking.clientEmail}</p>
        {booking.notes && <p className="text-xs text-zinc-600 mt-0.5 italic truncate max-w-xs">{booking.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-semibold text-white">{format(new Date(booking.startTime), "MMM d, yyyy")}</p>
        <p className="text-xs text-zinc-500">{format(new Date(booking.startTime), "h:mm a")}</p>
        <p className="text-xs text-zinc-600">{booking.meetingType?.duration ?? 30} min</p>
      </div>
      {booking.status === "scheduled" && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAction(booking.id, "completed")} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors" title="Mark complete"><CheckCircle2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onAction(booking.id, "cancelled")} className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors" title="Cancel"><Ban className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

/* ─── Google Calendar Widget ────────────────────────────────── */
function GoogleCalendarWidget({ calStatus, onConnect, onDisconnect, disconnecting }: {
  calStatus?: { connected: boolean; email: string | null };
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const [copiedCb, setCopiedCb] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const callbackUrl = `${window.location.origin}/api/auth/google-calendar/callback`;

  function copyCallback() {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCb(true);
    setTimeout(() => setCopiedCb(false), 2000);
  }

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
          <p className="text-xs text-zinc-500 mt-0.5">Every booking auto-generates a unique Google Meet link · <span className="text-emerald-400/70">{calStatus.email ?? ""}</span></p>
        </div>
        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 gap-1.5 flex-shrink-0" onClick={onDisconnect} disabled={disconnecting}>
          <Unlink className="w-3.5 h-3.5" /> Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      {/* Header row */}
      <div className="p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-800">
          <SiGoogle className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">Google Calendar & Meet</p>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">Not connected</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Connect once — every booking auto-creates a unique Google Meet link</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="text-zinc-500 text-xs gap-1 h-8 px-3" onClick={() => setShowSetup(s => !s)}>
            <HelpCircle className="w-3.5 h-3.5" /> {showSetup ? "Hide" : "Setup guide"}
          </Button>
          <Button data-testid="button-connect-google-calendar" size="sm" className="gap-1.5 font-bold" style={{ background: GOLD, color: "#000" }} onClick={onConnect}>
            <SiGoogle className="w-3.5 h-3.5" /> Connect
          </Button>
        </div>
      </div>

      {/* Setup instructions — collapsible */}
      {showSetup && (
        <div className="border-t border-zinc-800 bg-zinc-950/60 px-5 py-4 space-y-4">
          <p className="text-xs font-bold text-white uppercase tracking-wider">One-time Google Cloud setup</p>
          <ol className="space-y-3 text-xs text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-300 w-5 h-5 flex-shrink-0 flex items-center justify-center">1</span>
              <span>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline text-zinc-300 hover:text-white">console.cloud.google.com/apis/credentials</a> and open your OAuth 2.0 Client ID.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-300 w-5 h-5 flex-shrink-0 flex items-center justify-center">2</span>
              <span>Under <strong className="text-white">Authorized redirect URIs</strong>, click <strong className="text-white">Add URI</strong> and paste the URL below exactly:</span>
            </li>
          </ol>
          {/* Callback URL copy box */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5">
            <code className="flex-1 text-[11px] text-amber-300 font-mono break-all">{callbackUrl}</code>
            <button onClick={copyCallback} className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors ml-2">
              {copiedCb ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <ol className="space-y-3 text-xs text-zinc-400" start={3}>
            <li className="flex gap-2">
              <span className="text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-300 w-5 h-5 flex-shrink-0 flex items-center justify-center">3</span>
              <span>Click <strong className="text-white">Save</strong> in Google Cloud Console.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-300 w-5 h-5 flex-shrink-0 flex items-center justify-center">4</span>
              <span>Make sure the <strong className="text-white">Google Calendar API</strong> is enabled at <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer" className="underline text-zinc-300 hover:text-white">APIs &amp; Services → Library</a>.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-300 w-5 h-5 flex-shrink-0 flex items-center justify-center">5</span>
              <span>Click <strong className="text-white">Connect</strong> above and authorize. Done — every booking will now auto-generate a unique Meet link.</span>
            </li>
          </ol>
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
      // Save availability rules + timezone together
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
  const tzLabel = TIMEZONES.find(t => t.value === (primary?.timezone ?? "UTC"))?.label ?? primary?.timezone ?? "UTC";

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">

        {/* Title */}
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
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/60 overflow-hidden">
                  <span className="text-sm text-zinc-300 font-mono truncate">{bookingUrl}</span>
                </div>
                <Button data-testid="button-copy-link" onClick={copyLink} className="gap-2 font-bold flex-shrink-0 h-11" style={{ background: GOLD, color: "#000" }}>
                  {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11 border-zinc-700 flex-shrink-0" onClick={() => window.open(bookingUrl, "_blank")} title="Preview">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-zinc-400 text-sm mb-3">Set up your call type to get your booking link</p>
                <Button onClick={() => setSettingsOpen(true)} style={{ background: GOLD, color: "#000" }} className="font-bold">Set Up Now</Button>
              </div>
            )}
            {primary && (
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-zinc-400"><Clock className="w-3.5 h-3.5" style={{ color: GOLD }} /><span>{primary.duration} min call</span></div>
                {primary.location && <div className="flex items-center gap-2 text-xs text-zinc-400"><Video className="w-3.5 h-3.5" style={{ color: GOLD }} /><span className="truncate max-w-[160px]">{primary.location}</span></div>}
                <div className="flex items-center gap-2 text-xs text-zinc-400"><Globe className="w-3.5 h-3.5" style={{ color: GOLD }} /><span>{tzOffset(primary.timezone ?? "UTC")}</span></div>
                <div className="flex items-center gap-2 text-xs text-zinc-400"><CalendarDays className="w-3.5 h-3.5" style={{ color: GOLD }} /><span>{enabledDays.length} days available</span></div>
                {(() => { try { const qs = JSON.parse(primary.customQuestions ?? "[]"); return qs.length > 0 ? <div className="flex items-center gap-2 text-xs text-zinc-400"><HelpCircle className="w-3.5 h-3.5" style={{ color: GOLD }} /><span>{qs.length} custom question{qs.length > 1 ? "s" : ""}</span></div> : null; } catch { return null; } })()}
                <div className="flex items-center gap-2 text-xs"><div className={`w-2 h-2 rounded-full ${primary.isActive ? "bg-emerald-500" : "bg-zinc-500"}`} /><span className={primary.isActive ? "text-emerald-400" : "text-zinc-500"}>{primary.isActive ? "Accepting bookings" : "Paused"}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* ── GOOGLE CALENDAR / MEET ── */}
        <GoogleCalendarWidget calStatus={calStatus} onConnect={() => { window.location.href = "/api/auth/google-calendar"; }} onDisconnect={() => disconnectCalMutation.mutate()} disconnecting={disconnectCalMutation.isPending} />

        {/* ── CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Call Settings */}
          <button onClick={() => setSettingsOpen(true)} data-testid="button-call-settings" className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 hover:bg-zinc-900 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15` }}>
                <Settings2 className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Call Settings</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {primary ? `"${primary.title}" · ${primary.duration} min` : "Set your call name, duration, and meeting link"}
            </p>
            {(() => { try { const qs = JSON.parse(primary?.customQuestions ?? "[]"); return qs.length > 0 ? <p className="text-xs mt-1" style={{ color: `${GOLD}aa` }}>{qs.length} custom question{qs.length > 1 ? "s" : ""} added</p> : null; } catch { return null; } })()}
          </button>

          {/* Availability */}
          <button onClick={() => setAvailOpen(true)} data-testid="button-set-availability" disabled={!primary} className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600 hover:bg-zinc-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#3b82f615" }}>
                <CalendarDays className="w-4 h-4 text-blue-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Your Availability</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {enabledDays.length > 0 ? enabledDays.map(r => DAYS[r.dayOfWeek].slice(0, 3)).join(", ") : "Set which days and hours you're available"}
            </p>
            {primary?.timezone && primary.timezone !== "UTC" && (
              <p className="text-xs mt-1 text-blue-400/80">{tzOffset(primary.timezone)}</p>
            )}
          </button>
        </div>

        {/* ── BOOKINGS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" /> Bookings
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
              <p className="text-zinc-400 text-sm font-medium">No {bookingFilter === "upcoming" ? "upcoming" : ""} bookings yet</p>
              <p className="text-zinc-600 text-xs mt-1">Share your booking link to start getting calls</p>
            </div>
          ) : (
            <div className="space-y-2">{displayBookings.map((b: any) => (
              <BookingCard key={b.id} booking={b} onAction={(id, status) => updateBookingMutation.mutate({ id, status })} />
            ))}</div>
          )}
        </div>
      </div>

      {/* ── SETTINGS DIALOG ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Call Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">

            {/* Call Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Call Name</label>
              <Input data-testid="input-call-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Strategy Call" className="bg-zinc-900 border-zinc-700 text-white" />
              {title && <p className="text-[11px] text-zinc-600">Link: /book/{slugify(title) || "strategy-call"}</p>}
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
              <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                <SelectTrigger data-testid="select-duration" className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {DURATIONS.map(d => <SelectItem key={d} value={String(d)} className="text-white">{d} minutes</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Meeting Link</label>
              <Input data-testid="input-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Zoom link, Google Meet URL, or phone number" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will you cover in this call?" rows={2} className="bg-zinc-900 border-zinc-700 text-white resize-none" />
            </div>

            {/* Accept bookings toggle */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div>
                <p className="text-sm font-semibold text-white">Accept bookings</p>
                <p className="text-xs text-zinc-500">Turn off to pause all new bookings</p>
              </div>
              <Switch data-testid="toggle-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* ── CUSTOM QUESTIONS ── */}
            <div className="space-y-3 pt-1 border-t border-zinc-800">
              <div className="flex items-center gap-2 pt-3">
                <HelpCircle className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-sm font-bold text-white">Custom Questions</p>
                <span className="text-xs text-zinc-500">— ask prospects anything extra</span>
              </div>

              {customQuestions.length > 0 && (
                <div className="space-y-2">
                  {customQuestions.map((q, i) => (
                    <div key={q.id} data-testid={`custom-question-${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                      <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                      <span className="text-sm text-white flex-1 truncate">{q.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setCustomQuestions(qs => qs.map((x, j) => j === i ? { ...x, required: !x.required } : x))}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-colors ${q.required ? "border-yellow-600/40 text-yellow-500 bg-yellow-600/10" : "border-zinc-700 text-zinc-500"}`}
                        >
                          {q.required ? "Required" : "Optional"}
                        </button>
                        <button
                          onClick={() => setCustomQuestions(qs => qs.filter((_, j) => j !== i))}
                          data-testid={`remove-question-${i}`}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  data-testid="input-new-question"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addQuestion()}
                  placeholder="e.g. What's your biggest challenge right now?"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm"
                />
                <Button
                  data-testid="button-add-question"
                  type="button"
                  onClick={addQuestion}
                  disabled={!newQuestion.trim()}
                  variant="outline"
                  className="border-zinc-700 flex-shrink-0 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              <p className="text-[11px] text-zinc-600">These questions appear in the booking form after name and email. Press Enter or click Add.</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button data-testid="button-save-settings" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending || !title.trim()} className="flex-1 font-bold" style={{ background: GOLD, color: "#000" }}>
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

          {/* Timezone selector */}
          <div className="space-y-1.5 pt-1 pb-2 border-b border-zinc-800">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" /> Your Timezone
            </label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger data-testid="select-timezone" className="bg-zinc-900 border-zinc-700 text-white text-sm">
                <SelectValue placeholder="Select timezone…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-zinc-600">
              All times below are in your selected timezone. Prospects see slots in their own local time.
            </p>
          </div>

          {/* Day rows */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {rules.map((rule, i) => (
              <AvailRow key={i} rule={rule} onChange={r => setRules(rs => rs.map((x, j) => j === i ? r : x))} />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setAvailOpen(false)}>Cancel</Button>
            <Button data-testid="button-save-availability" onClick={() => saveAvailMutation.mutate()} disabled={saveAvailMutation.isPending} className="flex-1 font-bold" style={{ background: GOLD, color: "#000" }}>
              {saveAvailMutation.isPending ? "Saving…" : "Save Availability"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
