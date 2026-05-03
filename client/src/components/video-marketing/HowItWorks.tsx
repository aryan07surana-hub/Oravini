import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Target, Mic2, PieChart, Layers } from "lucide-react";

const GOLD = "#d4b461";

export default function HowItWorks() {
    const steps = [
        {
            n: "01",
            icon: Rocket,
            title: "Create your webinar",
            desc: "Set title, date, and presenter. We generate a beautiful landing page automatically.",
        },
        {
            n: "02",
            icon: Target,
            title: "Share & capture leads",
            desc: "Send your unique link. Every registration is captured into your CRM.",
        },
        {
            n: "03",
            icon: Mic2,
            title: "Go live & engage",
            desc: "HD streaming with chat, polls, Q&A, and screen share — all browser-based.",
        },
        {
            n: "04",
            icon: PieChart,
            title: "Convert & analyze",
            desc: "Replays published automatically. Track engagement & convert leads to buyers.",
        },
    ];
    return (
        <section
            className="py-20 lg:py-28 border-t"
            style={{
                borderColor: "rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
            }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8">
                <div className="text-center mb-14">
                    <Badge
                        className="mb-4 border-0"
                        style={{ background: `${GOLD}18`, color: GOLD }}
                    >
                        <Layers className="w-3 h-3 mr-1.5" /> How it works
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-black text-white">
                        From idea to impact in 4 steps
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {steps.map((s) => (
                        <Card key={s.n} className="bg-zinc-900/40 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: `${GOLD}18`,
                                            border: `1px solid ${GOLD}30`,
                                        }}
                                    >
                                        <s.icon className="w-5 h-5" style={{ color: GOLD }} />
                                    </div>
                                    <span className="text-xs font-black text-zinc-600 tracking-widest">
                                        {s.n}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-white">{s.title}</h3>
                                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                                    {s.desc}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
