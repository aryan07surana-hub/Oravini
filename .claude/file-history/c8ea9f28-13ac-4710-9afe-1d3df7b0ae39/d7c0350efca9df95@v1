import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Crown, Zap, Sparkles } from "lucide-react";

const GOLD = "#d4b461";

export default function PricingCTA() {
    const plans = [
        {
            name: "Starter",
            price: "Free",
            sub: "forever",
            icon: Zap,
            features: [
                "Up to 25 attendees / webinar",
                "3 landing pages",
                "Basic analytics",
                "Email support",
            ],
            cta: "Get Started",
            highlight: false,
        },
        {
            name: "Pro",
            price: "$49",
            sub: "per month",
            icon: Sparkles,
            features: [
                "Up to 500 attendees / webinar",
                "Unlimited landing pages",
                "Advanced analytics",
                "HD recordings",
                "Email automation",
                "Priority support",
            ],
            cta: "Start 14-Day Trial",
            highlight: true,
        },
        {
            name: "Elite",
            price: "$149",
            sub: "per month",
            icon: Crown,
            features: [
                "Up to 5,000 attendees / webinar",
                "Contacts CRM",
                "Custom domains",
                "White-label branding",
                "API access",
                "Dedicated success manager",
            ],
            cta: "Go Elite",
            highlight: false,
        },
    ];
    return (
        <section
            id="pricing"
            className="py-20 lg:py-28 border-t"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8">
                <div className="text-center mb-14">
                    <Badge
                        className="mb-4 border-0"
                        style={{ background: `${GOLD}18`, color: GOLD }}
                    >
                        <Crown className="w-3 h-3 mr-1.5" /> Simple pricing
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-black text-white">
                        Start free. Scale when ready.
                    </h2>
                    <p className="mt-4 text-sm md:text-base text-zinc-400">
                        No hidden fees. Cancel anytime.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {plans.map((p) => (
                        <Card
                            key={p.name}
                            className={`relative bg-zinc-900/40 border transition-all ${p.highlight
                                    ? "border-transparent"
                                    : "border-zinc-800 hover:border-zinc-600"
                                }`}
                            style={
                                p.highlight
                                    ? {
                                        background:
                                            "linear-gradient(180deg, rgba(212,180,97,0.08), rgba(18,14,30,0.6))",
                                        border: `1px solid ${GOLD}40`,
                                        boxShadow: `0 0 40px ${GOLD}15`,
                                    }
                                    : undefined
                            }
                        >
                            {p.highlight && (
                                <div
                                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold"
                                    style={{ background: GOLD, color: "#000" }}
                                >
                                    MOST POPULAR
                                </div>
                            )}
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: `${GOLD}18`,
                                            border: `1px solid ${GOLD}30`,
                                        }}
                                    >
                                        <p.icon className="w-5 h-5" style={{ color: GOLD }} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                                </div>
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-4xl font-black text-white">
                                        {p.price}
                                    </span>
                                    <span className="text-xs text-zinc-500">{p.sub}</span>
                                </div>
                                <ul className="mt-5 space-y-2.5 text-xs text-zinc-300">
                                    {p.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2">
                                            <Check
                                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                            />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/login">
                                    <Button
                                        className="w-full mt-6 font-semibold"
                                        style={
                                            p.highlight
                                                ? { background: GOLD, color: "#000" }
                                                : {
                                                    background: "rgba(255,255,255,0.04)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    color: "#fff",
                                                }
                                        }
                                    >
                                        {p.cta} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
