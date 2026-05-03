import { Link } from "wouter";
import { MonitorPlay } from "lucide-react";

const GOLD = "#d4b461";

export default function PublicFooter() {
    return (
        <footer
            className="border-t py-10"
            style={{
                borderColor: "rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.4)",
            }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8 grid md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                                background: `${GOLD}18`,
                                border: `1px solid ${GOLD}30`,
                            }}
                        >
                            <MonitorPlay className="w-4 h-4" style={{ color: GOLD }} />
                        </div>
                        <span className="text-white font-bold">Oravini Video Marketing</span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500 max-w-sm leading-relaxed">
                        All-in-one video marketing platform — webinars, landing pages,
                        analytics, and CRM. Built for creators and coaches who want to scale.
                    </p>
                </div>
                <div>
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
                        Product
                    </div>
                    <ul className="space-y-2 text-xs text-zinc-400">
                        <li>
                            <a href="#features" className="hover:text-white">
                                Features
                            </a>
                        </li>
                        <li>
                            <a href="#webinars" className="hover:text-white">
                                Webinars
                            </a>
                        </li>
                        <li>
                            <a href="#analytics" className="hover:text-white">
                                Analytics
                            </a>
                        </li>
                        <li>
                            <a href="#pricing" className="hover:text-white">
                                Pricing
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
                        Account
                    </div>
                    <ul className="space-y-2 text-xs text-zinc-400">
                        <li>
                            <Link href="/login" className="hover:text-white">
                                Sign in
                            </Link>
                        </li>
                        <li>
                            <Link href="/login" className="hover:text-white">
                                Create account
                            </Link>
                        </li>
                        <li>
                            <Link href="/" className="hover:text-white">
                                Home
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div
                className="max-w-7xl mx-auto px-5 lg:px-8 mt-8 pt-6 border-t text-[11px] text-zinc-600 flex items-center justify-between flex-wrap gap-2"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
                <span>© {new Date().getFullYear()} Oravini. All rights reserved.</span>
                <span>Crafted with care for creators.</span>
            </div>
        </footer>
    );
}
