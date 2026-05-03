import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import PlatformView from "@/components/video-marketing/PlatformView";
import TierGate, { isTier4Or5 } from "@/components/video-marketing/TierGate";

const GOLD = "#d4b461";

export default function VideoMarketing() {
    const { user, isLoading } = useAuth();
    const [, nav] = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (!user) {
        nav("/login?redirect=/video-marketing");
        return null;
    }

    if (!isTier4Or5(user.plan)) {
        return <TierGate currentPlan={user.plan} userName={user.name} />;
    }

    return <PlatformView />;
}
