import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Calendar, Clock, Link2, Copy, CheckCheck,
  Users, ChevronDown, ChevronUp, X, CalendarDays, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const meetingTypeSchema = z.object({
  title: z.string().min(1, "Title required"),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  duration: z.coerce.number().min(5, "Minimum 5 minutes").max(480),
  color: z.string().default("#d4b461"),
  location: z.string().optional(),
  timezone: z.string().default("UTC"),
  bufferTime: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type MeetingTypeForm = z.infer<typeof meetingTypeSchema>;

type AvailabilityRule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

export default function AdminScheduling() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [availDialog, setAvailDialog] = useState<string | null>(null);
  const [expandedBookings, setExpandedBookings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const { data: meetingTypes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/meeting-types"],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/scheduled-bookings"],
  });

  const form = useForm<MeetingTypeForm>({
    resolver: zodResolver(meetingTypeSchema),
    defaultValues: { title: "", slug: "", description: "", duration: 30, color: "#d4b461", location: "", timezone: "UTC", bufferTime: 0, isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ title: "", slug: "", description: "", duration: 30, color: "#d4b461", location: "", timezone: "UTC", bufferTime: 0, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (mt: any) => {
    setEditing(mt);
    form.reset({ title: mt.title, slug: mt.slug, description: mt.description || "", duration: mt.duration, color: mt.color || "#d4b461", location: mt.location || "", timezone: mt.timezone || "UTC", bufferTime: mt.bufferTime || 0, isActive: mt.isActive });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: MeetingTypeForm) => editing
      ? apiRequest("PATCH", `/api/admin/meeting-types/${editing.id}`, data)
      : apiRequest("POST", "/api/admin/meeting-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types"] });
      setDialogOpen(false);
      toast({ title: editing ? "Meeting type updated" : "Meeting type created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/meeting-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types"] });
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/meeting-types/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/meeting-types"] }),
  });

  const saveAvailMutation = useMutation({
    mutationFn: (data: { id: string; rules: AvailabilityRule[] }) =>
      apiRequest("PUT", `/api/admin/meeting-types/${data.id}/availability`, data.rules),
    onSuccess: () => {
      setAvailDialog(null);
      toast({ title: "Availability saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/scheduled-bookings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-bookings"] });
      setSelectedBooking(null);
      toast({ title: "Booking updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const upcomingBookings = bookings.filter((b: any) => b.status === "scheduled" && new Date(b.startTime) > new Date());

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
            <p className="text-sm text-muted-foreground mt-1">Create meeting types, manage availability, and view all bookings</p>
          </div>
          <Button data-testid="button-create-meeting-type" onClick={openCreate} style={{ background: GOLD, color: "#000" }} className="font-semibold">
            <Plus className="w-4 h-4 mr-2" /> New Meeting Type
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Meeting Types", meetingTypes.length, "text-foreground"],
            ["Active Types", meetingTypes.filter((m: any) => m.isActive).length, "text-green-400"],
            ["Upcoming", upcomingBookings.length, "text-primary"],
            ["Total Bookings", bookings.length, "text-muted-foreground"],
          ].map(([label, val, cls]) => (
            <div key={label as string} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{val}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Meeting Types List */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Meeting Types
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : meetingTypes.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No meeting types yet — create your first one</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {meetingTypes.map((mt: any) => (
                  <div key={mt.id} data-testid={`meeting-type-${mt.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/20">
                    <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ background: mt.color || GOLD }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{mt.title}</p>
                        <Badge variant="outline" className={`text-[10px] ${mt.isActive ? "border-green-500/30 text-green-400" : "border-muted text-muted-foreground"}`}>
                          {mt.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mt.duration} min</span>
                        {mt.bufferTime > 0 && <span>+{mt.bufferTime} min buffer</span>}
                        {mt.location && <span>{mt.location}</span>}
                        <span className="text-primary/70 flex items-center gap-1 cursor-pointer hover:text-primary" onClick={() => copyLink(mt.slug, mt.id)}>
                          <Link2 className="w-3 h-3" /> /book/{mt.slug}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        data-testid={`toggle-active-${mt.id}`}
                        checked={mt.isActive}
                        onCheckedChange={v => toggleActiveMutation.mutate({ id: mt.id, isActive: v })}
                      />
                      <Button
                        data-testid={`btn-copy-${mt.id}`}
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => copyLink(mt.slug, mt.id)}
                        title="Copy booking link"
                      >
                        {copiedId === mt.id ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        data-testid={`btn-avail-${mt.id}`}
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setAvailDialog(mt.id)}
                        title="Edit availability"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                      </Button>
                      <Button data-testid={`btn-edit-${mt.id}`} variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mt)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button data-testid={`btn-delete-${mt.id}`} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(mt.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-8 text-xs gap-1"
                        onClick={() => window.open(`/book/${mt.slug}`, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3" /> Preview
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="border border-border">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-muted/20"
            onClick={() => setExpandedBookings(!expandedBookings)}
            data-testid="toggle-bookings"
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> All Bookings
              <Badge className="text-[10px] bg-primary/10 text-primary">{bookings.length}</Badge>
            </CardTitle>
            {expandedBookings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedBookings && (
            <CardContent className="p-0 border-t border-border">
              {bookingsLoading ? (
                <div className="p-4 space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No bookings yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {bookings.map((b: any) => (
                    <div
                      key={b.id}
                      data-testid={`booking-row-${b.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/20 cursor-pointer"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === "scheduled" ? "bg-green-400" : b.status === "cancelled" ? "bg-red-400" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{b.clientName}</p>
                        <p className="text-xs text-muted-foreground">{b.clientEmail}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-foreground">{b.meetingType?.title || "—"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(b.startTime), "MMM d, h:mm a")}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${b.status === "scheduled" ? "border-green-500/30 text-green-400" : b.status === "cancelled" ? "border-red-500/30 text-red-400" : "border-muted text-muted-foreground"}`}>
                        {b.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Meeting Type Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Meeting Type" : "New Meeting Type"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-mt-title" placeholder="30-min Discovery Call" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug *</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-1">/book/</span>
                        <Input {...field} data-testid="input-mt-slug" placeholder="discovery-call" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="What is this meeting about?" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl><Input {...field} type="number" min={5} data-testid="input-mt-duration" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bufferTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buffer (minutes)</FormLabel>
                      <FormControl><Input {...field} type="number" min={0} placeholder="0" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Meeting Link</FormLabel>
                    <FormControl><Input {...field} placeholder="Zoom link, Google Meet, or address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input type="color" value={field.value} onChange={e => field.onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                          <Input {...field} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl><Input {...field} placeholder="UTC" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">Active (accept bookings)</FormLabel>
                  </FormItem>
                )} />

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button
                    data-testid="button-save-meeting-type"
                    type="submit" className="flex-1 font-semibold"
                    style={{ background: GOLD, color: "#000" }}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Availability Dialog */}
        {availDialog && (
          <AvailabilityDialog
            meetingTypeId={availDialog}
            meetingTypeName={meetingTypes.find((m: any) => m.id === availDialog)?.title || ""}
            onClose={() => setAvailDialog(null)}
            onSave={(rules) => saveAvailMutation.mutate({ id: availDialog, rules })}
            isPending={saveAvailMutation.isPending}
          />
        )}

        {/* Booking Detail Dialog */}
        {selectedBooking && (
          <BookingDetailDialog
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onUpdate={(id, data) => updateBookingMutation.mutate({ id, data })}
            isPending={updateBookingMutation.isPending}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function AvailabilityDialog({ meetingTypeId, meetingTypeName, onClose, onSave, isPending }: {
  meetingTypeId: string; meetingTypeName: string;
  onClose: () => void; onSave: (rules: AvailabilityRule[]) => void; isPending: boolean;
}) {
  const { data: existingRules } = useQuery<any[]>({
    queryKey: ["/api/admin/meeting-types", meetingTypeId, "availability"],
    queryFn: () => fetch(`/api/admin/meeting-types/${meetingTypeId}/availability`, { credentials: "include" }).then(r => r.json()),
  });

  const [rules, setRules] = useState<AvailabilityRule[]>(() =>
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: i >= 1 && i <= 5 }))
  );

  // Once existing rules load from the server, populate local state
  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      setRules(DAYS.map((_, i) => {
        const r = existingRules.find((x: any) => x.dayOfWeek === i);
        return r
          ? { dayOfWeek: i, startTime: r.startTime, endTime: r.endTime, isEnabled: r.isEnabled }
          : { dayOfWeek: i, startTime: "09:00", endTime: "17:00", isEnabled: false };
      }));
    }
  }, [existingRules]);

  const update = (i: number, field: keyof AvailabilityRule, value: any) => {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Availability — {meetingTypeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {DAYS.map((day, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${rules[i].isEnabled ? "border-primary/20 bg-primary/5" : "border-border"}`}>
              <Switch
                data-testid={`avail-toggle-${i}`}
                checked={rules[i].isEnabled}
                onCheckedChange={v => update(i, "isEnabled", v)}
              />
              <span className="text-sm w-24 flex-shrink-0 font-medium">{day}</span>
              {rules[i].isEnabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input type="time" value={rules[i].startTime} onChange={e => update(i, "startTime", e.target.value)} className="w-28 text-xs" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="time" value={rules[i].endTime} onChange={e => update(i, "endTime", e.target.value)} className="w-28 text-xs" />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unavailable</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="button-save-availability"
            className="flex-1 font-semibold"
            style={{ background: "#d4b461", color: "#000" }}
            disabled={isPending}
            onClick={() => onSave(rules)}
          >
            {isPending ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingDetailDialog({ booking, onClose, onUpdate, isPending }: {
  booking: any; onClose: () => void;
  onUpdate: (id: string, data: any) => void; isPending: boolean;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">Meeting</span>
              <span className="text-sm font-medium text-foreground">{booking.meetingType?.title || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">Client</span>
              <span className="text-sm font-medium text-foreground">{booking.clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">Email</span>
              <span className="text-sm text-foreground">{booking.clientEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">Start</span>
              <span className="text-sm text-foreground">{format(new Date(booking.startTime), "PPpp")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">End</span>
              <span className="text-sm text-foreground">{format(new Date(booking.endTime), "h:mm a")}</span>
            </div>
            {booking.notes && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24">Notes</span>
                <span className="text-sm text-foreground flex-1">{booking.notes}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24">Status</span>
              <Badge variant="outline" className={`text-[10px] ${booking.status === "scheduled" ? "border-green-500/30 text-green-400" : booking.status === "cancelled" ? "border-red-500/30 text-red-400" : "border-muted text-muted-foreground"}`}>
                {booking.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {booking.status === "scheduled" && (
              <>
                <Button
                  data-testid="btn-cancel-booking"
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  disabled={isPending}
                  onClick={() => onUpdate(booking.id, { status: "cancelled" })}
                >
                  Cancel Booking
                </Button>
                <Button
                  data-testid="btn-complete-booking"
                  className="flex-1"
                  style={{ background: "#d4b461", color: "#000" }}
                  disabled={isPending}
                  onClick={() => onUpdate(booking.id, { status: "completed" })}
                >
                  Mark Complete
                </Button>
              </>
            )}
            {booking.status !== "scheduled" && (
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
