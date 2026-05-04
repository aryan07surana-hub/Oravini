import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, Crown, Check, ArrowRight } from "lucide-react";

const GOLD = "#d4b461";

// Growth with addon, Pro, or Elite can access
export function hasVideoMarketingAccess(plan: string | undefined | null, hasAddon: boolean = false): boolean {
    if (!plan) return false;
    // Pro and Elite always have access
    if (plan === "pro" || plan === "elite") return true;
    // Growth has access only if they purchased the addon
    if (plan === "growth" && hasAddon) return true;
    return false;
}

interface TierGateProps {
    currentPlan?: string;
    userName?: string;
    hasVideoMarketingAddon?: boolean;
}

export default function TierGate({ currentPlan, userName, hasVideoMarketingAddon = false }: TierGateProps) {
    const planLabel = (currentPlan || "free").replace(/^./, (c) => c.toUpperCase());
    const isGrowth = currentPlan === "growth";
    const needsAddon = isGrowth && !hasVideoMarketingAddon;

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                    "linear-gradient(180deg, #0a0910 0%, #12101a 50%, #0a0910 100%)",
                color: "#fff",
            }}
        >
            {/* Header */}
            <header
                className="sticky top-0 z-50 backdrop-blur-xl"
                style={{
                    background: "rgba(10,10,15,0.7)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
            >
                <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/dashboard">
                        <div className="flex items-center gap-2.5 cursor-pointer">
                            <img
                                src="/oravini-logo.png"
                                alt="Oravini"
                                className="w-8 h-8 rounded-lg object-cover"
                                style={{ objectPosition: "50% 32%" }}
                            />
                            <span className="text-sm font-black tracking-[0.18em] uppercase text-white">
                                ORAVINI
                            </span>
                            <span className="text-xs text-zinc-500 ml-2">
                                · Video Marketing
                            </span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Badge
                            className="border-0"
                            style={{
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.7)",
                            }}
                        >
                            Current plan: {planLabel}
                        </Badge>
                        <Link href="/dashboard">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400 hover:text-white"
                            >
                                Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Gate content */}
            <main className="max-w-4xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
                <div className="text-center">
                    <div
                        className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                        style={{
                            background: `linear-gradient(135deg, ${GOLD}33, ${GOLD}11)`,
                            border: `1px solid ${GOLD}55`,
                            boxShadow: `0 0 40px ${GOLD}22`,
                        }}
                    >
                        <Lock className="w-9 h-9" style={{ color: GOLD }} />
                    </div>

                    <Badge
                        className="mb-4 border-0"
                        style={{
                            background: `${GOLD}18`,
                            color: GOLD,
                            border: `1px solid ${GOLD}33`,
                        }}
                    >
                        <Crown className="w-3 h-3 mr-1.5" /> Pro & Elite Only
                    </Badge>

                    <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                        {userName ? `Hey ${userName.split(" ")[0]}, ` : ""}
                        {needsAddon ? (
                            <>
                                Video Marketing is an{" "}
                                <span style={{ color: GOLD }}>optional add-on</span>
                            </>
                        ) : (
                            <>
                                Video Marketing is a{" "}
                                <span style={{ color: GOLD }}>Pro & Elite</span> feature
                            </>
                        )}
                    </h1>
                    <p className="mt-5 text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        {needsAddon ? (
                            <>
                                You're on the <strong className="text-white">Growth</strong> plan.
                                Add the Video Marketing Suite for just{" "}
                                <strong style={{ color: GOLD }}>+$20/mo</strong> to unlock
                                webinars, VSLs, video hosting, and analytics.
                            </>
                        ) : (
                            <>
                                Hosting webinars, uploading videos, building landing pages, and
                                accessing the full video marketing analytics suite is reserved for
                                our <strong className="text-white">Pro</strong> and{" "}
                                <strong className="text-white">Elite</strong> members.
                            </>
                        )}
                    </p>

                    {/* Feature bullets */}
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                        {[
                            "Host unlimited live webinars",
                            "Upload & host videos with analytics",
                            "High-converting landing pages",
                            "Automated email follow-ups",
                            "Built-in CRM for webinar leads",
                            "Real-time engagement tracking",
                        ].map((f) => (
                            <div
                                key={f}
                                className="flex items-center gap-3 p-3 rounded-lg"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${GOLD}22` }}
                                >
                                    <Check
                                        className="w-3.5 h-3.5"
                                        style={{ color: GOLD }}
                                    />
                                </div>
                                <span className="text-sm text-zinc-300">{f}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                        {needsAddon ? (
                            <>
                                <Link href="/select-plan?addon=video">
                                    <Button
                                        size="lg"
                                        className="px-8 font-semibold"
                                        style={{ background: GOLD, color: "#000" }}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Add Video Marketing (+$20/mo)
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <Link href="/select-plan">
                                <Button
                                    size="lg"
                                    className="px-8 font-semibold"
                                    style={{ background: GOLD, color: "#000" }}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Upgrade to Pro or Elite
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        )}
                        <Link href="/dashboard">
                            <Button
                                size="lg"
                                variant="outline"
                                className="px-8 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900"
                            >
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>

                    <p className="mt-6 text-xs text-zinc-500">
                        {needsAddon
                            ? "Upgrade to Pro to get Video Marketing included FREE — a $49/mo value."
                            : "Already on Pro or Elite? Contact support — this might be a provisioning delay."}
                    </p>
                </div>
            </main>
        </div>
    );
}
