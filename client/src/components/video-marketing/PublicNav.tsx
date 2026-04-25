import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const GOLD = "#d4b461";

export default function PublicNav() {
    return (
        <header
            className="sticky top-0 z-50 backdrop-blur-xl"
            style={{
                background: "rgba(10,10,15,0.7)",
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
                        <span className="text-sm font-black tracking-[0.18em] uppercase text-white">
                            ORAVINI
                        </span>
                    </div>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#webinars" className="hover:text-white transition-colors">Webinars</a>
                    <a href="#analytics" className="hover:text-white transition-colors">Analytics</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                </nav>
                <div className="flex items-center gap-2">
                    <Link href="/login">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            Sign in
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button
                            size="sm"
                            style={{ background: GOLD, color: "#000" }}
                            className="font-semibold"
                        >
                            Get Started
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
