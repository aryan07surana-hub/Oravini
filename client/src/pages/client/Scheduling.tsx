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
  CalendarDays, Copy, CheckCheck, ExternalLink, Clock, Globe, Settings2, Link2, Users,
  Ban, CheckCircle2, Video, Monitor, ChevronLeft, ChevronRight, Mail, Bell,
  Sparkles, ArrowRight, Check, RefreshCw, Eye, Send, MessageSquare,
  Plus, Trash2, Edit2, Code2, Unlink, UserX, FileText, Zap,
} from "lucide-react";
import {
  format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday,
} from "date-fns";

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
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

type TabType = "scheduling" | "reminders" | "emails" | "forms" | "workflows";
type AvailRule = { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean };

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function detectPlatform(url: string): { label: string; color: string; icon: string } {
  if (!url) return { label: "No link set", color: "#52525b", icon: "🔗" };
  const u = url.toLowerCase();
  if (u.includes("zoom.us")) return { label: "Zoom", color: "#2D8CFF", icon: "🎥" };
  if (u.includes("meet.google") || u.includes("google.com/meet")) return { label: "Google Meet", color: "#34A853", icon: "🎥" };
  if (u.includes("teams.microsoft") || u.includes("teams.live")) return { label: "Microsoft Teams", color: "#5059C9", icon: "💬" };
  if (u.includes("whereby.com")) return { label: "Whereby", color: "#6C63FF", icon: "🎥" };
  if (/^\+?\d[\d\s()-]{6,}$/.test(url)) return { label: "Phone", color: "#10b981", icon: "📞" };
  return { label: "Custom Link", color: GOLD, icon: "🔗" };
}

