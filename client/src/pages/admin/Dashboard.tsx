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
  ArrowRight, ChevronRight, Phone
} from "lucide-react";
import { format } from "date-fns";

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

  const activeClients = (clients || []).length;
  const totalDocs = (docs || []).length;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your clients and portal content</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Clients" value={activeClients} sub="Active in portal" icon={Users} color="bg-primary/10 text-primary" />
          <StatCard label="Documents" value={totalDocs} sub="Shared across clients" icon={FileText} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatCard label="Conversations" value={(conversations || []).length} sub="Active chats" icon={MessageSquare} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <StatCard label="Upcoming Calls" value={(clients || []).filter((c: any) => c.nextCallDate && new Date(c.nextCallDate) > new Date()).length} sub="This week" icon={Phone} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clients list */}
          <Card className="border border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Active Clients</CardTitle>
                <Link href="/admin/clients">
                  <a className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    View all <ArrowRight className="w-3 h-3" />
                  </a>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientsLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (clients || []).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No clients yet</p>
                </div>
              ) : (
                (clients || []).slice(0, 5).map((client: any) => {
                  const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Link key={client.id} href={`/admin/clients/${client.id}`}>
                      <a
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
                      </a>
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
                <Link href="/admin/chat">
                  <a className="text-xs text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    Open chat <ArrowRight className="w-3 h-3" />
                  </a>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(conversations || []).slice(0, 3).map((conv: any) => {
                const initials = conv.client?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                return (
                  <Link key={conv.client?.id} href="/admin/chat">
                    <a
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
                    </a>
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
