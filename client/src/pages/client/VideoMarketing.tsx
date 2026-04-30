import { useAuth } from "@/hooks/use-auth";
import TierGate, { isTier4Or5 } from "@/components/video-marketing/TierGate";
import PlatformView from "@/components/video-marketing/PlatformView";

export default function VideoMarketing() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: "#0a0910" }}>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (!user) return null;

    if (!isTier4Or5((user as any).plan)) {
        return <TierGate currentPlan={(user as any).plan} userName={(user as any).name} />;
    }

    return <PlatformView />;
}
