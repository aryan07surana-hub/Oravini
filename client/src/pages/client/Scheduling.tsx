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

type TabType = "scheduling" | "reminders" | "emails";
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

  const { data: mt, isLoading: mtLoading } = useQuery<any>({ queryKey: ["/api/scheduling/me"] });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/scheduling/bookings"] });
  const { data: availRules = [] } = useQuery<any[]>({ queryKey: ["/api/scheduling/availability"], enabled: !!mt });
  const { data: config } = useQuery<any>({ queryKey: ["/api/scheduling/config"], enabled: !!mt });

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
    mutationFn: () => apiRequest("PUT", "/api/scheduling/availability", rules),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/scheduling/availability"] }); toast({ title: "Availability saved!" }); },
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

        </div>
      </div>

      {mt && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} mt={mt} />}
    </ClientLayout>
  );
}
