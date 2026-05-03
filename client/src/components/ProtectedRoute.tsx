import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

interface ProtectedRouteProps {
    component: React.ComponentType<any>;
    adminOnly?: boolean;
}

export default function ProtectedRoute({ component: Component, adminOnly }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0910]">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (!user) return <Redirect to="/login" />;

    if (adminOnly && (user as any).role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-white text-lg">Admin access required.</p>
            </div>
        );
    }

    return <Component />;
}
