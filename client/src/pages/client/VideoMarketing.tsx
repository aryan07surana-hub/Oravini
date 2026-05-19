import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import PlatformView from "@/components/video-marketing/PlatformView";
import TierGate, { hasVideoMarketingAccess } from "@/components/video-marketing/TierGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

    // Admins always have full access
    const isAdmin = (user as any).role === "admin";

    if (!isAdmin && !hasVideoMarketingAccess(user.plan, (user as any).hasVideoMarketing)) {
        return <TierGate currentPlan={user.plan} userName={user.name} hasVideoMarketing={(user as any).hasVideoMarketing} />;
    }

    return <ErrorBoundary><PlatformView /></ErrorBoundary>;
}
