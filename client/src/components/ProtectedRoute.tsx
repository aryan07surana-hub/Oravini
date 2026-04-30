import { h } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import Login from "@/pages/Login";

interface ProtectedRouteProps {
    component: React.ComponentType;
    adminOnly?: boolean;
    path?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, adminOnly, ...rest }) => {
    const { user, loading } = useAuth();

    if (loading) return h("div", { className: "flex items-center justify-center min-h-screen" }, "Loading...");
    if (!user) return h(Redirect, { to: "/login" });

    if (adminOnly && !user.isAdmin) {
        return h("div", { className: "flex items-center justify-center min-h-screen bg-red-900/50" }, "Admin only");
    }

    return h(Component, rest);
};

export default ProtectedRoute;

