import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import ClientDashboard from "@/pages/client/Dashboard";
import ClientDocuments from "@/pages/client/Documents";
import ClientChat from "@/pages/client/Chat";
import ClientProgress from "@/pages/client/Progress";
import ClientCalls from "@/pages/client/Calls";
import { ContentTrackingIndex, InstagramTracking, YouTubeTracking } from "@/pages/client/TrackingPages";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClients from "@/pages/admin/Clients";
import AdminClientDetail from "@/pages/admin/ClientDetail";
import AdminChat from "@/pages/admin/Chat";
import AdminDocuments from "@/pages/admin/Documents";
import AdminSettings from "@/pages/admin/Settings";
import AdminTracking from "@/pages/admin/Tracking";

function ProtectedRoute({ component: Component, adminOnly = false, ...props }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/dashboard" />;
  if (!adminOnly && user.role === "admin") return <Redirect to="/admin" />;

  return <Component {...props} />;
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (user.role === "admin") return <Redirect to="/admin" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={ClientDashboard} />}
      </Route>
      <Route path="/documents">
        {() => <ProtectedRoute component={ClientDocuments} />}
      </Route>
      <Route path="/chat">
        {() => <ProtectedRoute component={ClientChat} />}
      </Route>
      <Route path="/progress">
        {() => <ProtectedRoute component={ClientProgress} />}
      </Route>
      <Route path="/calls">
        {() => <ProtectedRoute component={ClientCalls} />}
      </Route>
      <Route path="/tracking/content/instagram">
        {() => <ProtectedRoute component={InstagramTracking} />}
      </Route>
      <Route path="/tracking/content/youtube">
        {() => <ProtectedRoute component={YouTubeTracking} />}
      </Route>
      <Route path="/tracking/content">
        {() => <ProtectedRoute component={ContentTrackingIndex} />}
      </Route>
      <Route path="/tracking">
        {() => <ProtectedRoute component={ContentTrackingIndex} />}
      </Route>
      <Route path="/content-tracking">
        {() => <ProtectedRoute component={ContentTrackingIndex} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} adminOnly />}
      </Route>
      <Route path="/admin/clients">
        {() => <ProtectedRoute component={AdminClients} adminOnly />}
      </Route>
      <Route path="/admin/clients/:id">
        {(params) => <ProtectedRoute component={AdminClientDetail} adminOnly id={params.id} />}
      </Route>
      <Route path="/admin/chat">
        {() => <ProtectedRoute component={AdminChat} adminOnly />}
      </Route>
      <Route path="/admin/documents">
        {() => <ProtectedRoute component={AdminDocuments} adminOnly />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={AdminSettings} adminOnly />}
      </Route>
      <Route path="/admin/tracking">
        {() => <ProtectedRoute component={AdminTracking} adminOnly />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
