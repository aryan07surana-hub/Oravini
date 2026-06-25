import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";

const GOLD = "#d4b461";

export default function CancelBooking() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  const { data: booking, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/book/cancel", bookingId],
    queryFn: () => fetch(`/api/book/cancel/${bookingId}`).then(async r => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    }),
    enabled: !!bookingId,
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/book/cancel/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
        return r.json();
      }),
    onSuccess: () => setDone(true),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="w-14 h-14 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold text-white mb-2">Booking not found</h1>
          <p className="text-zinc-500 text-sm">This booking may have already been cancelled or doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "#ef444420", border: "2px solid #ef444440" }}>
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Booking Cancelled</h1>
          <p className="text-zinc-400">A confirmation has been sent to your email.</p>
          <p className="text-zinc-600 text-sm mt-4">Need to rebook? Contact us directly.</p>
        </div>
      </div>
    );
  }

  const start = new Date(booking.startTime);
  const isPast = start < new Date();

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
          <span className="text-xs font-black" style={{ color: GOLD }}>O</span>
        </div>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>Oravini</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#ef444415", border: "1px solid #ef444430" }}>
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Cancel Booking</h1>
            <p className="text-zinc-500 text-sm">This action cannot be undone.</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Booking Details</p>
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
              <p className="text-sm text-red-400">This booking is in the past and cannot be cancelled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Reason for cancellation <span className="font-normal text-zinc-600 normal-case">(optional)</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  rows={3}
                  className="bg-zinc-950 border-zinc-700 text-white resize-none text-sm"
                />
              </div>
              {cancelMutation.isError && (
                <p className="text-sm text-red-400">{(cancelMutation.error as any)?.message}</p>
              )}
              <Button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="w-full font-bold h-11"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Confirm Cancellation"}
              </Button>
              <p className="text-xs text-center text-zinc-600">
                A cancellation confirmation will be sent to your email.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
