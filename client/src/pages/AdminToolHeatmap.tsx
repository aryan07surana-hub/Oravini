import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Users, Zap, Activity, BarChart3 } from "lucide-react";

type ToolStat = {
  tool: string;
  totalUses: number;
  uniqueUsers: number;
  totalCredits: number;
};

type UserToolMatrix = {
  userId: string;
  userName: string;
  tools: Record<string, number>;
};

type HeatmapData = {
  toolStats: ToolStat[];
  allTools: string[];
  userToolMatrix: UserToolMatrix[];
};

type AnalyticsData = {
  overview: {
    total_users: number;
    total_actions: number;
    total_credits_used: number;
  };
  timeline: Array<{ date: string; tool: string; uses: number }>;
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
    total_uses: number;
    credits_used: number;
    unique_tools_used: number;
  }>;
  sectionUsage: Array<{ section: string; uses: number; unique_users: number }>;
  planBreakdown: Array<{ plan: string; tool: string; uses: number }>;
};

export default function AdminToolHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [heatmapRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/tool-heatmap", { credentials: "include" }),
        fetch("/api/admin/tool-analytics", { credentials: "include" }),
      ]);
      const heatmap = await heatmapRes.json();
      const analytics = await analyticsRes.json();
      setHeatmapData(heatmap);
      setAnalyticsData(analytics);
    } catch (err) {
      console.error("Failed to fetch tool data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getHeatColor = (value: number, max: number) => {
    const intensity = Math.min(value / max, 1);
    if (intensity === 0) return "bg-gray-100 text-gray-400";
    if (intensity < 0.2) return "bg-blue-100 text-blue-700";
    if (intensity < 0.4) return "bg-green-100 text-green-700";
    if (intensity < 0.6) return "bg-yellow-100 text-yellow-700";
    if (intensity < 0.8) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const formatToolName = (tool: string) => {
    const names: Record<string, string> = {
      ai_ideas: "AI Content Ideas",
      ai_coach: "AI Script Generator",
      ai_report: "Content Report",
      carousel: "Carousel Builder",
      carousel_image: "Carousel Images",
      competitor: "Competitor Analysis",
      competitor_reels: "Reel Comparison",
      niche_analysis: "Niche Intelligence",
      methodology: "Content DNA",
      hashtag_suggestions: "Hashtag Suggestions",
      steal_strategy: "Steal Strategy",
    };
    return names[tool] || tool.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4b461]"></div>
      </div>
    );
  }

  const maxUses = Math.max(...(heatmapData?.toolStats.map((t) => t.totalUses) || [1]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#d4b461] to-[#b8964d] rounded-xl">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tool Usage Heatmap</h1>
            <p className="text-gray-600">Track which tools and sections users engage with most</p>
          </div>
        </div>

        {/* Overview Cards */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData.overview.total_users.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Active platform users</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Total Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData.overview.total_actions.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Tool uses across platform</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Credits Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData.overview.total_credits_used.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total platform engagement</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="heatmap" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="users">Top Users</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  User × Tool Heatmap
                </CardTitle>
                <CardDescription>
                  Visual representation of which users are using which tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-white z-10 p-3 text-left text-sm font-semibold text-gray-700 border-b-2">
                          User
                        </th>
                        {heatmapData?.allTools.map((tool) => (
                          <th
                            key={tool}
                            className="p-3 text-left text-xs font-medium text-gray-600 border-b-2 min-w-[120px]"
                          >
                            {formatToolName(tool)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData?.userToolMatrix.map((user) => (
                        <tr key={user.userId} className="hover:bg-gray-50">
                          <td className="sticky left-0 bg-white z-10 p-3 text-sm font-medium text-gray-900 border-b">
                            {user.userName}
                          </td>
                          {heatmapData.allTools.map((tool) => {
                            const uses = user.tools[tool] || 0;
                            return (
                              <td key={tool} className="p-3 border-b">
                                <div
                                  className={`px-3 py-2 rounded-lg text-center font-semibold text-sm ${getHeatColor(
                                    uses,
                                    maxUses
                                  )}`}
                                >
                                  {uses > 0 ? uses : "—"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Section Usage</CardTitle>
                <CardDescription>
                  Which platform sections are most popular
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.sectionUsage.map((section) => (
                    <div key={section.section} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#d4b461]"></div>
                          <span className="font-semibold text-gray-900">{section.section}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            {section.uses.toLocaleString()} uses
                          </span>
                          <Badge variant="secondary">
                            {section.unique_users} users
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#d4b461] to-[#b8964d] h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (section.uses /
                                Math.max(
                                  ...(analyticsData?.sectionUsage.map((s) => s.uses) || [1])
                                )) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Most Active Users
                </CardTitle>
                <CardDescription>Users with highest tool engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.topUsers.map((user, idx) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#d4b461] to-[#b8964d] text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-gray-900">{user.total_uses}</div>
                          <div className="text-xs text-gray-500">uses</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900">{user.unique_tools_used}</div>
                          <div className="text-xs text-gray-500">tools</div>
                        </div>
                        <Badge
                          variant={
                            user.plan === "elite"
                              ? "default"
                              : user.plan === "pro"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {user.plan}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tool Popularity</CardTitle>
                <CardDescription>Most used tools across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {heatmapData?.toolStats.map((tool, idx) => (
                    <div key={tool.tool} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#d4b461] text-white text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="font-semibold text-gray-900">
                            {formatToolName(tool.tool)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            {tool.totalUses.toLocaleString()} uses
                          </span>
                          <Badge variant="secondary">{tool.uniqueUsers} users</Badge>
                          <span className="text-xs text-gray-500">
                            {tool.totalCredits} credits
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(tool.totalUses / maxUses) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
