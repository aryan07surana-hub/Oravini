import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonitorPlay, Calendar, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

export default function UpcomingWebinars() {
    const { data: webinars } = useQuery<any[]>({
        queryKey: ["/api/webinars/public"],
        staleTime: 60000,
    });
    const upcoming = (webinars || [])
        .filter((w: any) => w.status === "upcoming" || w.status === "live")
        .slice(0, 3);

    // Fallback demo data if no webinars yet
    const demo = [
        {
            id: "d1",
            title: "Scale Your Coaching Business With Webinars",
            presenterName: "Aryan Surana",
            scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(),
            durationMinutes: 60,
            status: "upcoming",
            thumbnailUrl: null,
        },
        {
            id: "d2",
            title: "High-Converting Landing Pages Masterclass",
            presenterName: "Oravini Team",
            scheduledAt: new Date(Date.now() + 86400000 * 7).toISOString(),
            durationMinutes: 45,
            status: "upcoming",
            thumbnailUrl: null,
        },
        {
            id: "d3",
            title: "Turn Webinar Leads Into Paying Clients",
            presenterName: "Sales Team",
            scheduledAt: new Date(Date.now() + 86400000 * 10).toISOString(),
            durationMinutes: 75,
            status: "upcoming",
            thumbnailUrl: null,
        },
    ];
    const items = upcoming.length > 0 ? upcoming : demo;

    return (
        <section
            id="webinars"
            className="py-20 lg:py-28 border-t"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8">
                <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
                    <div>
                        <Badge
                            className="mb-3 border-0"
                            style={{ background: `${GOLD}18`, color: GOLD }}
                        >
                            <Calendar className="w-3 h-3 mr-1.5" /> Upcoming events
                        </Badge>
                        <h2 className="text-3xl md:text-4xl font-black text-white">
                            Join a live webinar
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">
                            Curated, high-value sessions from industry experts.
                        </p>
                    </div>
                    <Link href="/login">
                        <Button
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900"
                        >
                            View all <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {items.map((w: any) => (
                        <Card
                            key={w.id}
                            className="group overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 transition-all"
                        >
                            <div className="relative h-40 overflow-hidden">
                                <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, rgba(212,180,97,0.08), rgba(18,14,30,0.6))",
                                    }}
                                >
                                    {w.thumbnailUrl ? (
                                        <img
                                            src={w.thumbnailUrl}
                                            alt={w.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <MonitorPlay
                                            className="w-12 h-12"
                                            style={{ color: `${GOLD}50` }}
                                        />
                                    )}
                                </div>
                                {w.status === "live" && (
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-bold">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{" "}
                                        LIVE
                                    </div>
                                )}
                                <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 text-[10px] text-white">
                                    <Clock className="w-3 h-3" /> {w.durationMinutes || 60}m
                                </div>
                            </div>
                            <CardContent className="p-5">
                                <h3 className="text-base font-bold text-white line-clamp-1">
                                    {w.title}
                                </h3>
                                {w.presenterName && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                        by {w.presenterName}
                                    </p>
                                )}
                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" />
                                        {w.scheduledAt
                                            ? format(new Date(w.scheduledAt), "MMM d, h:mm a")
                                            : "TBA"}
                                    </span>
                                    <Link href="/login">
                                        <Button
                                            size="sm"
                                            className="h-7 text-[11px] font-semibold"
                                            style={{ background: GOLD, color: "#000" }}
                                        >
                                            Register
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
