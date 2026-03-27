import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ClientLayout from "@/components/layout/ClientLayout";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send, Clock, CheckCircle2, Trash2, RefreshCw,
  ExternalLink, AlertCircle, CalendarDays, Link2
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";

function CharCount({ text }: { text: string }) {
  const len = text.length;
  const over = len > 3000;
  const near = len > 2500;
  return (
    <span className={`text-xs font-mono tabular-nums ${over ? "text-red-400" : near ? "text-yellow-400" : "text-zinc-500"}`}>
      {len}/3000
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge className="text-[10px] h-4 px-1.5 bg-yellow-500/15 text-yellow-400 border-0">Scheduled</Badge>;
  if (status === "posted") return <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-400 border-0">Posted</Badge>;
  return <Badge className="text-[10px] h-4 px-1.5 bg-red-500/15 text-red-400 border-0">Failed</Badge>;
}

const LI_BLUE = "#0a66c2";

export default function LinkedInScheduler() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"post" | "schedule" | "queue">("post");
  const [postText, setPostText] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{ connected: boolean; name: string | null }>({
    queryKey: ["/api/linkedin/status"],
  });

  const { data: scheduled = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery<any[]>({
    queryKey: ["/api/linkedin/scheduled"],
    enabled: status?.connected === true,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/linkedin/connect";
    },
    onError: (err: any) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/linkedin/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/status"] });
      toast({ title: "Disconnected", description: "LinkedIn account unlinked." });
    },
  });

  const postMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", "/api/linkedin/post", { content }),
    onSuccess: () => {
      setPostText("");
      toast({ title: "Post published!", description: "Your post is live on LinkedIn." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (body: { content: string; scheduledFor: string }) =>
      apiRequest("POST", "/api/linkedin/scheduled", body),
    onSuccess: () => {
      setScheduleText("");
      setScheduleDate("");
      setScheduleTime("");
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/scheduled"] });
      toast({ title: "Post scheduled!", description: "It will publish automatically at your chosen time." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to schedule", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/linkedin/scheduled/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/scheduled"] });
      toast({ title: "Removed", description: "Scheduled post deleted." });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      refetchStatus();
      toast({ title: "LinkedIn connected!", description: "Your LinkedIn account is now linked." });
      window.history.replaceState({}, "", "/linkedin-scheduler");
    }
    const errorMsg = params.get("error");
    if (errorMsg) {
      toast({ title: "Connection failed", description: decodeURIComponent(errorMsg), variant: "destructive" });
      window.history.replaceState({}, "", "/linkedin-scheduler");
    }
  }, []);

  const handleSchedule = () => {
    if (!scheduleText.trim() || !scheduleDate || !scheduleTime) return;
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    scheduleMutation.mutate({ content: scheduleText.trim(), scheduledFor });
  };

  const pending = scheduled.filter((p: any) => p.status === "pending");
  const done = scheduled.filter((p: any) => p.status !== "pending");

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(10,102,194,0.12)", border: "1px solid rgba(10,102,194,0.25)" }}>
            <SiLinkedin className="w-5 h-5" style={{ color: LI_BLUE }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">LinkedIn Scheduler</h1>
            <p className="text-xs text-muted-foreground">Post now or schedule LinkedIn posts to go out automatically</p>
          </div>
        </div>

        {/* Connection Card */}
        {statusLoading ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : status?.connected ? (
          <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl" style={{ background: "rgba(10,102,194,0.07)", border: "1px solid rgba(10,102,194,0.2)" }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4" style={{ color: LI_BLUE }} />
              <div>
                <p className="text-sm font-semibold text-white">Connected as <span style={{ color: LI_BLUE }}>{status.name}</span></p>
                <p className="text-[10px] text-muted-foreground">Posts will appear on this LinkedIn profile</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="text-xs text-zinc-500 hover:text-red-400 h-7" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} data-testid="button-disconnect-linkedin">
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: "rgba(10,102,194,0.05)", border: "1px solid rgba(10,102,194,0.15)" }}>
            <SiLinkedin className="w-8 h-8 mx-auto" style={{ color: LI_BLUE }} />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Connect your LinkedIn account</p>
              <p className="text-xs text-muted-foreground">Authorise once to enable posting and scheduling</p>
            </div>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="gap-2"
              style={{ background: LI_BLUE, color: "#fff" }}
              data-testid="button-connect-linkedin"
            >
              {connectMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Connect LinkedIn
            </Button>
            <p className="text-[10px] text-muted-foreground">A LinkedIn authorisation window will open. Approve it and come back here.</p>
          </div>
        )}

        {status?.connected && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              {([
                { id: "post", label: "Post Now", icon: Send },
                { id: "schedule", label: "Schedule", icon: CalendarDays },
                { id: "queue", label: `Queue (${pending.length})`, icon: Clock },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  data-testid={`li-tab-${id}`}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${tab === id ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                  style={tab === id ? { background: LI_BLUE } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Post Now */}
            {tab === "post" && (
              <Card className="border-zinc-800">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-zinc-300">Compose Post</p>
                    <CharCount text={postText} />
                  </div>
                  <Textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    placeholder="Share an insight, story, or update with your LinkedIn network..."
                    className="min-h-[140px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                    data-testid="textarea-li-post-now"
                  />
                  <AiRefineButton text={postText} onAccept={setPostText} context="professional LinkedIn post — thoughtful, value-driven, max 3000 characters" />
                  <Button
                    onClick={() => postMutation.mutate(postText)}
                    disabled={!postText.trim() || postText.length > 3000 || postMutation.isPending}
                    className="w-full gap-2"
                    style={{ background: LI_BLUE }}
                    data-testid="button-li-post-now"
                  >
                    {postMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {postMutation.isPending ? "Publishing..." : "Publish to LinkedIn"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Schedule */}
            {tab === "schedule" && (
              <Card className="border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-zinc-300">Post Content</p>
                      <CharCount text={scheduleText} />
                    </div>
                    <Textarea
                      value={scheduleText}
                      onChange={e => setScheduleText(e.target.value)}
                      placeholder="Write the LinkedIn post you want to schedule..."
                      className="min-h-[140px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                      data-testid="textarea-li-schedule"
                    />
                    <AiRefineButton text={scheduleText} onAccept={setScheduleText} context="professional LinkedIn post — thoughtful, value-driven, max 3000 characters" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-400 font-medium">Date</p>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                        data-testid="input-li-schedule-date"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-400 font-medium">Time (your local time)</p>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                        data-testid="input-li-schedule-time"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSchedule}
                    disabled={!scheduleText.trim() || scheduleText.length > 3000 || !scheduleDate || !scheduleTime || scheduleMutation.isPending}
                    className="w-full gap-2"
                    style={{ background: LI_BLUE }}
                    data-testid="button-li-schedule"
                  >
                    {scheduleMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                    {scheduleMutation.isPending ? "Scheduling..." : "Schedule Post"}
                  </Button>
                  <p className="text-center text-[11px] text-zinc-600">Posts check every 5 minutes and publish automatically</p>
                </CardContent>
              </Card>
            )}

            {/* Queue */}
            {tab === "queue" && (
              <div className="space-y-3">
                {queueLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : pending.length === 0 && done.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No scheduled posts yet</p>
                    <p className="text-xs mt-1">Switch to the Schedule tab to create one</p>
                  </div>
                ) : (
                  <>
                    {pending.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1">Upcoming</p>
                        {pending.map((p: any) => (
                          <div key={p.id} data-testid={`li-post-card-${p.id}`} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(10,102,194,0.05)", border: "1px solid rgba(10,102,194,0.15)" }}>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-zinc-200 leading-relaxed flex-1 whitespace-pre-wrap">{p.content}</p>
                              <button onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5" data-testid={`delete-li-post-${p.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {new Date(p.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {done.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 pt-2">History</p>
                        {done.map((p: any) => (
                          <div key={p.id} data-testid={`li-post-history-${p.id}`} className="rounded-xl p-4 space-y-2 opacity-60" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                                {p.status === "failed" ? (
                                  <><AlertCircle className="w-3 h-3 text-red-400" /><span className="text-red-400">{p.errorMessage || "Failed"}</span></>
                                ) : (
                                  <><CheckCircle2 className="w-3 h-3 text-emerald-400" />{new Date(p.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</>
                                )}
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end pt-1">
                  <button onClick={() => refetchQueue()} className="text-[11px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
