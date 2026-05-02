import { useAuth } from "@/hooks/use-auth";
import { isTier4Or5 } from "@/components/video-marketing/TierGate";
import PlatformView from "@/components/video-marketing/PlatformView";
import VideoMarketingLanding from "@/pages/VideoMarketingLanding";

export default function VideoMarketing() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: "#0a0910" }}>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
            </div>
        );
    }

    // Show landing page if not logged in or not tier 4/5
    if (!user || !isTier4Or5((user as any).plan)) {
        return <VideoMarketingLanding />;
    }

    // Show platform for tier 4/5 users
    return <PlatformView />;
}
