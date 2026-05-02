import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import PlatformView from "@/components/video-marketing/PlatformView";

export default function VideoMarketing() {
    const { user, isLoading } = useAuth();
    const [, nav] = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: "#0a0910" }}>
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (!user) {
        nav("/login?redirect=/video-marketing");
        return null;
    }

    return <PlatformView />;
}
