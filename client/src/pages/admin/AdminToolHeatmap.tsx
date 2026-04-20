import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, Zap, TrendingUp } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  ai_ideas: "AI Content Ideas",
  ai_coach: "AI Content Coach",
  ai_report: "AI Content Report",
  carousel: "Carousel Studio",
  carousel_image: "Carousel Image Gen",
  competitor: "Competitor Analysis",
  virality: "Virality Tester",
  virality_hooks: "Viral Hooks",
  virality_rewrite: "Script Rewrite",
  virality_angles: "Viral Angles",
};

function getToolLabel(type: string) {
  return TOOL_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getHeatColor(value: number, max: number) {
  if (max === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio === 0) return "bg-muted text-muted-foreground";
  if (ratio < 0.2) return "bg-primary/10 text-primary";
  if (ratio < 0.4) return "bg-primary/25 text-primary";
  if (ratio < 0.6) return "bg-primary/45 text-primary-foreground";
  if (ratio < 0.8) return "bg-primary/70 text-primary-foreground";
  return "bg-primary text-primary-foreground";
}

export default function AdminToolHeatmap() {
  const { data, isLoading } = useQuery<{
    toolStats: { tool: string; totalUses: number; uniqueUsers: number; totalCredits: number }[];
    userToolMatrix: { userName: string; userId: string; tools: Record<string, number> }[];
    allTools: string[];
  }>({
    queryKey: ["/api/admin/tool-heatmap"],
  });

  const toolStats = data?.toolStats || [];
  const userToolMatrix = data?.userToolMatrix || [];
  const allTools = data?.allTools || [];
  const maxUses = Math.max(...toolStats.map((t) => t.totalUses), 1);
  const maxCellValue = Math.max(
    ...userToolMatrix.flatMap((u) => Object.values(u.tools)),
    1
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tool Usage Heatmap</h1>
          <p className="text-muted-foreground mt-1">See which tools your users use the most</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading
            ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            : toolStats.slice(0, 4).map((t) => (
                <Card key={t.tool} className="border border-card-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                        {getToolLabel(t.tool)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{t.totalUses}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.uniqueUsers} users · {t.totalCredits} credits</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Tool Bar Chart */}
        <Card className="border border-card-border mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tool Usage Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : toolStats.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No tool usage data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {toolStats.map((t) => (
                  <div key={t.tool} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-44 flex-shrink-0 truncate">{getToolLabel(t.tool)}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((t.totalUses / maxUses) * 100, 4)}%` }}
                      >
                        <span className="text-[10px] font-bold text-primary-foreground">{t.totalUses}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t.uniqueUsers}</span>
                      <Zap className="w-3 h-3 text-muted-foreground ml-1" />
                      <span className="text-xs text-muted-foreground">{t.totalCredits}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User × Tool Heatmap Grid */}
        <Card className="border border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              User × Tool Heatmap
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Each cell = number of times a user used that tool. Darker = more usage.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : userToolMatrix.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-muted-foreground font-medium w-36 sticky left-0 bg-background z-10">User</th>
                    {allTools.map((tool) => (
                      <th key={tool} className="p-2 text-muted-foreground font-medium text-center min-w-[80px]">
                        <span className="block truncate max-w-[80px]" title={getToolLabel(tool)}>
                          {getToolLabel(tool)}
                        </span>
                      </th>
                    ))}
                    <th className="p-2 text-muted-foreground font-medium text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {userToolMatrix.map((row) => {
                    const total = Object.values(row.tools).reduce((s, v) => s + v, 0);
                    return (
                      <tr key={row.userId} className="border-t border-border/40">
                        <td className="p-2 font-medium text-foreground truncate max-w-[140px] sticky left-0 bg-background z-10" title={row.userName}>
                          {row.userName}
                        </td>
                        {allTools.map((tool) => {
                          const val = row.tools[tool] || 0;
                          return (
                            <td key={tool} className="p-1 text-center">
                              <div
                                className={`rounded-md w-full h-8 flex items-center justify-center font-semibold text-xs transition-all ${getHeatColor(val, maxCellValue)}`}
                                title={`${row.userName} used ${getToolLabel(tool)} ${val} times`}
                              >
                                {val > 0 ? val : ""}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <Badge variant="secondary" className="text-[10px]">{total}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
