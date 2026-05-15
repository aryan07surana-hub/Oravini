import PortalLayout from "./Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Plus, Clock, User, CheckCircle, XCircle, Pencil } from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-900 text-yellow-200",
  confirmed: "bg-green-900 text-green-200",
  cancelled: "bg-red-900 text-red-200",
  completed: "bg-zinc-700 text-zinc-200",
};

export default function SchedulingHub() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newStatus, setNewStatus] = useState("pending");

  const { data: bookings = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/scheduled-bookings"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const createBooking = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/scheduled-bookings", {
      title: newTitle,
      clientEmail: newClient,
      scheduledAt: new Date(newDate).toISOString(),
      durationMinutes: parseInt(newDuration),
      status: newStatus,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] });
      toast({ title: "Booking created" });
      setAddOpen(false);
      setNewTitle(""); setNewClient(""); setNewDate(""); setNewDuration("60"); setNewStatus("pending");
    },
    onError: (e: any) => toast({ title: "Failed to create booking", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/admin/scheduled-bookings/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] });
      toast({ title: "Status updated" });
    },
  });

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.status !== "completed");
  const past = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  return (
    <PortalLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6" style={{ color: GOLD }} />
              Scheduling Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{upcoming.length} upcoming sessions</p>
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            <Plus className="w-4 h-4" /> Schedule Session
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Upcoming</p>
                <div className="space-y-3">
                  {upcoming.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} onStatusChange={(status) => updateStatus.mutate({ id: booking.id, status })} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Past</p>
                <div className="space-y-3 opacity-60">
                  {past.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} onStatusChange={(status) => updateStatus.mutate({ id: booking.id, status })} />
                  ))}
                </div>
              </div>
            )}

            {bookings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarDays className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No sessions scheduled yet.</p>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs mb-1.5 block">Session Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="1:1 Strategy Call" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Client</Label>
              <Select value={newClient} onValueChange={setNewClient}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.email}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Date & Time</Label>
              <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Duration (min)</Label>
                <Select value={newDuration} onValueChange={setNewDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              style={{ background: GOLD, color: "#0a0910" }}
              onClick={() => createBooking.mutate()}
              disabled={!newTitle || !newClient || !newDate || createBooking.isPending}
            >
              {createBooking.isPending ? "Scheduling..." : "Schedule Session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}

function BookingRow({ booking, onStatusChange }: { booking: any; onStatusChange: (status: string) => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}18` }}>
        <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{booking.title || "Session"}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {booking.scheduledAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(booking.scheduledAt), "MMM d, yyyy · h:mm a")}
            </span>
          )}
          {booking.clientName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />{booking.clientName}
            </span>
          )}
          {booking.durationMinutes && (
            <span className="text-xs text-muted-foreground">{booking.durationMinutes}m</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge className={`text-[10px] capitalize px-2 ${STATUS_STYLES[booking.status] || STATUS_STYLES.pending}`}>
          {booking.status}
        </Badge>
        {booking.status === "pending" && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-950" onClick={() => onStatusChange("confirmed")}>
            <CheckCircle className="w-3.5 h-3.5" />
          </Button>
        )}
        {booking.status !== "cancelled" && booking.status !== "completed" && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950" onClick={() => onStatusChange("cancelled")}>
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
