import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, Sparkles, TrendingUp, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContentCalendar() {
  const [loading, setLoading] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    niche: "",
    platform: "instagram",
    goal: "",
    days: "30",
  });

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      const res = await fetch("/api/content-calendar");
      if (res.ok) {
        const data = await res.json();
        setCalendars(data);
      }
    } catch (err) {
      console.error("Failed to fetch calendars:", err);
    }
  };

  const generateCalendar = async () => {
    if (!formData.niche || !formData.goal) {
      toast({ title: "Missing fields", description: "Please fill in niche and goal", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/content-calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.insufficientCredits) {
          toast({ title: "Insufficient credits", description: data.message, variant: "destructive" });
        } else {
          toast({ title: "Generation failed", description: data.message, variant: "destructive" });
        }
        return;
      }

      toast({ title: "Calendar generated!", description: `${data.posts?.length || 0} posts created` });
      setSelectedCalendar(data);
      fetchCalendars();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const viewCalendar = async (id: string) => {
    try {
      const res = await fetch(`/api/content-calendar/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCalendar(data);
      }
    } catch (err) {
      console.error("Failed to fetch calendar:", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-yellow-500" />
          Content Intelligence Engine
        </h1>
        <p className="text-gray-400">
          Generate a month of content trained on 10,000+ viral posts. No generic AI bullshit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Form */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-xl font-bold mb-4">Generate Calendar</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Month</Label>
              <Input
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              />
            </div>

            <div>
              <Label>Niche</Label>
              <Input
                placeholder="e.g. Business Coaching"
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              />
            </div>

            <div>
              <Label>Platform</Label>
              <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Goal</Label>
              <Textarea
                placeholder="e.g. Grow followers and generate leads"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Days to Generate</Label>
              <Select value={formData.days} onValueChange={(v) => setFormData({ ...formData, days: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateCalendar} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Calendar
                </>
              )}
            </Button>
          </div>

          {/* Previous Calendars */}
          {calendars.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Previous Calendars</h3>
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => viewCalendar(cal.id)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-gray-800 transition"
                  >
                    <div className="font-medium">{cal.month}</div>
                    <div className="text-sm text-gray-400">{cal.niche} • {cal.platform}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Calendar View */}
        <div className="lg:col-span-2">
          {selectedCalendar ? (
            <div className="space-y-6">
              {/* Strategy Overview */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Strategy Overview
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">TOFU</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {selectedCalendar.strategy?.tofuPercent || 40}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">MOFU</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {selectedCalendar.strategy?.mofuPercent || 40}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">BOFU</div>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedCalendar.strategy?.bofuPercent || 20}%
                    </div>
                  </div>
                </div>
              </Card>

              {/* Posts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCalendar.posts?.map((post: any, idx: number) => (
                  <Card key={idx} className="p-4 hover:border-yellow-500 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Day {post.day}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        post.funnelStage === "top" ? "bg-blue-500/20 text-blue-400" :
                        post.funnelStage === "middle" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-green-500/20 text-green-400"
                      }`}>
                        {post.funnelStage?.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-bold mb-2">{post.title}</h3>
                    
                    <div className="text-sm text-gray-400 mb-2">
                      <span className="font-medium text-gray-300">Hook:</span> {post.hook}
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      {post.contentType} • {post.hookType}
                    </div>

                    {post.whyItWorks && (
                      <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded mt-2">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {post.whyItWorks}
                      </div>
                    )}

                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="text-xs text-blue-400 mt-2">
                        {post.hashtags.slice(0, 5).join(" ")}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-bold mb-2">No Calendar Selected</h3>
              <p className="text-gray-400">
                Generate a new calendar or select a previous one to view
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
