import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2, Calendar, ArrowLeft, User, Mail, Globe,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isSameMonth, isToday, isBefore, startOfDay,
} from "date-fns";

const GOLD = "#d4b461";

const TIMEZONES = [
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
  { value: "UTC", label: "UTC" },
];

function formatInTz(isoStr: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoStr));
  } catch {
    return format(new Date(isoStr), "h:mm a");
  }
}

const bookingSchema = z.object({
  clientName: z.string().min(1, "Name required"),
  clientEmail: z.string().email("Valid email required"),
  notes: z.string().optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

/* ─── Mini calendar ─────────────────────────────────────────── */
function MiniCalendar({
  month, onPrev, onNext, days, startPad, selected, isSelectable, onSelect,
}: {
  month: Date; onPrev: () => void; onNext: () => void;
  days: Date[]; startPad: number; selected: Date | null;
  isSelectable: (d: Date) => boolean; onSelect: (d: Date) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrev}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-white">{format(month, "MMMM yyyy")}</h3>
        <button
          onClick={onNext}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-zinc-600 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const selectable = isSelectable(day);
          const isSelected = selected && isSameDay(day, selected);
          const isTodayDay = isToday(day);
          const inMonth = isSameMonth(day, month);
          return (
            <button
              key={day.toISOString()}
              disabled={!selectable}
              onClick={() => onSelect(day)}
              className="relative aspect-square flex items-center justify-center text-sm font-semibold rounded-xl transition-all"
              style={{
                background: isSelected ? GOLD : "transparent",
                color: isSelected ? "#000" : selectable ? "#fff" : "#3f3f46",
                cursor: selectable ? "pointer" : "default",
                opacity: !inMonth ? 0.3 : 1,
              }}
              onMouseEnter={e => {
                if (selectable && !isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.background = `${GOLD}25`;
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = selectable ? "#fff" : "#3f3f46";
                }
              }}
            >
              {format(day, "d")}
              {selectable && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: GOLD }} />
              )}
              {isTodayDay && !isSelected && (
                <span className="absolute inset-0 rounded-xl ring-1 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${GOLD}60` }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Slot grid ─────────────────────────────────────────────── */
function SlotGrid({ slots, selected, onSelect, clientTz }: {
  slots: string[]; selected: string | null; onSelect: (s: string) => void; clientTz: string;
}) {
  if (!slots.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock className="w-10 h-10 mb-3" style={{ color: `${GOLD}44` }} />
        <p className="text-zinc-400 text-sm font-medium">No slots available</p>
        <p className="text-zinc-600 text-xs mt-1">Try a different day</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
      {slots.map(slot => {
        const isSelected = slot === selected;
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className="px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all text-center"
            style={{
              background: isSelected ? GOLD : "#1c1c1c",
              color: isSelected ? "#000" : "#e4e4e7",
              borderColor: isSelected ? GOLD : "#2a2a2a",
              boxShadow: isSelected ? `0 0 16px ${GOLD}40` : "none",
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${GOLD}60`;
                (e.currentTarget as HTMLButtonElement).style.background = `${GOLD}12`;
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a";
                (e.currentTarget as HTMLButtonElement).style.background = "#1c1c1c";
              }
            }}
          >
            {formatInTz(slot, clientTz)}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main embed page ───────────────────────────────────────── */
export default function EmbedBooking() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "form" | "done">("pick");
  const [clientTz, setClientTz] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  });
  const today = startOfDay(new Date());

  // Meeting type
  const { data: mt, isLoading: mtLoading, isError } = useQuery<any>({
    queryKey: ["/api/book", slug],
    queryFn: () => fetch(`/api/book/${slug}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
  });

  // Available dates for month
  const monthKey = format(month, "yyyy-MM");
  const { data: availData, isLoading: datesLoading } = useQuery<{ availableDates: string[] }>({
    queryKey: ["/api/book", slug, "dates", monthKey],
    queryFn: () => fetch(`/api/book/${slug}/available-dates?year=${month.getFullYear()}&month=${month.getMonth() + 1}`).then(r => r.json()),
    enabled: !!mt,
  });
  const availSet = new Set(availData?.availableDates ?? []);

  // Slots for selected day
  const dateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : "";
  const { data: slotData, isLoading: slotsLoading } = useQuery<{ slots: string[] }>({
    queryKey: ["/api/book", slug, "slots", dateStr],
    queryFn: () => fetch(`/api/book/${slug}/slots?date=${dateStr}`).then(r => r.json()),
    enabled: !!selectedDay,
  });
  const slots = slotData?.slots ?? [];

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { clientName: "", clientEmail: "", notes: "" },
  });

  const bookMutation = useMutation({
    mutationFn: (data: BookingForm) =>
      fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, startTime: selectedSlot, clientTimezone: clientTz }),
      }).then(async r => {
        if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Booking failed"); }
        return r.json();
      }),
    onSuccess: () => setStep("done"),
  });

  const calDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = getDay(startOfMonth(month));

  function isSelectable(day: Date) {
    if (isBefore(startOfDay(day), today)) return false;
    return availSet.has(format(day, "yyyy-MM-dd"));
  }

  function selectDay(day: Date) { setSelectedDay(day); setSelectedSlot(null); }
  function selectSlot(slot: string) { setSelectedSlot(slot); setStep("form"); }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-lg font-bold text-white mb-2">Booking page not found</h1>
          <p className="text-zinc-500 text-sm">This link doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] p-4 sm:p-6">

      {/* ── DONE ── */}
      {step === "done" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}40` }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: GOLD }} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">You're booked!</h1>
            <p className="text-zinc-400 mb-6 text-sm">Check your email for the confirmation details.</p>
            <div
              className="rounded-2xl p-5 text-left space-y-3"
              style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}
            >
              {[
                ["Meeting", mt?.title],
                ["When", selectedSlot ? `${format(new Date(selectedSlot), "EEEE, MMMM d")} at ${formatInTz(selectedSlot, clientTz)}` : "—"],
                ["Duration", mt ? `${mt.duration} minutes` : "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs font-bold w-20 flex-shrink-0 pt-0.5" style={{ color: GOLD }}>{label}</span>
                  <span className="text-sm text-zinc-300">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {step === "form" && (
        <div className="max-w-md mx-auto py-4">
          <button
            onClick={() => setStep("pick")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to time selection
          </button>

          {/* Slot summary */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}20` }}>
              <Clock className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{mt?.title}</p>
              <p className="text-xs text-zinc-400">
                {selectedSlot ? `${format(new Date(selectedSlot), "EEEE, MMMM d")} at ${formatInTz(selectedSlot, clientTz)}` : "—"}
                {mt ? ` · ${mt.duration} min` : ""}
              </p>
            </div>
          </div>

          <h2 className="text-xl font-black text-white mb-1">Your details</h2>
          <p className="text-sm text-zinc-500 mb-6">Just a couple of things before we confirm your booking.</p>

          <Form {...form}>
            <form className="space-y-4">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input {...field} placeholder="Jane Smith" className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-yellow-600" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="clientEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input {...field} type="email" placeholder="jane@example.com" className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-yellow-600" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    Notes <span className="text-zinc-600 normal-case font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Anything you'd like to share..."
                      rows={3}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 resize-none focus:border-yellow-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {bookMutation.isError && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
                  {(bookMutation.error as Error).message}
                </p>
              )}

              <Button
                type="button"
                onClick={form.handleSubmit(d => bookMutation.mutate(d))}
                className="w-full h-12 font-bold text-sm"
                style={{ background: GOLD, color: "#000" }}
                disabled={bookMutation.isPending}
              >
                {bookMutation.isPending ? "Confirming…" : "Confirm Booking →"}
              </Button>

              <p className="text-[11px] text-zinc-600 text-center">
                You'll receive a confirmation email with all the details.
              </p>
            </form>
          </Form>
        </div>
      )}

      {/* ── PICK DATE + TIME ── */}
      {step === "pick" && (
        <div className="max-w-3xl mx-auto">

          {/* Header info */}
          <div className="text-center mb-6">
            {mtLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-48 mx-auto bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-32 mx-auto bg-zinc-800 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-black text-white mb-1">{mt?.title ?? "Book a Call"}</h1>
                {mt?.description && <p className="text-zinc-400 text-sm mb-3 max-w-sm mx-auto">{mt.description}</p>}
                <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 flex-wrap mb-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    {mt?.duration} minutes
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <Select value={clientTz} onValueChange={v => { setClientTz(v); setSelectedDay(null); setSelectedSlot(null); }}>
                    <SelectTrigger className="h-7 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.value} value={tz.value} className="text-white text-xs">{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Calendar + Slots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Calendar panel */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Select a Date</p>
              {datesLoading ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => <div key={i} className="h-8 bg-zinc-800 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <MiniCalendar
                  month={month}
                  onPrev={() => setMonth(m => subMonths(m, 1))}
                  onNext={() => setMonth(m => addMonths(m, 1))}
                  days={calDays}
                  startPad={startPad}
                  selected={selectedDay}
                  isSelectable={isSelectable}
                  onSelect={selectDay}
                />
              )}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-800 text-[11px] text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-700" /> Unavailable
                </span>
              </div>
            </div>

            {/* Slots panel */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              {!selectedDay ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Calendar className="w-12 h-12 mb-4" style={{ color: `${GOLD}40` }} />
                  <p className="text-zinc-500 text-sm font-medium">Pick a date</p>
                  <p className="text-zinc-700 text-xs mt-1">Available times will appear here</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => { setSelectedDay(null); setSelectedSlot(null); }}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Available Times</p>
                      <p className="text-sm font-semibold text-white">{format(selectedDay, "EEEE, MMMM d")}</p>
                    </div>
                  </div>
                  {slotsLoading ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Array(6).fill(0).map((_, i) => <div key={i} className="h-10 bg-zinc-800 rounded-xl animate-pulse" />)}
                    </div>
                  ) : (
                    <SlotGrid slots={slots} selected={selectedSlot} onSelect={selectSlot} clientTz={clientTz} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
