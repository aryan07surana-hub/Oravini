import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, CheckCircle2, Circle, FileText, MessageSquare, Calendar,
  TrendingUp, Clock, ArrowRight, ChevronRight, AlertCircle
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className="border border-card-border bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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

  const { data: docs } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  const { data: calls } = useQuery<any[]>({
    queryKey: [`/api/calls/${user?.id}`],
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

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
                  <p className="text-sm font-semibold text-primary">
                    {format(new Date(user.nextCallDate), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp} label="Overall Progress" value={`${avgProgress}%`} sub="Across all tracks" color="bg-primary/10 text-primary" />
          <StatCard icon={CheckCircle2} label="Tasks Done" value={completedTasks} sub={`${pendingTasks} pending`} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <StatCard icon={FileText} label="Documents" value={(docs || []).length} sub="Shared with you" color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatCard icon={MessageSquare} label="Call Sessions" value={(calls || []).length} sub="Total recorded" color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress */}
          <Card className="lg:col-span-2 border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Program Progress</CardTitle>
                <Link href="/progress">
                  <a className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    View details <ArrowRight className="w-3 h-3" />
                  </a>
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
                    <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5 border-0">
                      {unreadNotifs.length}
                    </Badge>
                  )}
                </CardTitle>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-primary hover:underline"
                    data-testid="mark-all-read"
                  >
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
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      !n.read ? "bg-primary/5 border-primary/20" : "bg-card border-card-border"
                    }`}
                  >
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(n.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1 flex-shrink-0" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <Card className="mt-6 border border-card-border">
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
                    className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all ${
                      task.completed ? "opacity-60 bg-muted/30 border-border" : "bg-card border-card-border hover:border-primary/30"
                    }`}
                  >
                    <button
                      onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                      data-testid={`toggle-task-${task.id}`}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {task.completed
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                      )}
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
