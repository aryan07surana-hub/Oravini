import PortalLayout from "./Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Video, Mic, BookOpen, Crown, Plus, Pencil, Trash2, Clock, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const TYPE_ICONS: Record<string, any> = {
  recording: Video,
  live_qa: Mic,
  workshop: BookOpen,
  masterclass: Crown,
};

const TIER_BADGE: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-200",
  starter: "bg-blue-900 text-blue-200",
  growth: "bg-purple-900 text-purple-200",
  pro: "bg-amber-900 text-amber-200",
  elite: "text-black font-bold",
};

const sessionSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  type: z.enum(["recording", "live_qa", "workshop", "masterclass"]),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  hostName: z.string().optional(),
  durationMinutes: z.coerce.number().optional(),
  scheduledAt: z.string().optional(),
  tierRequired: z.enum(["free", "starter", "growth", "pro", "elite"]),
  isPublished: z.boolean().default(false),
  tags: z.string().optional(),
});

type SessionForm = z.infer<typeof sessionSchema>;

export default function SessionsHub() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: sessions = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/sessions/all"] });

  const form = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "", description: "", type: "recording", videoUrl: "", thumbnailUrl: "",
      hostName: "", durationMinutes: undefined, scheduledAt: "", tierRequired: "free",
      isPublished: false, tags: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ title: "", description: "", type: "recording", videoUrl: "", thumbnailUrl: "", hostName: "", durationMinutes: undefined, scheduledAt: "", tierRequired: "free", isPublished: false, tags: "" });
    setDialogOpen(true);
  };

  const openEdit = (session: any) => {
    setEditing(session);
    form.reset({
      title: session.title, description: session.description || "", type: session.type,
      videoUrl: session.videoUrl || "", thumbnailUrl: session.thumbnailUrl || "",
      hostName: session.hostName || "", durationMinutes: session.durationMinutes,
      scheduledAt: session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "",
      tierRequired: session.tierRequired, isPublished: session.isPublished, tags: session.tags || "",
    });
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: (data: SessionForm) => {
      const payload = { ...data, scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined, tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [] };
      return editing ? apiRequest("PATCH", `/api/sessions/${editing.id}`, payload) : apiRequest("POST", "/api/sessions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/all"] });
      toast({ title: editing ? "Session updated" : "Session created" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to save session", variant: "destructive" }),
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/all"] });
      toast({ title: "Session deleted" });
    },
  });

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="w-6 h-6" style={{ color: GOLD }} />
              Sessions Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{sessions.length} sessions total</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            <Plus className="w-4 h-4" /> New Session
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Video className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No sessions yet. Create your first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session) => {
              const Icon = TYPE_ICONS[session.type] || Video;
              return (
                <div key={session.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}18` }}>
                        <Icon className="w-4 h-4" style={{ color: GOLD }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{session.title}</p>
                        {session.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{session.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={`text-[10px] px-1.5 capitalize ${TIER_BADGE[session.tierRequired] || TIER_BADGE.free}`} style={session.tierRequired === "elite" ? { background: GOLD } : {}}>
                            {session.tierRequired}
                          </Badge>
                          <Badge variant={session.isPublished ? "default" : "outline"} className="text-[10px] px-1.5">
                            {session.isPublished ? <><Eye className="w-2.5 h-2.5 mr-1" />Published</> : <><EyeOff className="w-2.5 h-2.5 mr-1" />Draft</>}
                          </Badge>
                          {session.durationMinutes && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />{session.durationMinutes}m
                            </span>
                          )}
                          {session.scheduledAt && (
                            <span className="text-[10px] text-muted-foreground">{format(new Date(session.scheduledAt), "MMM d, yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(session)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950" onClick={() => deleteSession.mutate(session.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Session" : "New Session"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => save.mutate(d))} className="space-y-4 mt-2">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="recording">Recording</SelectItem>
                        <SelectItem value="live_qa">Live Q&A</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="masterclass">Masterclass</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tierRequired" render={({ field }) => (
                  <FormItem><FormLabel>Tier Required</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="videoUrl" render={({ field }) => (
                <FormItem><FormLabel>Video URL</FormLabel><FormControl><Input {...field} placeholder="https://" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="hostName" render={({ field }) => (
                  <FormItem><FormLabel>Host Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                  <FormItem><FormLabel>Duration (min)</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                <FormItem><FormLabel>Scheduled Date</FormLabel><FormControl><Input {...field} type="datetime-local" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Tags (comma separated)</FormLabel><FormControl><Input {...field} placeholder="mindset, growth, strategy" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isPublished" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="text-sm">Published</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full" style={{ background: GOLD, color: "#0a0910" }} disabled={save.isPending}>
                {save.isPending ? "Saving..." : editing ? "Update Session" : "Create Session"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
