import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Instagram, Youtube, ChevronLeft, ChevronRight, ArrowLeft, Calendar
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, getDay
} from "date-fns";
import { Link } from "wouter";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  reel: "Reel", carousel: "Carousel", story: "Story", video: "Video", post: "Post"
};

const TYPE_COLORS: Record<string, string> = {
  reel: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  carousel: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  story: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  video: "bg-red-500/10 text-red-400 border-red-500/20",
  post: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function buildDaySummary(dayPosts: any[]) {
  const igPosts = dayPosts.filter(p => p.platform === "instagram");
  const ytPosts = dayPosts.filter(p => p.platform === "youtube");
  const labels: { text: string; platform: string }[] = [];

  if (igPosts.length > 0) {
    const grouped: Record<string, number> = {};
    igPosts.forEach(p => { grouped[p.contentType] = (grouped[p.contentType] || 0) + 1; });
    Object.entries(grouped).forEach(([type, count]) => {
      labels.push({
        text: `${count} Instagram ${CONTENT_TYPE_LABELS[type] || type}${count > 1 ? "s" : ""} posted`,
        platform: "instagram",
      });
    });
  }

  if (ytPosts.length > 0) {
    labels.push({
      text: `${ytPosts.length} YouTube Video${ytPosts.length > 1 ? "s" : ""} posted`,
      platform: "youtube",
    });
  }

  return labels;
}

export default function ContentCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/content/${user?.id}`],
    enabled: !!user?.id,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const postsOnDay = (day: Date) => posts.filter(p => isSameDay(new Date(p.postDate), day));
  const selectedPosts = selectedDay ? postsOnDay(selectedDay) : [];

  const monthStats = {
    ig: posts.filter(p => {
      const d = new Date(p.postDate);
      return p.platform === "instagram" && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }).length,
    yt: posts.filter(p => {
      const d = new Date(p.postDate);
      return p.platform === "youtube" && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }).length,
  };

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/tracking/content">
            <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-calendar">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Content Calendar</h1>
              <p className="text-xs text-muted-foreground">All your Instagram and YouTube posts in one view</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border border-card-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-pink-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Instagram className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{monthStats.ig}</p>
                <p className="text-xs text-muted-foreground">Instagram posts this month</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-card-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Youtube className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{monthStats.yt}</p>
                <p className="text-xs text-muted-foreground">YouTube videos this month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-foreground text-base">{format(currentMonth, "MMMM yyyy")}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))} data-testid="calendar-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())} data-testid="calendar-today">
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))} data-testid="calendar-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array(35).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
                ))}
                {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map(day => {
                  const dayPosts = postsOnDay(day);
                  const summary = buildDaySummary(dayPosts);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                      className={`relative p-1.5 rounded-lg min-h-[72px] flex flex-col items-start gap-1 border transition-colors text-left ${
                        isSelected
                          ? "bg-primary border-primary"
                          : isToday
                          ? "border-primary/40 bg-primary/5"
                          : dayPosts.length > 0
                          ? "border-border/50 hover:border-primary/40 hover:bg-accent"
                          : "border-transparent hover:border-border hover:bg-accent"
                      }`}
                    >
                      <span className={`text-xs font-medium w-full text-center ${
                        isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-foreground"
                      }`}>
                        {format(day, "d")}
                      </span>

                      {summary.map((item, i) => (
                        <span
                          key={i}
                          className={`text-[8px] leading-tight px-1 py-0.5 rounded w-full truncate font-medium ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : item.platform === "instagram"
                              ? "bg-pink-500/15 text-pink-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {item.text}
                        </span>
                      ))}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-5 text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-pink-500/20 flex items-center justify-center">
                  <Instagram className="w-2 h-2 text-pink-400" />
                </span>
                Instagram
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500/20 flex items-center justify-center">
                  <Youtube className="w-2 h-2 text-red-400" />
                </span>
                YouTube
              </span>
              <span className="ml-auto text-[10px]">Click a day to see post details</span>
            </div>
          </CardContent>
        </Card>

        {selectedDay && (
          <Card className="border border-card-border" data-testid="calendar-day-detail">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-foreground mb-4">
                {format(selectedDay, "EEEE, MMMM d, yyyy")}
              </p>
              {selectedPosts.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No content logged for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPosts.map((post: any) => (
                    <div key={post.id} className="flex items-center gap-4 p-4 bg-card border border-card-border rounded-xl">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        post.platform === "instagram" ? "bg-pink-500/10" : "bg-red-500/10"
                      }`}>
                        {post.platform === "instagram"
                          ? <Instagram className="w-5 h-5 text-pink-400" />
                          : <Youtube className="w-5 h-5 text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-foreground truncate">{post.title || "Untitled"}</p>
                          <Badge variant="outline" className={`text-[10px] border flex-shrink-0 ${TYPE_COLORS[post.contentType] || ""}`}>
                            {CONTENT_TYPE_LABELS[post.contentType]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {post.platform} · {post.views.toLocaleString()} views
                          {post.platform === "instagram" && post.followersGained > 0 && ` · +${post.followersGained} followers`}
                          {post.platform === "youtube" && post.subscribersGained > 0 && ` · +${post.subscribersGained} subs`}
                        </p>
                        {post.postUrl && (
                          <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-0.5 block truncate">
                            {post.postUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
