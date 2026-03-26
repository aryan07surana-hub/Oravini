import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Video, Mic, BookOpen, Crown, Star, Zap,
  Eye, EyeOff, Clock, Calendar, Users, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

const SESSION_TYPES = ["recording", "live_qa", "workshop", "masterclass"];
const SESSION_TIERS = ["free", "starter", "growth", "pro", "elite"];
const PLANS = ["free", "starter", "growth", "pro", "elite"];

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

const TYPE_ICONS: Record<string, any> = {
  recording: Video,
  live_qa: Mic,
  workshop: BookOpen,
  masterclass: Crown,
};
const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-600 text-white",
  starter: "bg-blue-600 text-white",
  pro: "text-black font-bold",
};

export default function AdminSessions() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expandedClients, setExpandedClients] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/sessions/all"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/clients"],
  });

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
      title: session.title,
      description: session.description || "",
      type: session.type,
      videoUrl: session.videoUrl || "",
      thumbnailUrl: session.thumbnailUrl || "",
      hostName: session.hostName || "",
      durationMinutes: session.durationMinutes,
      scheduledAt: session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "",
      tierRequired: session.tierRequired,
      isPublished: session.isPublished,
      tags: session.tags?.join(", ") || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: SessionForm) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
        durationMinutes: data.durationMinutes || null,
        videoUrl: data.videoUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
      };
      if (editing) {
        return apiRequest("PATCH", `/api/sessions/${editing.id}`, payload);
      }
      return apiRequest("POST", "/api/sessions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setDialogOpen(false);
      toast({ title: editing ? "Session updated" : "Session created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      apiRequest("PATCH", `/api/sessions/${id}`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/plan`, { plan }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: `Plan updated to ${vars.plan}` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const stats = {
    total: sessions?.length || 0,
    published: sessions?.filter(s => s.isPublished).length || 0,
    free: sessions?.filter(s => s.tierRequired === "free").length || 0,
    starter: sessions?.filter(s => s.tierRequired === "starter").length || 0,
    pro: sessions?.filter(s => s.tierRequired === "pro").length || 0,
  };

  return (
    <AdminLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage recordings, live Q&As, and user plan assignments</p>
        </div>
        <Button data-testid="button-create-session" onClick={openCreate} style={{ background: GOLD, color: "#000" }} className="font-semibold">
          <Plus className="w-4 h-4 mr-2" /> New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ["Total", stats.total, "text-foreground"],
          ["Published", stats.published, "text-green-400"],
          ["Free", stats.free, "text-muted-foreground"],
          ["Starter", stats.starter, "text-blue-400"],
          ["Pro", stats.pro, ""],
        ].map(([label, val, cls]) => (
          <div key={label as string} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${cls}`} style={label === "Pro" ? { color: GOLD } : {}}>{val}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Sessions List */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">All Sessions</h2>
        </div>
        {sessionsLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (sessions || []).length === 0 ? (
          <div className="p-12 text-center">
            <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No sessions yet — create your first one</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(sessions || []).map((session) => {
              const Icon = TYPE_ICONS[session.type] || Video;
              const tierBadge = TIER_COLORS[session.tierRequired];
              return (
                <div key={session.id} data-testid={`admin-session-${session.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate max-w-xs">{session.title}</p>
                      <Badge className={`text-[10px] ${tierBadge}`} style={session.tierRequired === "pro" ? { background: GOLD } : {}}>
                        {session.tierRequired}
                      </Badge>
                      <Badge className={`text-[10px] ${session.isPublished ? "bg-green-600" : "bg-gray-600"} text-white`}>
                        {session.isPublished ? "Live" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="capitalize">{session.type.replace("_", " ")}</span>
                      {session.hostName && <span>by {session.hostName}</span>}
                      {session.durationMinutes && <span>{session.durationMinutes}m</span>}
                      {session.scheduledAt && <span>{format(new Date(session.scheduledAt), "MMM d, yyyy")}</span>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5" title={session.isPublished ? "Unpublish" : "Publish"}>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{session.isPublished ? "Live" : "Draft"}</span>
                      <Switch
                        data-testid={`toggle-publish-${session.id}`}
                        checked={session.isPublished}
                        onCheckedChange={checked => togglePublish.mutate({ id: session.id, isPublished: checked })}
                      />
                    </div>
                    <Button data-testid={`btn-edit-${session.id}`} size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(session)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button data-testid={`btn-delete-${session.id}`} size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(session.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Plan Management */}
      <div className="rounded-2xl border border-border bg-card">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
          onClick={() => setExpandedClients(!expandedClients)}
          data-testid="toggle-client-plans"
        >
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Client Plan Management</h2>
            <Badge className="text-[10px] bg-muted text-muted-foreground">{clients?.filter(c => c.role === "client").length || 0} clients</Badge>
          </div>
          {expandedClients ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedClients && (
          <div className="border-t border-border divide-y divide-border">
            {clientsLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              (clients || []).filter(c => c.role === "client").map(client => (
                <div key={client.id} data-testid={`client-plan-row-${client.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {client.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                  <Select
                    value={client.plan || "free"}
                    onValueChange={plan => updatePlanMutation.mutate({ id: client.id, plan })}
                  >
                    <SelectTrigger data-testid={`select-plan-${client.id}`} className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Tier 1 — Free</SelectItem>
                      <SelectItem value="starter">Tier 2 — $29</SelectItem>
                      <SelectItem value="growth">Tier 3 — $59</SelectItem>
                      <SelectItem value="pro">Tier 4 — $79</SelectItem>
                      <SelectItem value="elite">Tier 5 — Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Session Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Session" : "New Session"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => saveMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-session-title" placeholder="Session title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-session-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recording">Recording</SelectItem>
                        <SelectItem value="live_qa">Live Q&A</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="masterclass">Masterclass</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tierRequired" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Tier</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-session-tier"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Tier 1 — Free</SelectItem>
                        <SelectItem value="starter">Tier 2 — $29</SelectItem>
                        <SelectItem value="growth">Tier 3 — $59</SelectItem>
                        <SelectItem value="pro">Tier 4 — $79</SelectItem>
                        <SelectItem value="elite">Tier 5 — Elite</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-session-description" rows={2} placeholder="What is this session about?" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="videoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL</FormLabel>
                  <FormControl><Input {...field} data-testid="input-session-video-url" placeholder="YouTube, Vimeo, Loom, or direct video URL" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL</FormLabel>
                  <FormControl><Input {...field} data-testid="input-session-thumbnail" placeholder="https://..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="hostName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Aryan Surana" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (mins)</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="60" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl><Input {...field} type="datetime-local" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma separated)</FormLabel>
                  <FormControl><Input {...field} placeholder="content, strategy, growth" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isPublished" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch data-testid="toggle-session-published" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Publish immediately</FormLabel>
                </FormItem>
              )} />

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  data-testid="button-save-session"
                  type="submit"
                  className="flex-1 font-semibold"
                  style={{ background: GOLD, color: "#000" }}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Session"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
