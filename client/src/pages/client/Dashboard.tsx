import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bell, CheckCircle2, Circle, FileText, MessageSquare, Calendar,
  TrendingUp, Clock, ArrowRight, AlertCircle, CalendarPlus, Target, Eye, Instagram, Youtube, Users, DollarSign, Globe, Quote
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const QUOTES = [
  "Success is not the key to happiness. Happiness is the key to success.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Success usually comes to those who are too busy to be looking for it.",
  "Dreams don't work unless you do.",
  "The only way to do great work is to love what you do.",
  "It always seems impossible until it's done.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The key to success is to focus on goals, not obstacles.",
  "Believe you can and you're halfway there.",
  "Act as if what you do makes a difference. It does.",
  "What you get by achieving your goals is not as important as what you become.",
  "You don't have to be great to start, but you have to start to be great.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Little things make big days.",
  "It's going to be hard, but hard is not impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key is to keep company only with people who uplift you.",
  "Change your thoughts and you change your world.",
  "Either you run the day or the day runs you.",
  "A year from now you may wish you had started today.",
  "Never give up on a dream just because of the time it will take to accomplish it.",
  "Opportunities don't happen, you create them.",
  "The road to success and the road to failure are almost exactly the same.",
];

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

function WorldClock({ city, timezone }: { city: string; timezone: string }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      setTime(new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: timezone }).format(new Date()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone }).format(new Date());
  return (
    <div className="flex-1 min-w-0 text-center">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{city}</p>
      <p className="text-xl font-bold text-foreground font-mono tabular-nums mt-0.5">{time}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className="border border-card-border bg-card">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function GoalDialog({ userId, autoOpen }: { userId: string; autoOpen: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("6");

  useEffect(() => {
    if (autoOpen) {
      const shown = sessionStorage.getItem("goalDialogShown");
      if (!shown) {
        setOpen(true);
        sessionStorage.setItem("goalDialogShown", "1");
      }
    }
  }, [autoOpen]);

  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/income-goal", { goalAmount: +amount, timeframeMonths: +months, currency: "USD" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/income-goal/${userId}`] });
      toast({ title: "Goal set! Let's make it happen 🎯" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline" data-testid="button-set-goal-trigger">Set Goal</button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to Brandverse! 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1">Let's start by setting your income goal. How much money do you want to make in the next 6 months?</p>
        <div className="space-y-4 mt-3">
          <div>
            <label className="text-sm font-medium text-foreground">Target Amount (USD)</label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 100000" className="pl-9" data-testid="input-goal-amount-welcome" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Timeframe (months)</label>
            <Input type="number" value={months} onChange={e => setMonths(e.target.value)} min="1" max="24" className="mt-1" />
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!amount || save.isPending} data-testid="button-save-welcome-goal">
            {save.isPending ? "Saving..." : "Set My Goal"}
          </Button>
          <button onClick={() => setOpen(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncomeGoalCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("6");

  const { data: goal, isLoading } = useQuery<any>({
    queryKey: [`/api/income-goal/${userId}`],
    enabled: !!userId,
  });

  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/income-goal", { goalAmount: +amount, timeframeMonths: +months, currency: "USD" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/income-goal/${userId}`] });
      toast({ title: "Goal updated!" });
      setEditOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <Card className="border border-card-border">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${goal ? "border-primary/30 bg-primary/5" : "border-dashed border-primary/30 bg-primary/5"}`}>
      <CardContent className="p-6 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          {goal && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <button className="text-xs text-primary hover:underline" data-testid="button-edit-goal">Edit</button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Update Income Goal</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Target Amount</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={String(goal.goalAmount)} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Timeframe (months)</label>
                    <Input type="number" value={months} onChange={e => setMonths(e.target.value)} min="1" max="24" className="mt-1" />
                  </div>
                  <Button className="w-full" onClick={() => save.mutate()} disabled={!amount || save.isPending} data-testid="button-save-goal">
                    {save.isPending ? "Saving..." : "Update Goal"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Income Goal</p>
          {goal ? (
            <>
              <p className="text-2xl font-bold text-foreground">${Number(goal.goalAmount).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">in {goal.timeframeMonths} months</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground">Not set yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Set a goal to stay focused</p>
              <GoalDialog userId={userId} autoOpen={false} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: prog, isLoading: progLoading } = useQuery<any>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: notifications, isLoading: notifsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: docs } = useQuery<any[]>({ queryKey: ["/api/documents"] });
  const { data: calls } = useQuery<any[]>({ queryKey: [`/api/calls/${user?.id}`], enabled: !!user?.id });
  const { data: contentPosts } = useQuery<any[]>({ queryKey: [`/api/content/${user?.id}`], enabled: !!user?.id });

  const { data: goal, isLoading: goalLoading } = useQuery<any>({
    queryKey: [`/api/income-goal/${user?.id}`],
    enabled: !!user?.id,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: any) => apiRequest("PATCH", `/api/tasks/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${user?.id}`] });
      toast({ title: "Task updated" });
    },
  });

  const avgProgress = prog ? Math.round((prog.offerCreation + prog.funnelProgress + prog.contentProgress + prog.monetizationProgress) / 4) : 0;
  const completedTasks = (tasks || []).filter((t: any) => t.completed).length;
  const pendingTasks = (tasks || []).filter((t: any) => !t.completed).length;
  const unreadNotifs = (notifications || []).filter((n: any) => !n.read);
  const totalContentViews = (contentPosts || []).reduce((s: number, p: any) => s + p.views, 0);
  const totalFollowers = (contentPosts || []).reduce((s: number, p: any) => s + p.followersGained + p.subscribersGained, 0);

  const dailyQuote = getDailyQuote();
  const showGoalDialog = !goalLoading && goal === null && !!user?.id;

  return (
    <ClientLayout>
      {showGoalDialog && user?.id && (
        <GoalDialog userId={user.id} autoOpen={true} />
      )}

      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 data-testid="text-welcome" className="text-2xl lg:text-3xl font-bold text-foreground">
              Welcome back, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.program && <span className="font-medium">{user.program}</span>}
            </p>
          </div>
          {user?.nextCallDate && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Next call</p>
                <p className="text-sm font-semibold text-primary">{format(new Date(user.nextCallDate), "MMM d, h:mm a")}</p>
              </div>
            </div>
          )}
        </div>

        {/* World Clocks Bar — always at the top */}
        <Card className="border border-card-border" data-testid="world-clocks-bar">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">World Clocks</p>
            </div>
            <div className="flex items-center divide-x divide-border">
              <WorldClock city="Dubai" timezone="Asia/Dubai" />
              <div className="flex-1 min-w-0 text-center px-4">
                <WorldClock city="London" timezone="Europe/London" />
              </div>
              <WorldClock city="New York" timezone="America/New_York" />
            </div>
          </CardContent>
        </Card>

        {/* Two square cards: Daily Quote + Income Goal */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border border-primary/20 bg-primary/5 min-h-[180px]" data-testid="daily-quote-card">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center mb-4">
                <Quote className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Daily Quote</p>
                <p className="text-sm italic text-foreground leading-relaxed">"{dailyQuote}"</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">{format(new Date(), "MMMM d, yyyy")}</p>
            </CardContent>
          </Card>

          <div className="min-h-[180px]" data-testid="income-goal-card">
            {user?.id && <IncomeGoalCard userId={user.id} />}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Overall Progress" value={`${avgProgress}%`} sub="Across all tracks" color="bg-primary/10 text-primary" />
          <StatCard icon={CheckCircle2} label="Tasks Done" value={completedTasks} sub={`${pendingTasks} pending`} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <StatCard icon={Eye} label="Content Views" value={totalContentViews.toLocaleString()} sub={`${(contentPosts || []).length} posts`} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatCard icon={Users} label="Followers Gained" value={`+${totalFollowers}`} sub="Total growth" color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        </div>

        {/* Calendly Booking Banner */}
        <a
          href="https://calendly.com/brandversee/30min"
          target="_blank"
          rel="noreferrer"
          data-testid="book-a-call-banner"
          className="flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-200 group shadow-sm"
        >
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarPlus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base text-white">Whenever you want to book a call, book it here</p>
            <p className="text-sm text-white/70 mt-0.5">30-minute strategy session · calendly.com/brandversee</p>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-4 py-2 flex-shrink-0 group-hover:bg-white/25 transition-colors">
            <span className="text-sm font-semibold text-white">Book Now</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress */}
          <Card className="lg:col-span-2 border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Program Progress</CardTitle>
                <Link href="/progress" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  View details <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {progLoading ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : prog ? (
                [
                  { label: "Offer Creation", value: prog.offerCreation },
                  { label: "Funnel Progress", value: prog.funnelProgress },
                  { label: "Content Progress", value: prog.contentProgress },
                  { label: "Monetization", value: prog.monetizationProgress },
                ].map(({ label, value }) => (
                  <div key={label} data-testid={`progress-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <span className="text-sm font-bold text-primary">{value}%</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Progress not set yet</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadNotifs.length > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5 border-0">{unreadNotifs.length}</Badge>
                  )}
                </CardTitle>
                {unreadNotifs.length > 0 && (
                  <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline" data-testid="mark-all-read">
                    Mark all read
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {notifsLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : (notifications || []).length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                (notifications || []).slice(0, 5).map((n: any) => (
                  <div
                    key={n.id}
                    data-testid={`notification-${n.id}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${!n.read ? "bg-primary/5 border-primary/20" : "bg-card border-card-border"}`}
                  >
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.createdAt), "MMM d, h:mm a")}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1 flex-shrink-0" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content Summary */}
        {(contentPosts || []).length > 0 && (
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Content Performance</CardTitle>
                <Link href="/tracking/content" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  Full tracker <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Posts", value: (contentPosts || []).length, icon: FileText, color: "text-purple-400" },
                  { label: "Total Views", value: totalContentViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
                  { label: "Instagram", value: (contentPosts || []).filter((p: any) => p.platform === "instagram").length, icon: Instagram, color: "text-pink-400" },
                  { label: "YouTube", value: (contentPosts || []).filter((p: any) => p.platform === "youtube").length, icon: Youtube, color: "text-red-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="text-center">
                    <Icon className={`w-6 h-6 ${color} mx-auto mb-1`} />
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        <Card className="border border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Action Items</CardTitle>
              <Badge variant="secondary">{pendingTasks} pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
            ) : (tasks || []).length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(tasks || []).map((task: any) => (
                  <div
                    key={task.id}
                    data-testid={`task-${task.id}`}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all ${task.completed ? "opacity-60 bg-muted/30 border-border" : "bg-card border-card-border hover:border-primary/30"}`}
                  >
                    <button onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })} data-testid={`toggle-task-${task.id}`} className="mt-0.5 flex-shrink-0">
                      {task.completed
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className={`text-xs ${isAfter(new Date(), new Date(task.dueDate)) && !task.completed ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
