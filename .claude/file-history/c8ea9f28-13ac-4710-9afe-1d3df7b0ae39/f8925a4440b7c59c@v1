import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Play, Check } from "lucide-react";

const GOLD = "#d4b461";

export default function Hero() {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-20"
                    style={{
                        background: `radial-gradient(circle, ${GOLD}40 0%, transparent 70%)`,
                    }}
                />
            </div>
            <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-28 text-center">
                <Badge
                    className="mb-6 border-0"
                    style={{
                        background: `${GOLD}18`,
                        color: GOLD,
                        border: `1px solid ${GOLD}30`,
                    }}
                >
                    <Sparkles className="w-3 h-3 mr-1.5" /> Video Marketing Platform
                </Badge>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white">
                    Host webinars that
                    <br />
                    <span style={{ color: GOLD }}>actually convert</span>
                </h1>
                <p className="mt-6 text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    All-in-one webinar, video, landing page & analytics suite. Turn viewers into customers with high-converting funnels, replays, and real-time engagement.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/login">
                        <Button
                            size="lg"
                            className="px-8 font-semibold"
                            style={{ background: GOLD, color: "#000" }}
                        >
                            Start Free — Login to Access
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    <a href="#features">
                        <Button
                            size="lg"
                            variant="outline"
                            className="px-8 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900"
                        >
                            <Play className="w-4 h-4 mr-2" /> See Features
                        </Button>
                    </a>
                </div>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> No credit card required
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Unlimited webinars
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> HD recordings
                    </div>
                </div>
            </div>
        </section>
    );
}
