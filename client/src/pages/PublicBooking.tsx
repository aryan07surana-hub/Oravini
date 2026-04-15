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
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2, Calendar,
  ArrowLeft
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isSameMonth, isToday, isBefore, startOfDay
} from "date-fns";

const GOLD = "#d4b461";

const bookingSchema = z.object({
  clientName: z.string().min(1, "Name required"),
  clientEmail: z.string().email("Valid email required"),
  notes: z.string().optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

export default function PublicBooking() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"calendar" | "time" | "form" | "confirmed">("calendar");
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const { data: meetingType, isLoading: mtLoading, isError } = useQuery<any>({
    queryKey: ["/api/book", slug],
    queryFn: () => fetch(`/api/book/${slug}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
  });

  const monthYear = format(currentMonth, "yyyy-MM");
  const { data: availDatesData, isLoading: availDatesLoading } = useQuery<{ availableDates: string[] }>({
    queryKey: ["/api/book", slug, "available-dates", monthYear],
    queryFn: () => {
      const y = currentMonth.getFullYear();
      const mo = currentMonth.getMonth() + 1;
      return fetch(`/api/book/${slug}/available-dates?year=${y}&month=${mo}`).then(r => r.json());
    },
    enabled: !!meetingType,
  });
  const availableDateSet = new Set(availDatesData?.availableDates || []);

  const dateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : "";
  const { data: slotData, isLoading: slotsLoading } = useQuery<{ slots: string[]; meetingType: any }>({
    queryKey: ["/api/book", slug, "slots", dateStr],
    queryFn: () => fetch(`/api/book/${slug}/slots?date=${dateStr}`).then(r => r.json()),
    enabled: !!selectedDay,
  });

  const slots = slotData?.slots || [];

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { clientName: "", clientEmail: "", notes: "" },
  });

  const bookMutation = useMutation({
    mutationFn: (data: BookingForm) =>
      fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, startTime: selectedSlot }),
      }).then(async r => {
        if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Booking failed"); }
        return r.json();
      }),
    onSuccess: (data) => {
      setConfirmedBooking(data);
      setStep("confirmed");
    },
  });

  // Calendar logic
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = getDay(start);
  const today = startOfDay(new Date());

  const isDaySelectable = (day: Date) => {
    if (isBefore(startOfDay(day), today)) return false;
    if (availDatesLoading) return false; // disable until we know availability
    const ds = format(day, "yyyy-MM-dd");
    return availableDateSet.has(ds);
  };

  const handleDaySelect = (day: Date) => {
    if (!isDaySelectable(day)) return;
    setSelectedDay(day);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-gray-400">This booking page doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-4" style={{ color: GOLD }}>ORAVINI</p>
          {mtLoading ? (
            <Skeleton className="h-8 w-64 mx-auto" />
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">{meetingType?.title}</h1>
              {meetingType?.description && <p className="text-gray-400 max-w-md mx-auto">{meetingType.description}</p>}
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" style={{ color: GOLD }} />{meetingType?.duration} minutes</span>
                {meetingType?.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: GOLD }} />{meetingType.location}</span>}
              </div>
            </>
          )}
        </div>

        {/* Confirmed */}
        {step === "confirmed" && (
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${GOLD}20`, border: `2px solid ${GOLD}44` }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: GOLD }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're booked!</h2>
            <p className="text-gray-400 mb-6">A confirmation email has been sent to your inbox.</p>
            <div className="p-4 rounded-xl border text-left space-y-2" style={{ borderColor: `${GOLD}33`, background: `${GOLD}08` }}>
              <p className="text-sm text-gray-300"><span style={{ color: GOLD }} className="font-semibold">Meeting:</span> {meetingType?.title}</p>
              <p className="text-sm text-gray-300"><span style={{ color: GOLD }} className="font-semibold">When:</span> {selectedSlot ? format(new Date(selectedSlot), "EEEE, MMMM d 'at' h:mm a") : "—"}</p>
              <p className="text-sm text-gray-300"><span style={{ color: GOLD }} className="font-semibold">Duration:</span> {meetingType?.duration} minutes</p>
              {meetingType?.location && <p className="text-sm text-gray-300"><span style={{ color: GOLD }} className="font-semibold">Location:</span> {meetingType.location}</p>}
            </div>
          </div>
        )}

        {/* Calendar + time + form layout */}
        {step !== "confirmed" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Calendar */}
            <div className="rounded-2xl border p-6" style={{ borderColor: "#222", background: "#111" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">{format(currentMonth, "MMMM yyyy")}</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(d => subMonths(d, 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400"
                    data-testid="btn-prev-month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(d => addMonths(d, 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400"
                    data-testid="btn-next-month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(startPad).fill(null).map((_, i) => <div key={`p${i}`} />)}
                {days.map(day => {
                  const selectable = isDaySelectable(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isTodayDay = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      data-testid={`day-${format(day, "d")}`}
                      disabled={!selectable}
                      onClick={() => handleDaySelect(day)}
                      className={`min-h-[40px] rounded-lg text-sm font-medium transition-all
                        ${isSelected ? "text-black" : ""}
                        ${selectable ? "hover:bg-white/10 cursor-pointer" : "opacity-30 cursor-not-allowed"}
                        ${isTodayDay && !isSelected ? "ring-1" : ""}
                      `}
                      style={{
                        background: isSelected ? GOLD : undefined,
                        ringColor: isTodayDay && !isSelected ? GOLD : undefined,
                        color: isSelected ? "#000" : selectable ? "#fff" : "#555",
                      }}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
              {selectedDay && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "#222" }}>
                  <p className="text-sm text-gray-400">Selected: <span className="text-white font-medium">{format(selectedDay, "EEEE, MMMM d")}</span></p>
                </div>
              )}
            </div>

            {/* Right: Time slots or Form */}
            <div className="rounded-2xl border p-6" style={{ borderColor: "#222", background: "#111" }}>
              {step === "calendar" && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Calendar className="w-12 h-12 mb-4" style={{ color: `${GOLD}66` }} />
                  <p className="text-gray-400">Select a day to see available time slots</p>
                </div>
              )}

              {step === "time" && selectedDay && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => { setStep("calendar"); setSelectedDay(null); }} className="text-gray-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="font-semibold text-white">{format(selectedDay, "EEEE, MMMM d")}</h3>
                  </div>
                  {slotsLoading ? (
                    <div className="space-y-2">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}</div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: `${GOLD}44` }} />
                      <p className="text-gray-400 text-sm">No available slots on this day.</p>
                      <p className="text-gray-600 text-xs mt-1">Try selecting a different day.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          data-testid={`slot-${slot}`}
                          onClick={() => handleSlotSelect(slot)}
                          className="w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-[1.01] active:scale-100"
                          style={{ borderColor: "#333", color: "#fff", background: "#1a1a1a" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = GOLD;
                            (e.currentTarget as HTMLButtonElement).style.background = `${GOLD}15`;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
                            (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a";
                          }}
                        >
                          {format(new Date(slot), "h:mm a")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === "form" && selectedSlot && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setStep("time")} className="text-gray-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="font-semibold text-white">Your Details</h3>
                      <p className="text-xs text-gray-400">{format(new Date(selectedSlot), "EEEE, MMMM d 'at' h:mm a")}</p>
                    </div>
                  </div>
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}33` }}>
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                    <span className="text-sm text-gray-300">{meetingType?.duration} min · {format(new Date(selectedSlot), "h:mm a")}</span>
                  </div>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(d => bookMutation.mutate(d))} className="space-y-4">
                      <FormField control={form.control} name="clientName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Your Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-name"
                              placeholder="Jane Smith"
                              className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="clientEmail" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-email"
                              type="email"
                              placeholder="jane@example.com"
                              className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Notes (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              data-testid="input-notes"
                              placeholder="Anything you'd like to share before the meeting..."
                              rows={3}
                              className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-600 resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {bookMutation.isError && (
                        <p className="text-sm text-red-400">{(bookMutation.error as Error).message}</p>
                      )}
                      <Button
                        data-testid="button-confirm-booking"
                        type="submit"
                        className="w-full font-semibold py-3"
                        style={{ background: GOLD, color: "#000" }}
                        disabled={bookMutation.isPending}
                      >
                        {bookMutation.isPending ? "Confirming..." : "Confirm Booking"}
                      </Button>
                    </form>
                  </Form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
