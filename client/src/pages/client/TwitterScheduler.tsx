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
  Twitter, Send, Clock, CheckCircle2, XCircle, Trash2, RefreshCw,
  ExternalLink, AlertCircle, Zap, CalendarDays, Link2
} from "lucide-react";

function CharCount({ text }: { text: string }) {
  const len = text.length;
  const over = len > 280;
  const near = len > 240;
  return (
    <span className={`text-xs font-mono tabular-nums ${over ? "text-red-400" : near ? "text-yellow-400" : "text-zinc-500"}`}>
      {len}/280
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge className="text-[10px] h-4 px-1.5 bg-yellow-500/15 text-yellow-400 border-0">Scheduled</Badge>;
  if (status === "posted") return <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-400 border-0">Posted</Badge>;
  return <Badge className="text-[10px] h-4 px-1.5 bg-red-500/15 text-red-400 border-0">Failed</Badge>;
}

export default function TwitterScheduler() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"post" | "schedule" | "queue">("post");
  const [tweetText, setTweetText] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{ connected: boolean; handle: string | null }>({
    queryKey: ["/api/twitter/status"],
  });

  const { data: scheduled = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery<any[]>({
    queryKey: ["/api/twitter/scheduled"],
    enabled: status?.connected === true,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const data = await apiRequest("GET", "/api/twitter/connect");
      return data;
    },
    onSuccess: (data: any) => {
      window.open(data.url, "_blank", "width=600,height=700");
    },
    onError: (err: any) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/twitter/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twitter/status"] });
      toast({ title: "Disconnected", description: "Twitter account unlinked." });
    },
  });

  const postMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", "/api/twitter/post", { content }),
    onSuccess: (data: any) => {
      setTweetText("");
      toast({ title: "Tweet posted!", description: "Your tweet is live on X/Twitter." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (body: { content: string; scheduledFor: string }) =>
      apiRequest("POST", "/api/twitter/scheduled", body),
    onSuccess: () => {
      setScheduleText("");
      setScheduleDate("");
      setScheduleTime("");
      queryClient.invalidateQueries({ queryKey: ["/api/twitter/scheduled"] });
      toast({ title: "Tweet scheduled!", description: "It will post automatically at your chosen time." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to schedule", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/twitter/scheduled/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twitter/scheduled"] });
      toast({ title: "Removed", description: "Scheduled tweet deleted." });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      refetchStatus();
      toast({ title: "Twitter connected!", description: "Your X/Twitter account is now linked." });
      window.history.replaceState({}, "", "/twitter-scheduler");
    }
    if (params.get("error") === "auth_failed") {
      toast({ title: "Connection failed", description: "Could not authenticate with Twitter. Please try again.", variant: "destructive" });
      window.history.replaceState({}, "", "/twitter-scheduler");
    }
  }, []);

  const handleSchedule = () => {
    if (!scheduleText.trim() || !scheduleDate || !scheduleTime) return;
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    scheduleMutation.mutate({ content: scheduleText.trim(), scheduledFor });
  };

  const pending = scheduled.filter((t: any) => t.status === "pending");
  const done = scheduled.filter((t: any) => t.status !== "pending");

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(29,161,242,0.12)", border: "1px solid rgba(29,161,242,0.25)" }}>
            <Twitter className="w-5 h-5 text-[#1da1f2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">X / Twitter Scheduler</h1>
            <p className="text-xs text-muted-foreground">Post now or schedule tweets to go out automatically</p>
          </div>
        </div>

        {/* Connection Card */}
        {statusLoading ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : status?.connected ? (
          <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl" style={{ background: "rgba(29,161,242,0.07)", border: "1px solid rgba(29,161,242,0.2)" }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#1da1f2]" />
              <div>
                <p className="text-sm font-semibold text-white">Connected as <span className="text-[#1da1f2]">@{status.handle}</span></p>
                <p className="text-[10px] text-muted-foreground">Posts will appear on this account</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="text-xs text-zinc-500 hover:text-red-400 h-7" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} data-testid="button-disconnect-twitter">
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: "rgba(29,161,242,0.05)", border: "1px solid rgba(29,161,242,0.15)" }}>
            <Twitter className="w-8 h-8 text-[#1da1f2] mx-auto" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Connect your X / Twitter account</p>
              <p className="text-xs text-muted-foreground">Authorise once to enable posting and scheduling</p>
            </div>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="gap-2"
              style={{ background: "#1da1f2", color: "#fff" }}
              data-testid="button-connect-twitter"
            >
              {connectMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Connect X / Twitter
            </Button>
            <p className="text-[10px] text-muted-foreground">
              A Twitter authorisation window will open. Approve it and come back here.
            </p>
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
                  data-testid={`tab-${id}`}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${tab === id ? "bg-[#1da1f2] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Post Now Tab */}
            {tab === "post" && (
              <Card className="border-zinc-800">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-zinc-300">Compose Tweet</p>
                    <CharCount text={tweetText} />
                  </div>
                  <Textarea
                    value={tweetText}
                    onChange={e => setTweetText(e.target.value)}
                    placeholder="What's happening? Write your tweet here..."
                    className="min-h-[120px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                    data-testid="textarea-tweet-now"
                  />
                  <AiRefineButton text={tweetText} onAccept={setTweetText} context="tweet for X/Twitter — max 280 characters, engaging and punchy" />
                  <Button
                    onClick={() => postMutation.mutate(tweetText)}
                    disabled={!tweetText.trim() || tweetText.length > 280 || postMutation.isPending}
                    className="w-full gap-2"
                    style={{ background: "#1da1f2" }}
                    data-testid="button-post-now"
                  >
                    {postMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {postMutation.isPending ? "Posting..." : "Post to X / Twitter"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Schedule Tab */}
            {tab === "schedule" && (
              <Card className="border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-zinc-300">Tweet Content</p>
                      <CharCount text={scheduleText} />
                    </div>
                    <Textarea
                      value={scheduleText}
                      onChange={e => setScheduleText(e.target.value)}
                      placeholder="Write the tweet you want to schedule..."
                      className="min-h-[120px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                      data-testid="textarea-schedule-tweet"
                    />
                    <AiRefineButton text={scheduleText} onAccept={setScheduleText} context="tweet for X/Twitter — max 280 characters, engaging and punchy" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-400 font-medium">Date</p>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#1da1f2]/50"
                        data-testid="input-schedule-date"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-zinc-400 font-medium">Time (your local time)</p>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#1da1f2]/50"
                        data-testid="input-schedule-time"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSchedule}
                    disabled={!scheduleText.trim() || scheduleText.length > 280 || !scheduleDate || !scheduleTime || scheduleMutation.isPending}
                    className="w-full gap-2"
                    style={{ background: "#1da1f2" }}
                    data-testid="button-schedule-tweet"
                  >
                    {scheduleMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                    {scheduleMutation.isPending ? "Scheduling..." : "Schedule Tweet"}
                  </Button>
                  <p className="text-center text-[11px] text-zinc-600">Tweets check every 5 minutes and post automatically</p>
                </CardContent>
              </Card>
            )}

            {/* Queue Tab */}
            {tab === "queue" && (
              <div className="space-y-3">
                {queueLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : pending.length === 0 && done.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No scheduled tweets yet</p>
                    <p className="text-xs mt-1">Switch to the Schedule tab to create one</p>
                  </div>
                ) : (
                  <>
                    {pending.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1">Upcoming</p>
                        {pending.map((t: any) => (
                          <div key={t.id} data-testid={`tweet-card-${t.id}`} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(29,161,242,0.05)", border: "1px solid rgba(29,161,242,0.15)" }}>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-zinc-200 leading-relaxed flex-1">{t.content}</p>
                              <button onClick={() => deleteMutation.mutate(t.id)} disabled={deleteMutation.isPending} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5" data-testid={`delete-tweet-${t.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {new Date(t.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                              </div>
                              <StatusBadge status={t.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {done.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 pt-2">History</p>
                        {done.map((t: any) => (
                          <div key={t.id} data-testid={`tweet-history-${t.id}`} className="rounded-xl p-4 space-y-2 opacity-60" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-sm text-zinc-300 leading-relaxed">{t.content}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                                {t.status === "failed" ? (
                                  <><AlertCircle className="w-3 h-3 text-red-400" /><span className="text-red-400">{t.errorMessage || "Failed"}</span></>
                                ) : (
                                  <><CheckCircle2 className="w-3 h-3 text-emerald-400" />{new Date(t.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={t.status} />
                                {t.tweetId && (
                                  <a href={`https://twitter.com/i/web/status/${t.tweetId}`} target="_blank" rel="noreferrer" className="text-[#1da1f2] hover:opacity-80">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
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
