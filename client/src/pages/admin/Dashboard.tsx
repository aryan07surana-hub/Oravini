import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, FileText, MessageSquare, TrendingUp, Calendar,
  ArrowRight, ChevronRight, Phone, Globe, Quote, FolderKanban
} from "lucide-react";
import { format } from "date-fns";
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
  "Leadership is not about being in charge. It's about taking care of those in your charge.",
  "The key to success is to focus on goals, not obstacles.",
  "Believe you can and you're halfway there.",
  "Act as if what you do makes a difference. It does.",
  "You don't have to be great to start, but you have to start to be great.",
  "Don't stop when you're tired. Stop when you're done.",
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

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="border border-card-border">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: clients, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: docs } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: projectTracker } = useQuery<any>({
    queryKey: ["/api/admin/project-trackers"],
  });

  const eliteClients = (clients || []).filter((c: any) => c.tier === "elite");
  const activeClients = eliteClients.length;
  const totalDocs = (docs || []).length;

  const dailyQuote = getDailyQuote();

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your clients and portal content</p>
        </div>

        {/* World Clocks + Daily Quote */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border border-card-border lg:col-span-2" data-testid="admin-world-clocks">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">World Time</p>
              </div>
              <div className="flex items-start gap-4">
                <WorldClock city="Dubai" timezone="Asia/Dubai" />
                <div className="w-px h-12 bg-border self-center" />
                <WorldClock city="London" timezone="Europe/London" />
                <div className="w-px h-12 bg-border self-center" />
                <WorldClock city="New York" timezone="America/New_York" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-primary/20 bg-primary/5" data-testid="admin-daily-quote">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
              <Quote className="w-4 h-4 text-primary/60 mb-2" />
              <p className="text-sm font-medium text-foreground leading-relaxed italic">"{dailyQuote}"</p>
              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">Daily Motivation</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Elite Members" value={activeClients} sub="Tier 5 active" icon={Users} color="bg-primary/10 text-primary" />
          <StatCard label="Documents" value={totalDocs} sub="Shared across clients" icon={FileText} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatCard label="Conversations" value={(conversations || []).length} sub="Active chats" icon={MessageSquare} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <StatCard label="Upcoming Calls" value={(clients || []).filter((c: any) => c.nextCallDate && new Date(c.nextCallDate) > new Date()).length} sub="This week" icon={Phone} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        </div>

        <Card className="mb-8 border border-card-border bg-[radial-gradient(circle_at_top_left,_rgba(212,180,97,0.14),_transparent_30%),linear-gradient(135deg,#0f0f10_0%,#131314_58%,#171718_100%)] shadow-sm">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#d4b461]/20 text-[#d4b461] flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Project Tracker command center is live</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Track all Tier 5 client missions, approvals, blockers, and delivery phases in one workspace.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-foreground">{projectTracker?.metrics?.activeProjects ?? 0}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Active</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-foreground">{projectTracker?.metrics?.blockedProjects ?? 0}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Blocked</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-black/25 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-foreground">{projectTracker?.metrics?.approvalsPending ?? 0}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4b461]">Approvals</p>
              </div>
              <Link href="/admin/projects" className="inline-flex items-center gap-2 rounded-2xl bg-[#d4b461] px-4 py-3 text-sm font-semibold text-black hover:bg-[#c9a64f] transition-colors">
                Open Project Tracker
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clients list */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Elite Members</CardTitle>
                <Link href="/admin/clients" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientsLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : eliteClients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No Elite members yet</p>
                </div>
              ) : (
                eliteClients.slice(0, 5).map((client: any) => {
                  const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Link
                      key={client.id}
                      href={`/admin/clients/${client.id}`}
                      data-testid={`client-row-${client.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer"
                    >
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                      </div>
                      {client.program && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {client.program.split(" ").slice(0, 2).join(" ")}
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Upcoming calls */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming Calls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(clients || [])
                .filter((c: any) => c.nextCallDate && new Date(c.nextCallDate) > new Date())
                .sort((a: any, b: any) => new Date(a.nextCallDate).getTime() - new Date(b.nextCallDate).getTime())
                .slice(0, 5)
                .map((client: any) => {
                  const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={client.id} data-testid={`upcoming-call-${client.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-primary font-medium">
                          {format(new Date(client.nextCallDate), "MMM d 'at' h:mm a")}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
                    </div>
                  );
                })}
              {(clients || []).filter((c: any) => c.nextCallDate && new Date(c.nextCallDate) > new Date()).length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No upcoming calls</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent messages */}
        {(conversations || []).length > 0 && (
          <Card className="mt-6 border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Messages</CardTitle>
                <Link href="/admin/chat" className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  Open chat <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(conversations || []).slice(0, 3).map((conv: any) => {
                const initials = conv.client?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                return (
                  <Link
                    key={conv.client?.id}
                    href="/admin/chat"
                    data-testid={`conv-row-${conv.client?.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer"
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{conv.client?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0">
                      {conv.lastMessage && format(new Date(conv.lastMessage.createdAt), "MMM d")}
                    </p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
