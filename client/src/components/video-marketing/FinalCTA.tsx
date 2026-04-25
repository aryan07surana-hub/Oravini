import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const GOLD = "#d4b461";

export default function FinalCTA() {
    return (
        <section
            className="relative py-24 lg:py-32 overflow-hidden border-t"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl opacity-15"
                    style={{
                        background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
                    }}
                />
            </div>
            <div className="relative max-w-4xl mx-auto px-5 lg:px-8 text-center">
                <Sparkles
                    className="w-8 h-8 mx-auto mb-6"
                    style={{ color: GOLD }}
                />
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                    Ready to host your<br />
                    <span style={{ color: GOLD }}>first converting webinar?</span>
                </h2>
                <p className="mt-6 text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
                    Join thousands of creators and coaches using Oravini to scale their
                    business through live video.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/login">
                        <Button
                            size="lg"
                            className="px-10 font-semibold text-base"
                            style={{ background: GOLD, color: "#000" }}
                        >
                            Login to Access Platform
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button
                            size="lg"
                            variant="outline"
                            className="px-10 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900"
                        >
                            Create Free Account
                        </Button>
                    </Link>
                </div>
                <p className="mt-6 text-[11px] text-zinc-600">
                    Free forever plan available · No credit card required · Upgrade
                    anytime
                </p>
            </div>
        </section>
    );
}