/* ─── Week Calendar ─────────────────────────────────────────────────── */
function WeekCalendar({ bookings, weekStart, onPrev, onNext }: {
  bookings: any[]; weekStart: Date; onPrev: () => void; onNext: () => void;
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const visibleHours = HOURS.filter(h => h >= 7 && h <= 21);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <button onClick={onPrev} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-white">
          {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </p>
        <button onClick={onNext} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
      <div className="min-w-[520px]">
      <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-zinc-800">
        <div />
        {weekDays.map(day => (
          <div key={day.toISOString()} className={`p-2 text-center border-l border-zinc-800 ${isToday(day) ? "bg-yellow-500/5" : ""}`}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">{format(day, "EEE")}</p>
            <p className={`text-base font-bold ${isToday(day) ? "text-yellow-500" : "text-white"}`}>{format(day, "d")}</p>
          </div>
        ))}
      </div>
      <div className="max-h-[380px] overflow-y-auto">
        <div className="grid grid-cols-[52px_repeat(7,1fr)]">
          {visibleHours.map(hour => (
            <div key={hour} className="contents">
              <div className="h-12 flex items-start justify-end pr-2 pt-1 border-b border-zinc-800/50">
                <span className="text-[10px] text-zinc-600">{formatHour(hour)}</span>
              </div>
              {weekDays.map(day => {
                const dayBookings = bookings.filter(b => {
                  const bs = new Date(b.startTime);
                  return isSameDay(bs, day) && bs.getHours() === hour;
                });
                return (
                  <div key={`${day.toISOString()}-${hour}`} className={`h-12 border-l border-b border-zinc-800/50 relative ${isToday(day) ? "bg-yellow-500/[0.02]" : ""}`}>
                    {dayBookings.map(b => (
                      <div key={b.id} className="absolute left-0.5 right-0.5 top-0.5 rounded-md px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 overflow-hidden">
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
      </div>
    </div>
  );
}

/* ─── Avail Row ──────────────────────────────────────────────────────── */
function AvailRow({ rule, onChange }: { rule: AvailRule; onChange: (r: AvailRule) => void }) {
  const mins = (() => {
    const [sh, sm] = rule.startTime.split(":").map(Number);
    const [eh, em] = rule.endTime.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  })();
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${rule.isEnabled ? "bg-zinc-900 border border-zinc-700" : "bg-zinc-950 border border-zinc-800/50"}`}>
      <Switch checked={rule.isEnabled} onCheckedChange={v => onChange({ ...rule, isEnabled: v })} />
      <span className={`text-sm font-semibold w-24 flex-shrink-0 ${rule.isEnabled ? "text-white" : "text-zinc-500"}`}>{DAYS[rule.dayOfWeek]}</span>
      {rule.isEnabled ? (
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Input type="time" value={rule.startTime} onChange={e => onChange({ ...rule, startTime: e.target.value })} className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white" />
          <span className="text-zinc-500 text-xs">to</span>
          <Input type="time" value={rule.endTime} onChange={e => onChange({ ...rule, endTime: e.target.value })} className="w-28 text-xs bg-zinc-800 border-zinc-700 text-white" />
          {mins > 0 && <span className="text-xs text-zinc-500">{Math.floor(mins / 60)}h{mins % 60 > 0 ? ` ${mins % 60}m` : ""}</span>}
        </div>
      ) : <span className="text-xs text-zinc-600">Unavailable</span>}
    </div>
  );
}

/* ─── Onboarding Wizard ─────────────────────────────────────────────── */
function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("Strategy Call");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  });
  const [rules, setRules] = useState<AvailRule[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: i >= 1 && i <= 5 }))
  );

  const setupMutation = useMutation({
    mutationFn: async () => {
      const mt = await apiRequest("POST", "/api/scheduling/setup", { title, duration, description, location, timezone, isActive: true });
      await apiRequest("PUT", "/api/scheduling/availability", rules);
      return mt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/availability"] });
      onComplete();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const STEPS = [
    { n: 1, label: "Your call" },
    { n: 2, label: "Video platform" },
    { n: 3, label: "Availability" },
    { n: 4, label: "Launch" },
  ];
  const platform = detectPlatform(location);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}>
            <CalendarDays className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <h1 className="text-2xl font-black text-white">Set up your Scheduling</h1>
          <p className="text-zinc-500 text-sm mt-1">Create your personal booking page in 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1" : "none" }}>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0"
                  style={{
                    background: step > s.n ? "#10b981" : step === s.n ? GOLD : "rgba(255,255,255,0.08)",
                    color: step >= s.n ? "#000" : "#52525b",
                  }}
                >
                  {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.n ? "text-white" : "text-zinc-600"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 rounded-full" style={{ background: step > s.n ? "#10b981" : "rgba(255,255,255,0.08)" }} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5">

          {/* Step 1 — Call type */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-black text-white mb-1">What kind of call do you offer?</h2>
                <p className="text-zinc-500 text-sm">Give it a name your prospects will recognize.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Call Name</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Strategy Call" className="bg-zinc-950 border-zinc-700 text-white" autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className="py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: duration === d ? GOLD : "rgba(255,255,255,0.04)",
                        color: duration === d ? "#000" : "#71717a",
                        border: `1px solid ${duration === d ? GOLD : "rgba(255,255,255,0.08)"}`,
                      }}>
                      {d}m
                    </button>
                  ))}
                </div>
                <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm h-8">
                    <SelectValue placeholder="Other…" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {DURATIONS.map(d => <SelectItem key={d} value={String(d)} className="text-white">{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Description <span className="font-normal text-zinc-600 normal-case">(optional)</span>
                </label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What will you cover on this call?" rows={2} className="bg-zinc-950 border-zinc-700 text-white resize-none text-sm" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!title.trim()} className="w-full font-bold gap-2" style={{ background: GOLD, color: "#000" }}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Step 2 — Video platform */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-lg font-black text-white mb-1">Where will you meet?</h2>
                <p className="text-zinc-500 text-sm">Paste your meeting link. It's sent automatically with every booking.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Zoom", hint: "zoom.us", color: "#2D8CFF", Icon: Video },
                  { name: "Google Meet", hint: "meet.google", color: "#34A853", Icon: Monitor },
                  { name: "Teams", hint: "teams.microsoft", color: "#5059C9", Icon: MessageSquare },
                ].map(p => {
                  const active = location.toLowerCase().includes(p.hint);
                  return (
                    <div key={p.name} className="rounded-xl p-3 flex flex-col items-center gap-2 transition-all"
                      style={{ background: active ? `${p.color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? p.color + "50" : "rgba(255,255,255,0.08)"}` }}>
                      <p.Icon className="w-5 h-5" style={{ color: active ? p.color : "#52525b" }} />
                      <p className={`text-[11px] font-semibold text-center ${active ? "text-white" : "text-zinc-500"}`}>{p.name}</p>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Meeting Link</label>
                <Input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="https://zoom.us/j/123..." className="bg-zinc-950 border-zinc-700 text-white text-sm" />
                {location && <p className="text-xs" style={{ color: platform.color }}>{platform.icon} {platform.label} detected</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your Timezone</label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                    {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-zinc-700 text-white">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1 font-bold gap-2" style={{ background: GOLD, color: "#000" }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {/* Step 3 — Availability */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-lg font-black text-white mb-1">When are you available?</h2>
                <p className="text-zinc-500 text-sm">Prospects can only book within these hours.</p>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {rules.map((rule, i) => (
                  <AvailRow key={i} rule={rule} onChange={r => setRules(rs => rs.map((x, j) => j === i ? r : x))} />
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-zinc-700 text-white">Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1 font-bold gap-2" style={{ background: GOLD, color: "#000" }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {/* Step 4 — Launch */}
          {step === 4 && (
            <>
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
                  <Sparkles className="w-7 h-7" style={{ color: GOLD }} />
                </div>
                <h2 className="text-lg font-black text-white mb-1">Ready to launch!</h2>
                <p className="text-zinc-500 text-sm">Here's what gets set up automatically.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2.5">
                {[
                  `${title} · ${duration} min`,
                  location ? `${platform.label} link included` : "No video link (can add later)",
                  `${rules.filter(r => r.isEnabled).length} available days/week`,
                  "Confirmation emails auto-sent on every booking",
                  "24h and 1h reminder emails enabled by default",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-zinc-700 text-white">Back</Button>
                <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending} className="flex-1 font-bold gap-2" style={{ background: GOLD, color: "#000" }}>
                  {setupMutation.isPending
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Sparkles className="w-4 h-4" /> Launch Booking Page</>}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Settings Dialog ────────────────────────────────────────────────── */
function SettingsDialog({ open, onClose, mt }: { open: boolean; onClose: () => void; mt: any }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(mt?.title ?? "");
  const [duration, setDuration] = useState(mt?.duration ?? 30);
  const [description, setDescription] = useState(mt?.description ?? "");
  const [location, setLocation] = useState(mt?.location ?? "");
  const [timezone, setTimezone] = useState(mt?.timezone ?? "UTC");
  const [isActive, setIsActive] = useState(mt?.isActive ?? true);

  useEffect(() => {
    if (mt) {
      setTitle(mt.title); setDuration(mt.duration); setDescription(mt.description ?? "");
      setLocation(mt.location ?? ""); setTimezone(mt.timezone ?? "UTC"); setIsActive(mt.isActive ?? true);
    }
  }, [mt?.id]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scheduling/setup", { title, duration, description, location, timezone, isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/scheduling/me"] }); toast({ title: "Saved!" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const platform = detectPlatform(location);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4" style={{ color: GOLD }} /> Meeting Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Call Name</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
            <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {DURATIONS.map(d => <SelectItem key={d} value={String(d)} className="text-white">{d} minutes</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Video / Meeting Link</label>
            <Input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="https://zoom.us/j/... or Teams/Meet link" className="bg-zinc-900 border-zinc-700 text-white" />
            {location && <p className="text-xs mt-1" style={{ color: platform.color }}>{platform.icon} {platform.label} detected</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Description <span className="font-normal text-zinc-600 normal-case">(optional)</span>
            </label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="bg-zinc-900 border-zinc-700 text-white resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Timezone</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div>
              <p className="text-sm font-semibold text-white">Accept bookings</p>
              <p className="text-xs text-zinc-500">Pause to stop new bookings temporarily</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-zinc-700 text-white" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !title.trim()}
              className="flex-1 font-bold" style={{ background: GOLD, color: "#000" }}>
              {saveMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PRESET_COLORS = ["#d4b461", "#60a5fa", "#34d399", "#f472b6", "#a78bfa", "#fb923c"];

/* ─── Google Calendar Panel ─────────────────────────────────────────── */
function GoogleCalendarPanel() {
  const { toast } = useToast();
  const [copiedCal, setCopiedCal] = useState(false);

  const { data: calStatus, isLoading: calLoading, refetch } = useQuery<any>({
    queryKey: ["/api/scheduling/google-calendar/status"],
    queryFn: () =>
      fetch("/api/scheduling/google-calendar/status").then(async r => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    retry: false,
  });

  const disconnectMutation = useMutation({
    mutationFn: () =>
      fetch("/api/scheduling/google-calendar/disconnect", { method: "DELETE" }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/google-calendar/status"] });
      toast({ title: "Google Calendar disconnected" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (calLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-3 w-64 bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  const connected = calStatus?.connected;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: connected ? "#34A85318" : "rgba(255,255,255,0.04)" }}
        >
          <CalendarDays className="w-4 h-4" style={{ color: connected ? "#34A853" : "#52525b" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Google Calendar</p>
          <p className="text-xs text-zinc-500">
            {connected ? "Syncing bookings automatically" : "Connect to sync bookings to your calendar"}
          </p>
        </div>
        {connected && (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Connected</Badge>
        )}
      </div>

      {connected ? (
        <div className="space-y-3">
          {calStatus?.email && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-xs text-zinc-300 font-mono truncate">{calStatus.email}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            <Unlink className="w-3.5 h-3.5" />
            {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <Button
          className="gap-2 font-bold"
          style={{ background: "#34A853", color: "#fff" }}
          onClick={() => window.location.href = "/api/auth/google-calendar"}
        >
          <CalendarDays className="w-4 h-4" />
          Connect Google Calendar
        </Button>
      )}
    </div>
  );
}

/* ─── New Meeting Type Form ──────────────────────────────────────────── */
function NewMeetingTypeForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/scheduling/meeting-types", { title, duration, description, color }),
    onSuccess: () => {
      onSaved();
      toast({ title: "Meeting type created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">New Meeting Type</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-xs">Cancel</button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Strategy Call"
          className="bg-zinc-950 border-zinc-700 text-white text-sm"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration (minutes)</label>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 45, 60].map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className="py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: duration === d ? GOLD : "rgba(255,255,255,0.04)",
                color: duration === d ? "#000" : "#71717a",
                border: `1px solid ${duration === d ? GOLD : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {d}m
            </button>
          ))}
        </div>
        <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
          <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm h-8">
            <SelectValue placeholder="Other…" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {DURATIONS.map(d => <SelectItem key={d} value={String(d)} className="text-white">{d} min</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Description <span className="font-normal text-zinc-600 normal-case">(optional)</span>
        </label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What will you cover?"
          rows={2}
          className="bg-zinc-950 border-zinc-700 text-white resize-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Color</label>
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-all flex-shrink-0"
              style={{
                background: c,
                boxShadow: color === c ? `0 0 0 2px #080808, 0 0 0 4px ${c}` : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1 border-zinc-700 text-white" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1 font-bold"
          style={{ background: GOLD, color: "#000" }}
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !title.trim()}
        >
          {createMutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* ─── Meeting Type Card ──────────────────────────────────────────────── */
function MeetingTypeCard({ mt: item, onEdit, onDelete }: { mt: any; onEdit: (mt: any) => void; onDelete: (id: string) => void }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const bookingUrl = `${window.location.origin}/book/${item.slug}`;
  const embedCode = `<iframe src="${window.location.origin}/book/embed/${item.slug}" width="100%" height="700" frameborder="0"></iframe>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: item.color || GOLD }}
          />
          <div>
            <p className="text-sm font-bold text-white">{item.title}</p>
            {item.description && <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-zinc-500 mr-2">{item.duration}m</span>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => window.open(bookingUrl, "_blank")}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          <Eye className="w-3 h-3" /> Preview
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(bookingUrl); }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          <Copy className="w-3 h-3" /> Copy Link
        </button>
        <button
          onClick={() => setShowEmbed(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            borderColor: showEmbed ? `${GOLD}50` : "#3f3f46",
            color: showEmbed ? GOLD : "#71717a",
            background: showEmbed ? `${GOLD}10` : "transparent",
          }}
        >
          <Code2 className="w-3 h-3" /> Embed
        </button>
      </div>

      {/* Embed widget */}
      {showEmbed && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Embed Widget</p>
            <button
              onClick={copyEmbed}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
              style={{ background: embedCopied ? "#10b981" : GOLD, color: "#000" }}
            >
              {embedCopied ? <><CheckCheck className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Code</>}
            </button>
          </div>
          <pre className="text-[11px] text-zinc-400 font-mono bg-zinc-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
          <p className="text-[11px] text-zinc-600">Paste this HTML anywhere on your website to embed the booking widget.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Edit Meeting Type Dialog ───────────────────────────────────────── */
function EditMeetingTypeDialog({ open, onClose, mt: item }: { open: boolean; onClose: () => void; mt: any }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [duration, setDuration] = useState(item?.duration ?? 30);
  const [description, setDescription] = useState(item?.description ?? "");
  const [color, setColor] = useState(item?.color ?? PRESET_COLORS[0]);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDuration(item.duration);
      setDescription(item.description ?? "");
      setColor(item.color ?? PRESET_COLORS[0]);
    }
  }, [item?.id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/scheduling/meeting-types/${item.id}`, { title, duration, description, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/meeting-types"] });
      toast({ title: "Saved!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Edit2 className="w-4 h-4" style={{ color: GOLD }} /> Edit Meeting Type
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
            <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {DURATIONS.map(d => <SelectItem key={d} value={String(d)} className="text-white">{d} minutes</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Description <span className="font-normal text-zinc-600 normal-case">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="bg-zinc-900 border-zinc-700 text-white resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Color</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    boxShadow: color === c ? `0 0 0 2px #09090b, 0 0 0 4px ${c}` : "none",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-zinc-700 text-white" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 font-bold"
              style={{ background: GOLD, color: "#000" }}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !title.trim()}
            >
              {saveMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Workflows Tab ──────────────────────────────────────────────────── */
const TRIGGER_OPTIONS = [
  { value: "booking.created",      label: "When booking is created" },
  { value: "booking.cancelled",    label: "When booking is cancelled" },
  { value: "booking.completed",    label: "When booking is marked completed" },
  { value: "booking.no_show",      label: "When marked as no-show" },
  { value: "booking.reminder_24h", label: "24 hours before booking" },
  { value: "booking.reminder_1h",  label: "1 hour before booking" },
];
const ACTION_OPTIONS = [
  { value: "send_email", label: "Send Email" },
  { value: "webhook",    label: "Send Webhook" },
];
function triggerLabel(t: string) {
  return TRIGGER_OPTIONS.find(o => o.value === t)?.label ?? t;
}

type WorkflowFormState = {
  name: string;
  trigger: string;
  action: string;
  meetingTypeId: string;
  emailSubject: string;
  emailBody: string;
  webhookUrl: string;
};

function emptyForm(): WorkflowFormState {
  return { name: "", trigger: "booking.created", action: "send_email", meetingTypeId: "", emailSubject: "", emailBody: "", webhookUrl: "" };
}

function WorkflowForm({
  initial,
  meetingTypes,
  onSave,
  onCancel,
  saving,
}: {
  initial: WorkflowFormState;
  meetingTypes: any[];
  onSave: (f: WorkflowFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<WorkflowFormState>(initial);
  function set<K extends keyof WorkflowFormState>(k: K, v: WorkflowFormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</label>
        <Input
          value={form.name}
          onChange={e => set("name", e.target.value)}
          placeholder="e.g. Follow-up after call"
          className="bg-zinc-900 border-zinc-700 text-white text-sm"
        />
      </div>

      {/* Trigger */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Trigger</label>
        <Select value={form.trigger} onValueChange={v => set("trigger", v)}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {TRIGGER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-white text-sm">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Meeting Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Meeting Type <span className="font-normal text-zinc-600 normal-case">(optional)</span>
        </label>
        <Select value={form.meetingTypeId || "__all__"} onValueChange={v => set("meetingTypeId", v === "__all__" ? "" : v)}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="__all__" className="text-white text-sm">All Types</SelectItem>
            {meetingTypes.map((mt: any) => (
              <SelectItem key={mt.id} value={String(mt.id)} className="text-white text-sm">{mt.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Action</label>
        <Select value={form.action} onValueChange={v => set("action", v)}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {ACTION_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-white text-sm">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional fields */}
      {form.action === "send_email" && (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject</label>
            <Input
              value={form.emailSubject}
              onChange={e => set("emailSubject", e.target.value)}
              placeholder="e.g. Thanks for the call, {{name}}!"
              className="bg-zinc-900 border-zinc-700 text-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Body</label>
            <Textarea
              value={form.emailBody}
              onChange={e => set("emailBody", e.target.value)}
              placeholder={"Hey {{name}},\n\nThank you for booking {{title}} on {{date}}.\n\nLooking forward to speaking with you!"}
              rows={5}
              className="bg-zinc-900 border-zinc-700 text-white resize-none text-sm font-mono"
            />
            <p className="text-[11px] text-zinc-600">
              Available variables:{" "}
              {["{{name}}", "{{title}}", "{{date}}"].map(v => (
                <code key={v} className="text-yellow-400 text-[11px] mr-1">{v}</code>
              ))}
            </p>
          </div>
        </div>
      )}

      {form.action === "webhook" && (
        <div className="space-y-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Webhook URL</label>
          <Input
            value={form.webhookUrl}
            onChange={e => set("webhookUrl", e.target.value)}
            placeholder="https://hooks.example.com/my-webhook"
            className="bg-zinc-900 border-zinc-700 text-white text-sm font-mono"
          />
        </div>
      )}

      {/* Form actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 border-zinc-700 text-white" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1 font-bold"
          style={{ background: GOLD, color: "#000" }}
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
        >
          {saving ? "Saving…" : "Save Workflow"}
        </Button>
      </div>
    </div>
  );
}

function WorkflowEditorDialog({
  open,
  onClose,
  workflow,
  meetingTypes,
}: {
  open: boolean;
  onClose: () => void;
  workflow: any;
  meetingTypes: any[];
}) {
  const { toast } = useToast();
  const initial: WorkflowFormState = {
    name: workflow?.name ?? "",
    trigger: workflow?.trigger ?? "booking.created",
    action: workflow?.action ?? "send_email",
    meetingTypeId: workflow?.meetingTypeId ? String(workflow.meetingTypeId) : "",
    emailSubject: workflow?.emailSubject ?? "",
    emailBody: workflow?.emailBody ?? "",
    webhookUrl: workflow?.webhookUrl ?? "",
  };

  const updateMutation = useMutation({
    mutationFn: (f: WorkflowFormState) =>
      apiRequest("PUT", `/api/scheduling/workflows/${workflow.id}`, {
        name: f.name,
        trigger: f.trigger,
        action: f.action,
        meetingTypeId: f.meetingTypeId || null,
        emailSubject: f.emailSubject || null,
        emailBody: f.emailBody || null,
        webhookUrl: f.webhookUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/workflows"] });
      toast({ title: "Workflow updated" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GOLD }} /> Edit Workflow
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <WorkflowForm
            initial={initial}
            meetingTypes={meetingTypes}
            onSave={f => updateMutation.mutate(f)}
            onCancel={onClose}
            saving={updateMutation.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowCard({
  workflow,
  meetingTypes,
  onEdit,
  onDelete,
}: {
  workflow: any;
  meetingTypes: any[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const isEmail = workflow.action === "send_email";
  const meetingType = meetingTypes.find((mt: any) => String(mt.id) === String(workflow.meetingTypeId));

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/scheduling/workflows/${workflow.id}/toggle`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scheduling/workflows"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 group hover:bg-zinc-900 transition-colors">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}25` }}
      >
        <Zap className="w-4 h-4" style={{ color: GOLD }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-white truncate">{workflow.name}</p>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isEmail ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}
          >
            {isEmail ? "Send Email" : "Webhook"}
          </span>
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">{triggerLabel(workflow.trigger)}</p>
        <p className="text-[11px] text-zinc-600 mt-0.5">
          {meetingType ? meetingType.title : "All types"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch
          checked={!!workflow.isActive}
          onCheckedChange={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
        />
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const EXAMPLE_WORKFLOWS = [
  { name: "Follow-up email",    trigger: "booking.completed", action: "send_email", desc: "Send a thank-you after every completed call" },
  { name: "No-show alert",      trigger: "booking.no_show",   action: "send_email", desc: "Notify yourself when someone doesn't show up" },
  { name: "Webhook on booking", trigger: "booking.created",   action: "webhook",    desc: "Push data to your CRM or Zapier on new bookings" },
];

function WorkflowsTab({ meetingTypes }: { meetingTypes: any[] }) {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  const { data: workflows = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/scheduling/workflows"],
  });

  const createMutation = useMutation({
    mutationFn: (f: WorkflowFormState) =>
      apiRequest("POST", "/api/scheduling/workflows", {
        name: f.name,
        trigger: f.trigger,
        action: f.action,
        meetingTypeId: f.meetingTypeId || null,
        emailSubject: f.emailSubject || null,
        emailBody: f.emailBody || null,
        webhookUrl: f.webhookUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/workflows"] });
      setShowNew(false);
      toast({ title: "Workflow created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scheduling/workflows/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/workflows"] });
      toast({ title: "Workflow deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isEmpty = !isLoading && (workflows as any[]).length === 0;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: GOLD }} />
          <h2 className="text-sm font-bold text-white">Automation Workflows</h2>
          {(workflows as any[]).length > 0 && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
              {(workflows as any[]).length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="gap-1.5 font-bold text-xs"
          style={{ background: GOLD, color: "#000" }}
          onClick={() => setShowNew(v => !v)}
        >
          <Plus className="w-3.5 h-3.5" /> New Workflow
        </Button>
      </div>

      {/* New workflow inline form */}
      {showNew && (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
          <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} /> New Workflow
          </p>
          <WorkflowForm
            initial={emptyForm()}
            meetingTypes={meetingTypes}
            onSave={f => createMutation.mutate(f)}
            onCancel={() => setShowNew(false)}
            saving={createMutation.isPending}
          />
        </div>
      )}

      {/* Empty state with feature showcase */}
      {isEmpty && !showNew && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}
            >
              <Zap className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <p className="text-base font-bold text-white">No workflows yet</p>
            <p className="text-sm text-zinc-500 mt-1 max-w-xs">
              Automate follow-ups, no-show alerts, and more.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Example workflows</p>
            {EXAMPLE_WORKFLOWS.map(ex => (
              <div
                key={ex.name}
                className="flex items-center gap-4 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}20` }}
                >
                  <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{ex.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{ex.desc}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ex.action === "send_email" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}
                >
                  {ex.action === "send_email" ? "Email" : "Webhook"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow list */}
      {!isEmpty && (
        <div className="space-y-3">
          {(workflows as any[]).map((wf: any) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              meetingTypes={meetingTypes}
              onEdit={() => setEditingWorkflow(wf)}
              onDelete={() => deleteMutation.mutate(wf.id)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingWorkflow && (
        <WorkflowEditorDialog
          open={!!editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
          workflow={editingWorkflow}
          meetingTypes={meetingTypes}
        />
      )}
    </div>
  );
}

/* ─── Routing Forms ──────────────────────────────────────────────────── */
type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "radio" | "checkbox";
  options: string[] | null;
  required: boolean;
  orderIndex: number;
};

type RoutingForm = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  meetingTypeId: string | null;
  fields: FormField[];
};

type FormRule = {
  id: string;
  fieldId: string;
  operator: "equals" | "contains" | "not_equals";
  value: string;
  action: "route_to" | "block" | "show_message";
  targetMeetingTypeId: string | null;
  message: string | null;
};

function FormEditorDialog({ form, onClose, meetingTypes }: {
  form: RoutingForm;
  onClose: () => void;
  meetingTypes: any[];
}) {
  const { toast } = useToast();

  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormField["type"]>("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState("");

  const [ruleFieldId, setRuleFieldId] = useState("");
  const [ruleOperator, setRuleOperator] = useState<FormRule["operator"]>("equals");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleAction, setRuleAction] = useState<FormRule["action"]>("route_to");
  const [ruleTargetMtId, setRuleTargetMtId] = useState("");
  const [ruleMessage, setRuleMessage] = useState("");

  const { data: fields = [] } = useQuery<FormField[]>({
    queryKey: [`/api/scheduling/routing-forms/${form.id}/fields`],
    queryFn: () => apiRequest("GET", `/api/scheduling/routing-forms/${form.id}/fields`),
  });

  const { data: rules = [] } = useQuery<FormRule[]>({
    queryKey: [`/api/scheduling/routing-forms/${form.id}/rules`],
    queryFn: () => apiRequest("GET", `/api/scheduling/routing-forms/${form.id}/rules`),
  });

  const addFieldMutation = useMutation({
    mutationFn: () => {
      const body: any = { label: fieldLabel, type: fieldType, required: fieldRequired };
      if (fieldType === "select" || fieldType === "radio") {
        body.options = fieldOptions.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      return apiRequest("POST", `/api/scheduling/routing-forms/${form.id}/fields`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scheduling/routing-forms/${form.id}/fields`] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/routing-forms"] });
      setFieldLabel("");
      setFieldType("text");
      setFieldRequired(false);
      setFieldOptions("");
      toast({ title: "Field added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) =>
      apiRequest("DELETE", `/api/scheduling/routing-forms/${form.id}/fields/${fieldId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scheduling/routing-forms/${form.id}/fields`] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/routing-forms"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addRuleMutation = useMutation({
    mutationFn: () => {
      const body: any = { fieldId: ruleFieldId, operator: ruleOperator, value: ruleValue, action: ruleAction };
      if (ruleAction === "route_to") body.targetMeetingTypeId = ruleTargetMtId;
      if (ruleAction === "show_message") body.message = ruleMessage;
      return apiRequest("POST", `/api/scheduling/routing-forms/${form.id}/rules`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scheduling/routing-forms/${form.id}/rules`] });
      setRuleFieldId("");
      setRuleOperator("equals");
      setRuleValue("");
      setRuleAction("route_to");
      setRuleTargetMtId("");
      setRuleMessage("");
      toast({ title: "Rule added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      apiRequest("DELETE", `/api/scheduling/routing-forms/${form.id}/rules/${ruleId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [`/api/scheduling/routing-forms/${form.id}/rules`] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const needsOptions = fieldType === "select" || fieldType === "radio";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: GOLD }} />
            {form.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left: Fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fields</p>

            {(fields as FormField[]).length === 0 ? (
              <p className="text-xs text-zinc-600 py-2">No fields yet.</p>
            ) : (
              <div className="space-y-2">
                {(fields as FormField[]).map(f => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900">
                    <div>
                      <p className="text-sm font-medium text-white">{f.label}</p>
                      <p className="text-[11px] text-zinc-500">{f.type}{f.required ? " · required" : ""}</p>
                    </div>
                    <button
                      onClick={() => deleteFieldMutation.mutate(f.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Add Field</p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Label</label>
                <Input
                  value={fieldLabel}
                  onChange={e => setFieldLabel(e.target.value)}
                  placeholder="e.g. Company size"
                  className="bg-zinc-950 border-zinc-700 text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Type</label>
                <Select value={fieldType} onValueChange={v => setFieldType(v as FormField["type"])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(["text", "email", "phone", "select", "radio", "checkbox"] as const).map(t => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsOptions && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Options (comma-separated)</label>
                  <Input
                    value={fieldOptions}
                    onChange={e => setFieldOptions(e.target.value)}
                    placeholder="Option A, Option B, Option C"
                    className="bg-zinc-950 border-zinc-700 text-white text-sm"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Required</label>
                <Switch checked={fieldRequired} onCheckedChange={setFieldRequired} />
              </div>
              <Button
                size="sm"
                className="w-full font-bold"
                style={{ background: GOLD, color: "#000" }}
                onClick={() => addFieldMutation.mutate()}
                disabled={addFieldMutation.isPending || !fieldLabel.trim()}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {addFieldMutation.isPending ? "Adding…" : "Add Field"}
              </Button>
            </div>
          </div>

          {/* Right: Rules */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Routing Rules</p>

            {(rules as FormRule[]).length === 0 ? (
              <p className="text-xs text-zinc-600 py-2">No rules yet.</p>
            ) : (
              <div className="space-y-2">
                {(rules as FormRule[]).map(r => {
                  const fieldName = (fields as FormField[]).find(f => f.id === r.fieldId)?.label ?? r.fieldId;
                  const mtName = meetingTypes.find((m: any) => m.id === r.targetMeetingTypeId)?.title;
                  return (
                    <div key={r.id} className="flex items-start justify-between px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          If <span style={{ color: GOLD }}>{fieldName}</span> {r.operator.replace("_", " ")} "<span className="text-zinc-300">{r.value}</span>"
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {r.action === "route_to"
                            ? `→ Route to ${mtName ?? r.targetMeetingTypeId}`
                            : r.action === "show_message"
                            ? `→ Show: "${r.message}"`
                            : "→ Block"}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteRuleMutation.mutate(r.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Add Rule</p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Field</label>
                <Select value={ruleFieldId} onValueChange={setRuleFieldId}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm">
                    <SelectValue placeholder="Select field…" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(fields as FormField[]).map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-white">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Operator</label>
                <Select value={ruleOperator} onValueChange={v => setRuleOperator(v as FormRule["operator"])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(["equals", "contains", "not_equals"] as const).map(op => (
                      <SelectItem key={op} value={op} className="text-white">{op.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Value</label>
                <Input
                  value={ruleValue}
                  onChange={e => setRuleValue(e.target.value)}
                  placeholder="e.g. 10+"
                  className="bg-zinc-950 border-zinc-700 text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Action</label>
                <Select value={ruleAction} onValueChange={v => setRuleAction(v as FormRule["action"])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(["route_to", "block", "show_message"] as const).map(a => (
                      <SelectItem key={a} value={a} className="text-white">{a.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ruleAction === "route_to" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Target Meeting Type</label>
                  <Select value={ruleTargetMtId} onValueChange={setRuleTargetMtId}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm">
                      <SelectValue placeholder="Select meeting type…" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {meetingTypes.map((m: any) => (
                        <SelectItem key={m.id} value={m.id} className="text-white">{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {ruleAction === "show_message" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Message</label>
                  <Input
                    value={ruleMessage}
                    onChange={e => setRuleMessage(e.target.value)}
                    placeholder="e.g. Sorry, we only work with companies of 10+ people."
                    className="bg-zinc-950 border-zinc-700 text-white text-sm"
                  />
                </div>
              )}
              <Button
                size="sm"
                className="w-full font-bold"
                style={{ background: GOLD, color: "#000" }}
                onClick={() => addRuleMutation.mutate()}
                disabled={addRuleMutation.isPending || !ruleFieldId || !ruleValue}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {addRuleMutation.isPending ? "Adding…" : "Add Rule"}
              </Button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Embed</p>
              <p className="text-xs text-zinc-600">
                Attach to a meeting type to pre-qualify bookers before they reach the scheduling page.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormsTab() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMeetingTypeId, setNewMeetingTypeId] = useState("");
  const [editingForm, setEditingForm] = useState<RoutingForm | null>(null);

  const { data: forms = [] } = useQuery<RoutingForm[]>({
    queryKey: ["/api/scheduling/routing-forms"],
  });

  const { data: meetingTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduling/meeting-types"],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/scheduling/routing-forms", {
        title: newTitle,
        description: newDescription || null,
        meetingTypeId: newMeetingTypeId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/routing-forms"] });
      setShowNew(false);
      setNewTitle("");
      setNewDescription("");
      setNewMeetingTypeId("");
      toast({ title: "Form created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PUT", `/api/scheduling/routing-forms/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scheduling/routing-forms"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/scheduling/routing-forms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/routing-forms"] });
      toast({ title: "Form deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: GOLD }} />
            <p className="text-sm font-bold text-white">Routing Forms</p>
            {(forms as RoutingForm[]).length > 0 && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                {(forms as RoutingForm[]).length}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            className="gap-1.5 font-bold text-xs"
            style={{ background: GOLD, color: "#000" }}
            onClick={() => setShowNew(v => !v)}
          >
            <Plus className="w-3.5 h-3.5" /> New Form
          </Button>
        </div>

        {showNew && (
          <div className="mb-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">New Routing Form</p>
              <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-white transition-colors text-xs">Cancel</button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Pre-qualification Form"
                className="bg-zinc-950 border-zinc-700 text-white text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Description <span className="font-normal text-zinc-600 normal-case">(optional)</span>
              </label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Help us understand your needs before the call."
                rows={2}
                className="bg-zinc-950 border-zinc-700 text-white resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Meeting Type <span className="font-normal text-zinc-600 normal-case">(optional)</span>
              </label>
              <Select value={newMeetingTypeId} onValueChange={setNewMeetingTypeId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white text-sm">
                  <SelectValue placeholder="None selected" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(meetingTypes as any[]).map((m: any) => (
                    <SelectItem key={m.id} value={m.id} className="text-white">{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 border-zinc-700 text-white" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 font-bold"
                style={{ background: GOLD, color: "#000" }}
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newTitle.trim()}
              >
                {createMutation.isPending ? "Creating…" : "Create Form"}
              </Button>
            </div>
          </div>
        )}

        {(forms as RoutingForm[]).length === 0 && !showNew ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="w-10 h-10 mb-3" style={{ color: `${GOLD}40` }} />
            <p className="text-zinc-500 text-sm">No routing forms yet</p>
            <p className="text-zinc-700 text-xs mt-1">Create a form to pre-qualify bookers before they schedule</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(forms as RoutingForm[]).map(form => {
              const linkedMt = (meetingTypes as any[]).find((m: any) => m.id === form.meetingTypeId);
              return (
                <div key={form.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white">{form.title}</p>
                        {form.isActive
                          ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>
                          : <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/30 text-[10px]">Paused</Badge>}
                        <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">
                          {form.fields.length} field{form.fields.length !== 1 ? "s" : ""}
                        </Badge>
                        {linkedMt && (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">
                            → {linkedMt.title}
                          </Badge>
                        )}
                      </div>
                      {form.description && (
                        <p className="text-xs text-zinc-500 mt-1">{form.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={form.isActive}
                        onCheckedChange={v => toggleActiveMutation.mutate({ id: form.id, isActive: v })}
                      />
                      <button
                        onClick={() => setEditingForm(form)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(form.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingForm && (
        <FormEditorDialog
          form={editingForm}
          onClose={() => setEditingForm(null)}
          meetingTypes={meetingTypes as any[]}
        />
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function ClientScheduling() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("scheduling");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [rules, setRules] = useState<AvailRule[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: i >= 1 && i <= 5 }))
  );
  const [timezone, setTimezone] = useState("UTC");

  // Reminders
  const [rem24h, setRem24h] = useState(true);
  const [rem1h, setRem1h] = useState(true);
  const [remCustomMsg, setRemCustomMsg] = useState("");

  // Emails
  const [confirmSubject, setConfirmSubject] = useState("Booking Confirmed: {{title}}");
  const [confirmBody, setConfirmBody] = useState("");
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDelay, setFollowUpDelay] = useState(24);
  const [followUpSubject, setFollowUpSubject] = useState("How did our call go, {{name}}?");
  const [followUpBody, setFollowUpBody] = useState("");

  const [showNewMtForm, setShowNewMtForm] = useState(false);
  const [editingMt, setEditingMt] = useState<any>(null);

  const { data: mt, isLoading: mtLoading } = useQuery<any>({ queryKey: ["/api/scheduling/me"] });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/scheduling/bookings"] });
  const { data: availRules = [] } = useQuery<any[]>({ queryKey: ["/api/scheduling/availability"], enabled: !!mt });
  const { data: config } = useQuery<any>({ queryKey: ["/api/scheduling/config"], enabled: !!mt });
  const { data: meetingTypes = [], refetch: refetchMeetingTypes } = useQuery<any[]>({
    queryKey: ["/api/scheduling/meeting-types"],
    enabled: !!mt,
  });

  const deleteMeetingType = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/scheduling/meeting-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/meeting-types"] });
      toast({ title: "Meeting type deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Handle Google Calendar OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calConnected = params.get("cal_connected");
    const calError = params.get("cal_error");
    if (calConnected === "1") {
      toast({ title: "Google Calendar connected!", description: "Your bookings will now sync automatically." });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/google-calendar/status"] });
      // Remove param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("cal_connected");
      window.history.replaceState({}, "", url.toString());
    } else if (calError) {
      toast({ title: "Google Calendar connection failed", description: decodeURIComponent(calError), variant: "destructive" });
      const url = new URL(window.location.href);
      url.searchParams.delete("cal_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (availRules.length > 0) {
      setRules(DAYS.map((_, i) => {
        const r = availRules.find((x: any) => x.dayOfWeek === i);
        return r ? { dayOfWeek: i, startTime: r.startTime, endTime: r.endTime, isEnabled: r.isEnabled ?? true }
          : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: false };
      }));
    }
    if (mt?.timezone) setTimezone(mt.timezone);
  }, [availRules.length, mt?.timezone]);

  useEffect(() => {
    if (config) {
      const rem = config.reminders ?? {};
      setRem24h(rem.reminder24h !== false);
      setRem1h(rem.reminder1h !== false);
      setRemCustomMsg(rem.customMessage ?? "");
      const em = config.emails ?? {};
      if (em.confirmationSubject) setConfirmSubject(em.confirmationSubject);
      if (em.confirmationBody) setConfirmBody(em.confirmationBody);
      setFollowUpEnabled(em.followUpEnabled ?? false);
      setFollowUpDelay(em.followUpDelayHours ?? 24);
      if (em.followUpSubject) setFollowUpSubject(em.followUpSubject);
      if (em.followUpBody) setFollowUpBody(em.followUpBody);
    }
  }, [config]);

  const availMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/scheduling/setup", { title: mt?.title, duration: mt?.duration, description: mt?.description, location: mt?.location, timezone, isActive: mt?.isActive });
      await apiRequest("PUT", "/api/scheduling/availability", rules);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/me"] });
      toast({ title: "Availability saved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveRemindersMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/scheduling/config", {
      ...(config ?? {}),
      reminders: { reminder24h: rem24h, reminder1h: rem1h, customMessage: remCustomMsg },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/scheduling/config"] }); toast({ title: "Reminder settings saved!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveEmailsMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/scheduling/config", {
      ...(config ?? {}),
      emails: {
        confirmationSubject: confirmSubject,
        confirmationBody: confirmBody || null,
        followUpEnabled,
        followUpDelayHours: followUpDelay,
        followUpSubject,
        followUpBody: followUpBody || null,
      },
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/scheduling/config"] }); toast({ title: "Email settings saved!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/scheduling/bookings/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scheduling/bookings"] }),
  });

  const noShowMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/scheduling/bookings/${id}/no-show`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/bookings"] });
      toast({ title: "Marked as no-show" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bookingUrl = mt ? `${window.location.origin}/book/${mt.slug}` : null;
  const platform = detectPlatform(mt?.location ?? "");
  const upcomingBookings = (bookings as any[]).filter(b => b.status === "scheduled" && new Date(b.startTime) > new Date());

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!mtLoading && !mt) {
    return (
      <ClientLayout>
        <OnboardingWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["/api/scheduling/me"] })} />
      </ClientLayout>
    );
  }

  if (mtLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
        </div>
      </ClientLayout>
    );
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
                {mt?.isActive
                  ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>
                  : <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600/30 text-[10px]">Paused</Badge>}
              </div>
              <p className="text-zinc-500 text-sm">Your personal booking page — fully automated.</p>
            </div>
            <Button onClick={() => setSettingsOpen(true)} variant="outline" className="gap-2 border-zinc-700 text-zinc-300">
              <Settings2 className="w-4 h-4" /> Settings
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Upcoming", value: upcomingBookings.length, sub: "calls booked", Icon: CalendarDays, color: GOLD },
              { label: "Duration", value: `${mt?.duration}m`, sub: "per call", Icon: Clock, color: "#60a5fa" },
              { label: "Available", value: `${rules.filter(r => r.isEnabled).length}d`, sub: "per week", Icon: Globe, color: "#34d399" },
              { label: "Platform", value: platform.label, sub: "video link", Icon: Video, color: platform.color },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">{s.label}</span>
                </div>
                <p className="text-xl font-black text-white truncate">{s.value}</p>
                <p className="text-[10px] text-zinc-600">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit mb-6">
            {([
              { id: "scheduling" as TabType, label: "Scheduling", Icon: CalendarDays },
              { id: "reminders" as TabType, label: "Reminders", Icon: Bell },
              { id: "emails" as TabType, label: "Emails", Icon: Mail },
              { id: "forms" as TabType, label: "Forms", Icon: FileText },
              { id: "workflows" as TabType, label: "Workflows", Icon: Zap },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ background: activeTab === tab.id ? GOLD : "transparent", color: activeTab === tab.id ? "#000" : "#71717a" }}>
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══ SCHEDULING TAB ══ */}
          {activeTab === "scheduling" && (
            <div className="space-y-5">

              {/* Google Calendar */}
              <GoogleCalendarPanel />

              {/* Meeting Types */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
                    <p className="text-sm font-bold text-white">Meeting Types</p>
                    {(meetingTypes as any[]).length > 0 && (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                        {(meetingTypes as any[]).length}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 font-bold text-xs"
                    style={{ background: GOLD, color: "#000" }}
                    onClick={() => setShowNewMtForm(v => !v)}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Meeting Type
                  </Button>
                </div>

                {showNewMtForm && (
                  <div className="mb-4">
                    <NewMeetingTypeForm
                      onClose={() => setShowNewMtForm(false)}
                      onSaved={() => {
                        setShowNewMtForm(false);
                        queryClient.invalidateQueries({ queryKey: ["/api/scheduling/meeting-types"] });
                      }}
                    />
                  </div>
                )}

                {(meetingTypes as any[]).length === 0 && !showNewMtForm ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarDays className="w-10 h-10 mb-3" style={{ color: `${GOLD}40` }} />
                    <p className="text-zinc-500 text-sm">No meeting types yet</p>
                    <p className="text-zinc-700 text-xs mt-1">Create your first meeting type above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(meetingTypes as any[]).map((item: any) => (
                      <MeetingTypeCard
                        key={item.id}
                        mt={item}
                        onEdit={m => setEditingMt(m)}
                        onDelete={id => deleteMeetingType.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Booking link */}
              <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                    <Link2 className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Your Booking Link</p>
                    <p className="text-xs text-zinc-500">Share this — anyone can book a call with you directly</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 gap-1.5 flex-shrink-0"
                    onClick={() => window.open(bookingUrl!, "_blank")}>
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 min-w-0">
                    <span className="text-sm text-zinc-300 font-mono truncate">{bookingUrl}</span>
                  </div>
                  <Button onClick={copyLink} className="gap-2 font-bold flex-shrink-0" style={{ background: GOLD, color: "#000" }}>
                    {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </Button>
                  <Button variant="outline" size="icon" className="border-zinc-700 flex-shrink-0"
                    onClick={() => window.open(bookingUrl!, "_blank")}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Video platform */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-white">Video Platform</p>
                  <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400" onClick={() => setSettingsOpen(true)}>
                    Edit Link
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { name: "Zoom", hint: "zoom.us", color: "#2D8CFF", Icon: Video },
                    { name: "Google Meet", hint: "meet.google", color: "#34A853", Icon: Monitor },
                    { name: "Microsoft Teams", hint: "teams.microsoft", color: "#5059C9", Icon: MessageSquare },
                  ].map(p => {
                    const active = (mt?.location ?? "").toLowerCase().includes(p.hint);
                    return (
                      <div key={p.name} className="rounded-xl p-3 text-center transition-all"
                        style={{ background: active ? `${p.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${active ? p.color + "40" : "rgba(255,255,255,0.07)"}` }}>
                        <p.Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: active ? p.color : "#52525b" }} />
                        <p className={`text-[11px] font-semibold ${active ? "text-white" : "text-zinc-600"}`}>{p.name}</p>
                        {active && <p className="text-[9px] mt-0.5" style={{ color: p.color }}>Active</p>}
                      </div>
                    );
                  })}
                </div>
                {mt?.location && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: platform.color }} />
                    <span className="text-xs text-zinc-400 truncate">{mt.location}</span>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-bold text-white">Availability</p>
                  </div>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                      {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 mb-4">
                  {rules.map((rule, i) => (
                    <AvailRow key={i} rule={rule} onChange={r => setRules(rs => rs.map((x, j) => j === i ? r : x))} />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => availMutation.mutate()} disabled={availMutation.isPending}
                    className="font-bold" style={{ background: GOLD, color: "#000" }}>
                    {availMutation.isPending ? "Saving…" : "Save Availability"}
                  </Button>
                  <p className="text-xs text-zinc-600">{rules.filter(r => r.isEnabled).length} days active</p>
                </div>
              </div>

              {/* Calendar */}
              <WeekCalendar bookings={bookings as any[]} weekStart={weekStart}
                onPrev={() => setWeekStart(s => subWeeks(s, 1))} onNext={() => setWeekStart(s => addWeeks(s, 1))} />

              {/* Bookings list */}
              {(bookings as any[]).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" /> Bookings
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                      {upcomingBookings.length} upcoming
                    </Badge>
                  </h3>
                  {(bookings as any[]).map((b: any) => {
                    const isPast = new Date(b.startTime) < new Date();
                    return (
                      <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 group hover:bg-zinc-900 transition-colors">
                        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${b.status === "cancelled" ? "bg-red-500/60" : isPast ? "bg-zinc-600" : "bg-emerald-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{b.clientName}</p>
                          <p className="text-xs text-zinc-500">{b.clientEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-white">{format(new Date(b.startTime), "MMM d, yyyy")}</p>
                          <p className="text-xs text-zinc-500">{format(new Date(b.startTime), "h:mm a")} — {format(new Date(b.endTime), "h:mm a")}</p>
                        </div>
                        {b.status === "scheduled" && !isPast && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {b.meetLink && (
                              <button onClick={() => window.open(b.meetLink, "_blank")}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors">
                                <Video className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => updateBooking.mutate({ id: b.id, status: "completed" })}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => updateBooking.mutate({ id: b.id, status: "cancelled" })}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {b.status === "scheduled" && isPast && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => noShowMutation.mutate(b.id)}
                              title="Mark as no-show"
                              className="p-1.5 rounded-lg hover:bg-orange-500/20 text-zinc-600 hover:text-orange-400 transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => updateBooking.mutate({ id: b.id, status: "completed" })}
                              title="Mark completed"
                              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-600 hover:text-emerald-400 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />
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

          {/* ══ REMINDERS TAB ══ */}
          {activeTab === "reminders" && (
            <div className="space-y-5 max-w-2xl">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4" style={{ color: GOLD }} />
                    <p className="text-sm font-bold text-white">Automated Reminders</p>
                  </div>
                  <p className="text-xs text-zinc-500">Sent automatically to everyone who books a call with you.</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: rem24h ? `${GOLD}18` : "rgba(255,255,255,0.04)" }}>
                      <Clock className="w-4 h-4" style={{ color: rem24h ? GOLD : "#52525b" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">24 hours before</p>
                      <p className="text-xs text-zinc-500">Sent the day before the call</p>
                    </div>
                  </div>
                  <Switch checked={rem24h} onCheckedChange={setRem24h} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: rem1h ? `${GOLD}18` : "rgba(255,255,255,0.04)" }}>
                      <Bell className="w-4 h-4" style={{ color: rem1h ? GOLD : "#52525b" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">1 hour before</p>
                      <p className="text-xs text-zinc-500">Final nudge before the meeting starts</p>
                    </div>
                  </div>
                  <Switch checked={rem1h} onCheckedChange={setRem1h} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Custom Message <span className="font-normal text-zinc-600 normal-case">(added to every reminder)</span>
                  </label>
                  <Textarea value={remCustomMsg} onChange={e => setRemCustomMsg(e.target.value)}
                    placeholder="e.g. Please come prepared with your top 3 goals for the next 90 days."
                    rows={3} className="bg-zinc-900 border-zinc-700 text-white resize-none text-sm" />
                </div>

                {/* Live preview */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Reminder Preview</p>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-xs space-y-2">
                    <p className="font-bold text-sm" style={{ color: GOLD }}>Oravini</p>
                    <p className="text-zinc-400 text-[10px] -mt-1">Meeting Reminder</p>
                    <p className="font-bold text-white">Your meeting starts in 24 hours</p>
                    <div className="rounded-lg bg-zinc-800 p-3 space-y-1 text-zinc-300">
                      <p><span style={{ color: GOLD, fontWeight: 600 }}>Meeting:</span> {mt?.title}</p>
                      <p><span style={{ color: GOLD, fontWeight: 600 }}>When:</span> Tomorrow, 3:00 PM</p>
                      {mt?.location && (
                        <p><span style={{ color: GOLD, fontWeight: 600 }}>Link:</span>{" "}
                          <span className="text-blue-400">{mt.location.slice(0, 45)}</span>
                        </p>
                      )}
                    </div>
                    {remCustomMsg && <p className="text-zinc-400 italic text-[11px]">{remCustomMsg}</p>}
                  </div>
                </div>

                <Button onClick={() => saveRemindersMutation.mutate()} disabled={saveRemindersMutation.isPending}
                  className="font-bold" style={{ background: GOLD, color: "#000" }}>
                  {saveRemindersMutation.isPending ? "Saving…" : "Save Reminder Settings"}
                </Button>
              </div>
            </div>
          )}

          {/* ══ EMAILS TAB ══ */}
          {activeTab === "emails" && (
            <div className="space-y-5 max-w-2xl">

              {/* Confirmation email */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-4 h-4" style={{ color: GOLD }} />
                    <p className="text-sm font-bold text-white">Confirmation Email</p>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">Auto-sent</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Sent instantly when someone books. Variables:{" "}
                    {["{{name}}", "{{title}}", "{{time}}", "{{duration}}", "{{link}}"].map(v => (
                      <code key={v} className="text-yellow-400 text-[11px] mr-1">{v}</code>
                    ))}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject Line</label>
                  <Input value={confirmSubject} onChange={e => setConfirmSubject(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white text-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Email Body{" "}
                    <span className="font-normal text-zinc-600 normal-case">(leave blank for default template)</span>
                  </label>
                  <Textarea value={confirmBody} onChange={e => setConfirmBody(e.target.value)}
                    placeholder={"Hey {{name}},\n\nYour {{title}} is confirmed for {{time}}.\n\nJoin here: {{link}}\n\nLooking forward to speaking with you!"}
                    rows={6} className="bg-zinc-900 border-zinc-700 text-white resize-none text-sm font-mono" />
                </div>

                {/* Default email preview */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Default template preview</p>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-xs space-y-2">
                    <p className="font-bold text-sm" style={{ color: GOLD }}>Oravini</p>
                    <p className="font-bold text-white">✅ Booking Confirmed: {mt?.title}</p>
                    <div className="rounded-lg bg-zinc-800 p-3 space-y-1 text-zinc-300">
                      <p><span style={{ color: GOLD, fontWeight: 600 }}>Who:</span> John Smith</p>
                      <p><span style={{ color: GOLD, fontWeight: 600 }}>When:</span> Monday, June 16, 2026 · 3:00 PM</p>
                      <p><span style={{ color: GOLD, fontWeight: 600 }}>Duration:</span> {mt?.duration} minutes</p>
                      {mt?.location && (
                        <p><span style={{ color: GOLD, fontWeight: 600 }}>Link:</span>{" "}
                          <span className="text-blue-400">{mt.location.slice(0, 45)}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-zinc-600 text-[10px]">If you need to cancel or reschedule, please reach out directly.</p>
                  </div>
                </div>
              </div>

              {/* Follow-up email */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <p className="text-sm font-bold text-white">Follow-up Email</p>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[9px]">After call</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">Sent after the call ends. Great for upsells or feedback.</p>
                  </div>
                  <Switch checked={followUpEnabled} onCheckedChange={setFollowUpEnabled} />
                </div>

                {followUpEnabled && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Send after</label>
                      <Select value={String(followUpDelay)} onValueChange={v => setFollowUpDelay(Number(v))}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm w-48"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {[1, 2, 4, 8, 24, 48].map(h => (
                            <SelectItem key={h} value={String(h)} className="text-white">
                              {h < 24 ? `${h} hour${h > 1 ? "s" : ""}` : `${h / 24} day${h / 24 > 1 ? "s" : ""}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject Line</label>
                      <Input value={followUpSubject} onChange={e => setFollowUpSubject(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Body</label>
                      <Textarea value={followUpBody} onChange={e => setFollowUpBody(e.target.value)}
                        placeholder={"Hey {{name}},\n\nIt was great speaking with you today.\n\nHere's what I'd suggest as next steps...\n\nLet me know if you have questions!"}
                        rows={5} className="bg-zinc-900 border-zinc-700 text-white resize-none text-sm font-mono" />
                    </div>
                  </>
                )}
              </div>

              <Button onClick={() => saveEmailsMutation.mutate()} disabled={saveEmailsMutation.isPending}
                className="font-bold" style={{ background: GOLD, color: "#000" }}>
                {saveEmailsMutation.isPending ? "Saving…" : "Save Email Settings"}
              </Button>
            </div>
          )}

          {/* ══ FORMS TAB ══ */}
          {activeTab === "forms" && (
            <FormsTab />
          )}

          {/* ══ WORKFLOWS TAB ══ */}
          {activeTab === "workflows" && (
            <WorkflowsTab meetingTypes={meetingTypes as any[]} />
          )}

        </div>
      </div>

      {mt && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} mt={mt} />}
      {editingMt && (
        <EditMeetingTypeDialog
          open={!!editingMt}
          onClose={() => setEditingMt(null)}
          mt={editingMt}
        />
      )}
    </ClientLayout>
  );
}
