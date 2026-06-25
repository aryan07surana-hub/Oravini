import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

const GOLD = "#d4b461";

function formatInTz(isoStr: string, fmt: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoStr));
  } catch {
    return format(new Date(isoStr), fmt);
  }
}

export default function RescheduleBooking() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);

  const { data: booking, isLoading, isError, error } = useQuery<any>({
    queryKey: ["/api/book/reschedule", bookingId],
    queryFn: () =>
      fetch(`/api/book/reschedule/${bookingId}`).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Not found"); }
        return r.json();
      }),
    enabled: !!bookingId,
    retry: false,
  });

  const { data: slotData, isLoading: slotsLoading } = useQuery<{ slots: string[] }>({
    queryKey: ["/api/book/slots", booking?.meetingTypeSlug, selectedDate],
    queryFn: () =>
      fetch(`/api/book/${booking.meetingTypeSlug}/slots?date=${selectedDate}`).then(r => r.json()),
    enabled: !!booking?.meetingTypeSlug && !!selectedDate,
  });
  const slots = slotData?.slots ?? [];

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/book/reschedule/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStartTime: selectedSlot }),
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Failed to reschedule"); }
        return r.json();
      }),
    onSuccess: () => {
      setConfirmedSlot(selectedSlot);
      setDone(true);
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: GOLD, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Error state
  if (isError) {
    const msg = (error as Error)?.message ?? "";
    const isCancelled = msg.toLowerCase().includes("cancel");
    const isPast = msg.toLowerCase().includes("past");

    return (
      <div className="min-h-screen bg-[#080808] flex flex-col">
        <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
            <span className="text-xs font-black" style={{ color: GOLD }}>O</span>
          </div>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>Oravini</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            {isCancelled ? (
              <>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
                  <span className="text-2xl">⚠️</span>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Booking Already Cancelled</h1>
                <p className="text-zinc-500 text-sm">This booking has been cancelled and cannot be rescheduled.</p>
              </>
            ) : isPast ? (
              <>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "#ef444415", border: "1px solid #ef444430" }}>
                  <Clock className="w-7 h-7 text-red-400" />
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Booking Has Passed</h1>
                <p className="text-zinc-500 text-sm">This booking is in the past and cannot be rescheduled.</p>
              </>
            ) : (
              <>
                <XCircle className="w-14 h-14 mx-auto mb-4 text-red-500" />
                <h1 className="text-xl font-bold text-white mb-2">Booking Not Found</h1>
                <p className="text-zinc-500 text-sm">This booking doesn't exist or the link has expired.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success / Done state
  if (done && confirmedSlot) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col">
        <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
            <span className="text-xs font-black" style={{ color: GOLD }}>O</span>
          </div>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>Oravini</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}40` }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: GOLD }} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Booking Rescheduled</h1>
            <p className="text-zinc-400 mb-6">A confirmation has been sent to your email.</p>
            <div
              className="rounded-2xl p-5 text-left space-y-3"
              style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                <span className="text-sm text-zinc-300">{format(new Date(confirmedSlot), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                <span className="text-sm text-zinc-300">{formatInTz(confirmedSlot, "h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const start = new Date(booking.startTime);
  const isPast = start < new Date();

  // Today's date for the min attribute on date input
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
          <span className="text-xs font-black" style={{ color: GOLD }}>O</span>
        </div>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>Oravini</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Page title */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}
            >
              <Calendar className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Reschedule Booking</h1>
            <p className="text-zinc-500 text-sm">Pick a new date and time for your meeting.</p>
          </div>

          {/* Current booking details */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Current Booking</p>
            <h2 className="text-lg font-black text-white mb-4">{booking.title}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300">{format(start, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300">
                  {format(start, "h:mm a")} — {format(new Date(booking.endTime), "h:mm a")}
                </span>
              </div>
            </div>
          </div>

          {isPast ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p className="text-sm text-red-400">This booking is in the past and cannot be rescheduled.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Date picker */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Select New Date</p>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white text-sm focus:outline-none focus:border-yellow-600"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              {/* Slot grid */}
              {selectedDate && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    {selectedSlot && (
                      <button
                        onClick={() => setSelectedSlot(null)}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Available Times</p>
                      <p className="text-sm font-bold text-white">
                        {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d")}
                      </p>
                    </div>
                  </div>

                  {slotsLoading ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-10 rounded-xl bg-zinc-800 animate-pulse" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Clock className="w-10 h-10 mb-3" style={{ color: `${GOLD}44` }} />
                      <p className="text-zinc-400 text-sm font-medium">No slots available</p>
                      <p className="text-zinc-600 text-xs mt-1">Try a different day</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {slots.map(slot => {
                        const isSelected = slot === selectedSlot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
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
                            {formatInTz(slot, "h:mm a")}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Confirm button */}
              {selectedSlot && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                    <div>
                      <p className="text-xs text-zinc-400">New time selected</p>
                      <p className="text-sm font-bold text-white">
                        {format(new Date(selectedDate + "T12:00:00"), "MMMM d")} at {formatInTz(selectedSlot, "h:mm a")}
                      </p>
                    </div>
                  </div>
                  {rescheduleMutation.isError && (
                    <p className="text-sm text-red-400">{(rescheduleMutation.error as any)?.message}</p>
                  )}
                  <Button
                    onClick={() => rescheduleMutation.mutate()}
                    disabled={rescheduleMutation.isPending}
                    className="w-full font-bold h-11"
                    style={{ background: GOLD, color: "#000" }}
                  >
                    {rescheduleMutation.isPending ? "Rescheduling…" : "Confirm Reschedule"}
                  </Button>
                  <p className="text-xs text-center text-zinc-600">
                    A confirmation will be sent to your email with the updated time.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
