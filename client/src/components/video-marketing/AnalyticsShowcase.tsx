import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Eye, TrendingUp, Clock, Star, BarChart3, ArrowRight, Check,
} from "lucide-react";

const GOLD = "#d4b461";

export default function AnalyticsShowcase() {
    const metrics = [
        { icon: Eye, label: "Live Views", value: "2.4K", color: "#60a5fa" },
        { icon: TrendingUp, label: "Engagement", value: "87%", color: "#34d399" },
        { icon: Clock, label: "Avg Watch", value: "42m", color: GOLD },
        { icon: Star, label: "Rating", value: "4.9", color: "#f472b6" },
    ];
    const bullets = [
        "Heat-map engagement timeline per viewer",
        "Funnel conversion from landing to purchase",
        "A/B test headlines, thumbnails & CTAs",
        "Export CSV, integrate with your favorite tools",
    ];
    return (
        <section
            id="analytics"
            className="py-20 lg:py-28 border-t"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <Badge
                        className="mb-4 border-0"
                        style={{ background: `${GOLD}18`, color: GOLD }}
                    >
                        <BarChart3 className="w-3 h-3 mr-1.5" /> Real-time insights
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-black text-white">
                        Know exactly what's working
                    </h2>
                    <p className="mt-4 text-sm md:text-base text-zinc-400 leading-relaxed">
                        Track every view, every click, every drop-off. Our analytics
                        dashboard shows you the data that matters — so you can double down
                        on what converts.
                    </p>
                    <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                        {bullets.map((t) => (
                            <li key={t} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                <span>{t}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/login">
                        <Button
                            className="mt-6 font-semibold"
                            style={{ background: GOLD, color: "#000" }}
                        >
                            Try Analytics <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
                <div className="relative">
                    <div
                        className="absolute inset-0 rounded-3xl blur-3xl opacity-20 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle, ${GOLD}60, transparent 70%)`,
                        }}
                    />
                    <Card className="relative bg-zinc-900/60 border-zinc-800 backdrop-blur-xl">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {metrics.map((m) => (
                                    <div
                                        key={m.label}
                                        className="rounded-xl p-4"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <m.icon className="w-4 h-4 mb-2" style={{ color: m.color }} />
                                        <div className="text-xl font-black text-white">{m.value}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                                            {m.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div
                                className="rounded-xl p-4"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-white">
                                        Views Over Time
                                    </span>
                                    <Badge
                                        className="text-[9px] h-4 border-0"
                                        style={{ background: `${GOLD}20`, color: GOLD }}
                                    >
                                        +24%
                                    </Badge>
                                </div>
                                <div className="flex items-end gap-1.5 h-20">
                                    {[40, 65, 52, 78, 90, 72, 95, 88, 100, 82, 91, 100].map(
                                        (h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t"
                                                style={{
                                                    height: `${h}%`,
                                                    background: `linear-gradient(180deg, ${GOLD}, ${GOLD}40)`,
                                                }}
                                            />
                                        ),
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
