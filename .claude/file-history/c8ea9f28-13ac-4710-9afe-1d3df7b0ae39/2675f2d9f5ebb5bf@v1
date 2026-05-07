import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const GOLD = "#d4b461";

export default function PublicNav() {
    return (
        <nav
            className="sticky top-0 z-50 backdrop-blur-xl"
            style={{
                background: "rgba(10,9,16,0.75)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/">
                    <div className="flex items-center gap-2.5 cursor-pointer">
                        <img
                            src="/oravini-logo.png"
                            alt="Oravini"
                            className="w-8 h-8 rounded-lg object-cover"
                            style={{ objectPosition: "50% 32%" }}
                        />
                        <span
                            className="text-sm font-black tracking-[0.18em] uppercase"
                            style={{ color: GOLD }}
                        >
                            ORAVINI
                        </span>
                    </div>
                </Link>
                <Link href="/login">
                    <Button
                        size="sm"
                        className="font-semibold gap-1.5"
                        style={{ background: GOLD, color: "#000" }}
                    >
                        Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </Link>
            </div>
        </nav>
    );
}
