import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import DashboardPreview from "@/pages/DashboardPreview";
import AdminVideoMarketing from "@/pages/admin/AdminVideoMarketing";
import ClientVideoMarketing from "@/pages/client/VideoMarketing";
import AdminEverydayRead from "@/pages/admin/AdminEverydayRead";
import CookieBanner from "@/components/CookieBanner";

const queryClient = new QueryClient();

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <QueryClientProvider client={queryClient}>
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
                    <Route path="/admin/*" component={Redirect} href="/admin/video-marketing" />
                    <Route>
                        <div className="flex items-center justify-center min-h-screen">
                            <h1 className="text-2xl text-white">Page not found</h1>
                        </div>
                    </Route>
                </Switch>
            </div>
        </QueryClientProvider>
    );
}

export default App;

