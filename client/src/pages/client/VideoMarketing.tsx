import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import TierGate from "@/components/video-marketing/TierGate";
import PublicNav from "@/components/video-marketing/PublicNav";
// Missing components will be created: Hero, StatsStrip, Features, PlatformView

export default function VideoMarketing() {
    const { user, plan } = useAuth();
    const [, navigate] = useLocation();

    // Public landing for unauthed
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900">
                <PublicNav />
                {/* Hero, StatsStrip, Features placeholders - to be enhanced */}
                <main className="max-w-7xl mx-auto px-4 py-20">
                    <h1 className="text-5xl font-black text-white text-center mb-8">
                        Video Marketing Platform
                    </h1>
                    <p className="text-xl text-zinc-300 text-center max-w-2xl mx-auto mb-12">
                        Host webinars, upload videos, build landing pages, track analytics - all in one place.
                    </p>
                </main>
            </div>
        );
    }

    // Tier gate for low tiers
    if (!TierGate.isTier4Or5(plan)) { // Assume exported function
        return <TierGate currentPlan={plan} userName={user.name} />;
    }

    // Full platform for pro/elite
    return (
        <div className="min-h-screen bg-slate-900">
            <nav className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Video Marketing</h2>
                    <button onClick={() => navigate('/dashboard')} className="text-slate-300 hover:text-white">
                        Dashboard
                    </button>
                </div>
            </nav>
            <main className="p-6 max-w-7xl mx-auto">
                <PlatformView />
            </main>
        </div>
    );
}
