import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft, ChevronRight, Clock, Video, CheckCircle2,
  Calendar, ArrowLeft, User, Mail, MessageSquare,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isSameMonth, isToday, isBefore, startOfDay,
} from "date-fns";

const GOLD = "#d4b461";

const bookingSchema = z.object({
  clientName: z.string().min(1, "Name required"),
  clientEmail: z.string().email("Valid email required"),
  notes: z.string().optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

/* ─── Mini calendar ─────────────────────────────────────────── */
function MiniCalendar({
  month, onPrev, onNext, days, startPad, selected, today, isSelectable, onSelect,
}: {
  month: Date; onPrev: () => void; onNext: () => void;
  days: Date[]; startPad: number; selected: Date | null; today: Date;
  isSelectable: (d: Date) => boolean; onSelect: (d: Date) => void;
}) {
  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrev}
          data-testid="btn-prev-month"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-white">{format(month, "MMMM yyyy")}</h3>
        <button
          onClick={onNext}
          data-testid="btn-next-month"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-zinc-600 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
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
              data-testid={`day-${format(day, "d")}`}
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
              {/* Available dot */}
              {selectable && !isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: GOLD }}
                />
              )}
              {/* Today ring */}
              {isTodayDay && !isSelected && (
                <span
                  className="absolute inset-0 rounded-xl ring-1 pointer-events-none"
                  style={{ ringColor: GOLD, boxShadow: `inset 0 0 0 1px ${GOLD}60` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Time slot grid ────────────────────────────────────────── */
function SlotGrid({ slots, selected, onSelect }: {
  slots: string[]; selected: string | null; onSelect: (s: string) => void;
}) {
  if (!slots.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-10 h-10 mb-3" style={{ color: `${GOLD}44` }} />
        <p className="text-zinc-400 text-sm font-medium">No slots available</p>
        <p className="text-zinc-600 text-xs mt-1">Try a different day</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
      {slots.map(slot => {
        const isSelected = slot === selected;
        return (
          <button
            key={slot}
            data-testid={`slot-${slot}`}
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
            {format(new Date(slot), "h:mm a")}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function PublicBooking() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "form" | "done">("pick");
  const today = startOfDay(new Date());

  // Fetch meeting type
  const { data: mt, isLoading: mtLoading, isError } = useQuery<any>({
    queryKey: ["/api/book", slug],
    queryFn: () => fetch(`/api/book/${slug}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
  });

  // Fetch available dates for current month
  const monthKey = format(month, "yyyy-MM");
  const { data: availData, isLoading: datesLoading } = useQuery<{ availableDates: string[] }>({
    queryKey: ["/api/book", slug, "dates", monthKey],
    queryFn: () => fetch(`/api/book/${slug}/available-dates?year=${month.getFullYear()}&month=${month.getMonth() + 1}`).then(r => r.json()),
    enabled: !!mt,
  });
  const availSet = new Set(availData?.availableDates ?? []);

  // Fetch slots for selected day
  const dateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : "";
  const { data: slotData, isLoading: slotsLoading } = useQuery<{ slots: string[] }>({
    queryKey: ["/api/book", slug, "slots", dateStr],
    queryFn: () => fetch(`/api/book/${slug}/slots?date=${dateStr}`).then(r => r.json()),
    enabled: !!selectedDay,
  });
  const slots = slotData?.slots ?? [];

  // Parse custom questions from meeting type
  const customQuestions: { id: string; label: string; required: boolean }[] = (() => {
    try { return JSON.parse(mt?.customQuestions ?? "[]"); } catch { return []; }
  })();

  // Custom answers stored outside react-hook-form for simplicity
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { clientName: "", clientEmail: "", notes: "" },
  });

  function validateCustom() {
    const errs: Record<string, string> = {};
    for (const q of customQuestions) {
      if (q.required && !customAnswers[q.id]?.trim()) errs[q.id] = "This field is required";
    }
    setCustomErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const bookMutation = useMutation({
    mutationFn: (data: BookingForm) =>
      fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, startTime: selectedSlot, customAnswers }),
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

  function selectDay(day: Date) {
    setSelectedDay(day);
    setSelectedSlot(null);
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot);
    setStep("form");
  }

  // ── 404
  if (isError) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
          <p className="text-zinc-500 text-sm">This booking link doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">

      {/* Top bar */}
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
          <span className="text-xs font-black" style={{ color: GOLD }}>O</span>
        </div>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>Oravini</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 py-10">
        <div className="w-full max-w-3xl">

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="text-center py-8">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}40` }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: GOLD }} />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">You're booked! 🎉</h1>
              <p className="text-zinc-400 mb-8">Check your email — a confirmation has been sent.</p>

              <div
                className="max-w-sm mx-auto rounded-2xl p-6 text-left space-y-3 border"
                style={{ background: `${GOLD}08`, borderColor: `${GOLD}25` }}
              >
                {[
                  ["Meeting", mt?.title],
                  ["When", selectedSlot ? format(new Date(selectedSlot), "EEEE, MMMM d 'at' h:mm a") : "—"],
                  ["Duration", mt ? `${mt.duration} minutes` : "—"],
                  ...(mt?.location ? [["Location", mt.location]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xs font-bold w-20 flex-shrink-0 pt-0.5" style={{ color: GOLD }}>{label}</span>
                    <span className="text-sm text-zinc-300">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FORM ── */}
          {step === "form" && (
            <div className="max-w-md mx-auto">
              <button
                onClick={() => setStep("pick")}
                className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to time selection
              </button>

              {/* Selected slot summary */}
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
                    {selectedSlot ? format(new Date(selectedSlot), "EEEE, MMMM d 'at' h:mm a") : "—"}
                    {mt ? ` · ${mt.duration} min` : ""}
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-black text-white mb-1">Your details</h2>
              <p className="text-sm text-zinc-500 mb-6">Just a couple of things before we confirm your booking.</p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => bookMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="clientName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input
                            {...field}
                            data-testid="input-name"
                            placeholder="Jane Smith"
                            className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-yellow-600"
                          />
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
                          <Input
                            {...field}
                            data-testid="input-email"
                            type="email"
                            placeholder="jane@example.com"
                            className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-yellow-600"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Custom questions */}
                  {customQuestions.map(q => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        {q.label}
                        {q.required && <span className="text-red-400 font-bold">*</span>}
                        {!q.required && <span className="text-zinc-600 normal-case font-normal">(optional)</span>}
                      </label>
                      <Input
                        data-testid={`input-custom-${q.id}`}
                        value={customAnswers[q.id] ?? ""}
                        onChange={e => {
                          setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }));
                          if (customErrors[q.id]) setCustomErrors(er => ({ ...er, [q.id]: "" }));
                        }}
                        placeholder="Your answer…"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-yellow-600"
                      />
                      {customErrors[q.id] && <p className="text-xs text-red-400">{customErrors[q.id]}</p>}
                    </div>
                  ))}

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                        Anything else to share? <span className="text-zinc-600 normal-case font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                          <Textarea
                            {...field}
                            data-testid="input-notes"
                            placeholder="Your current situation, goals, questions..."
                            rows={3}
                            className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 resize-none focus:border-yellow-600"
                          />
                        </div>
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
                    data-testid="button-confirm-booking"
                    type="button"
                    onClick={form.handleSubmit(d => {
                      if (!validateCustom()) return;
                      bookMutation.mutate(d);
                    })}
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
            <div>
              {/* Header */}
              <div className="text-center mb-8">
                {mtLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48 mx-auto bg-zinc-800" />
                    <Skeleton className="h-4 w-32 mx-auto bg-zinc-800" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-black text-white mb-2">{mt?.title ?? "Book a Call"}</h1>
                    {mt?.description && <p className="text-zinc-400 text-sm mb-3 max-w-sm mx-auto">{mt.description}</p>}
                    <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                        {mt?.duration} minutes
                      </span>
                      {mt?.location && (
                        <span className="flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" style={{ color: GOLD }} />
                          Video call
                        </span>
                      )}
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
                    <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 bg-zinc-800 rounded-lg" />)}</div>
                  ) : (
                    <MiniCalendar
                      month={month}
                      onPrev={() => setMonth(m => subMonths(m, 1))}
                      onNext={() => setMonth(m => addMonths(m, 1))}
                      days={calDays}
                      startPad={startPad}
                      selected={selectedDay}
                      today={today}
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
                          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-10 bg-zinc-800 rounded-xl" />)}
                        </div>
                      ) : (
                        <SlotGrid slots={slots} selected={selectedSlot} onSelect={selectSlot} />
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
