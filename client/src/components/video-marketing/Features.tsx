import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    MonitorPlay, Video, Globe, BarChart3, Users, Film, Mail, Shield, Rocket,
} from "lucide-react";

const GOLD = "#d4b461";

export default function Features() {
    const features = [
        {
            icon: MonitorPlay,
            color: "#60a5fa",
            title: "Live Webinars",
            desc: "HD streaming, real-time chat, screen sharing & interactive Q&A.",
        },
        {
            icon: Video,
            color: GOLD,
            title: "Video Library",
            desc: "Upload, host & stream unlimited videos with adaptive quality.",
        },
        {
            icon: Globe,
            color: "#34d399",
            title: "Landing Pages",
            desc: "High-converting registration pages with drag-and-drop builder.",
        },
        {
            icon: BarChart3,
            color: "#a78bfa",
            title: "Advanced Analytics",
            desc: "Watch time, engagement heat-maps, and funnel conversion tracking.",
        },
        {
            icon: Users,
            color: "#f472b6",
            title: "Contacts CRM",
            desc: "Auto-capture leads from webinars; tag, segment & export.",
        },
        {
            icon: Film,
            color: "#fb923c",
            title: "Auto Recordings",
            desc: "Every live session recorded & published as on-demand replay.",
        },
        {
            icon: Mail,
            color: "#22d3ee",
            title: "Email Automation",
            desc: "Reminder sequences, follow-ups & replay delivery — all automated.",
        },
        {
            icon: Shield,
            color: "#84cc16",
            title: "Custom Domains",
            desc: "Host webinars on your own branded domain with SSL included.",
        },
    ];
    return (
        <section id="features" className="py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-5 lg:px-8">
                <div className="text-center mb-14">
                    <Badge
                        className="mb-4 border-0"
                        style={{ background: `${GOLD}18`, color: GOLD }}
                    >
                        <Rocket className="w-3 h-3 mr-1.5" /> Everything you need
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-black text-white">
                        One platform, infinite reach
                    </h2>
                    <p className="mt-4 text-sm md:text-base text-zinc-400 max-w-2xl mx-auto">
                        From first touch to paying customer — every tool you need to run a
                        world-class video marketing engine.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((f) => (
                        <Card
                            key={f.title}
                            className="group bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 transition-all"
                        >
                            <CardContent className="p-5">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                                    style={{
                                        background: `${f.color}15`,
                                        border: `1px solid ${f.color}30`,
                                    }}
                                >
                                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                                </div>
                                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                                    {f.desc}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
