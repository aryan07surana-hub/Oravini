import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Target, Layers, DollarSign, FileText } from "lucide-react";

const tracks = [
  { key: "offerCreation", label: "Offer Creation", description: "Building and refining your core offer", icon: Target, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", bar: "bg-purple-500" },
  { key: "funnelProgress", label: "Funnel Progress", description: "Sales funnel setup and optimization", icon: Layers, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", bar: "bg-blue-500" },
  { key: "contentProgress", label: "Content Progress", description: "Content creation and publishing consistency", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", bar: "bg-emerald-500" },
  { key: "monetizationProgress", label: "Monetization", description: "Revenue generation and monetization systems", icon: DollarSign, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", bar: "bg-orange-500" },
];

function getProgressLabel(value: number) {
  if (value < 25) return { label: "Just Started", color: "text-muted-foreground" };
  if (value < 50) return { label: "In Progress", color: "text-blue-600" };
  if (value < 75) return { label: "Good Progress", color: "text-emerald-600" };
  if (value < 100) return { label: "Almost There", color: "text-orange-600" };
  return { label: "Complete!", color: "text-purple-600" };
}

export default function ClientProgress() {
  const { user } = useAuth();

  const { data: prog, isLoading } = useQuery<any>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user?.id,
  });

  const avgProgress = prog ? Math.round((prog.offerCreation + prog.funnelProgress + prog.contentProgress + prog.monetizationProgress) / 4) : 0;

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Progress Tracker</h1>
          <p className="text-muted-foreground mt-1">Track your journey through the program</p>
        </div>

        {/* Overall */}
        <Card className="mb-6 border border-card-border bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Program Progress</p>
                    <p className="text-3xl font-bold text-foreground mt-0.5">{avgProgress}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">{getProgressLabel(avgProgress).label}</p>
                  </div>
                </div>
                <Progress value={avgProgress} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual tracks */}
        <div className="grid grid-cols-1 gap-4">
          {tracks.map(({ key, label, description, icon: Icon, color, bg, bar }) => {
            const value = prog?.[key] ?? 0;
            const status = getProgressLabel(value);
            return (
              <Card key={key} data-testid={`track-${key}`} className="border border-card-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isLoading ? (
                            <Skeleton className="h-7 w-16" />
                          ) : (
                            <>
                              <p className={`text-2xl font-bold ${color}`}>{value}%</p>
                              <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-2 w-full" />
                      ) : (
                        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 ${bar} rounded-full transition-all duration-700`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      )}

                      {/* Milestone markers */}
                      <div className="flex justify-between mt-2">
                        {[0, 25, 50, 75, 100].map((m) => (
                          <div key={m} className="flex flex-col items-center">
                            <div className={`w-1 h-1 rounded-full ${value >= m ? color.replace("text-", "bg-") : "bg-muted"}`} />
                            <span className="text-[9px] text-muted-foreground mt-0.5">{m}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isLoading && !prog && (
          <div className="text-center py-12 mt-4">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">Progress tracking not set up yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your coach will update this after your sessions</p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
