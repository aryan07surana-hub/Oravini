import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import DashboardPreview from "@/pages/DashboardPreview";
import AdminVideoMarketing from "@/pages/admin/AdminVideoMarketing";
import ClientVideoMarketing from "@/pages/client/VideoMarketing";
import AdminEverydayRead from "@/pages/admin/AdminEverydayRead";
import CookieBanner from "@/components/CookieBanner";

export default function App() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0910]">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <CookieBanner />
            <Switch>
                <Route path="/" component={Landing} />
                <Route path="/login" component={Login} />
                <Route path="/preview" component={DashboardPreview} />
                <Route path="/video-marketing">
                    {() => <ProtectedRoute component={ClientVideoMarketing} />}
                </Route>
                <Route path="/admin/video-marketing">
                    {() => <ProtectedRoute component={AdminVideoMarketing} adminOnly />}
                </Route>
                <Route path="/admin/everyday-read">
                    {() => <ProtectedRoute component={AdminEverydayRead} adminOnly />}
                </Route>
                <Route path="/admin/*">
                    {() => <Redirect to="/admin/video-marketing" />}
                </Route>
                <Route>
                    <div className="flex items-center justify-center min-h-screen">
                        <h1 className="text-2xl text-white">Page not found</h1>
                    </div>
                </Route>
            </Switch>
        </div>
    );
}
