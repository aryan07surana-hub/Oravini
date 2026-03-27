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
import { TrackingHome, ContentTrackingIndex, InstagramTracking, YouTubeTracking } from "@/pages/client/TrackingPages";
import ContentCalendar from "@/pages/client/ContentCalendar";
import AIIdeas from "@/pages/client/AIIdeas";
import CarouselStudio from "@/pages/client/CarouselStudio";
import AIDesign from "@/pages/client/AIDesign";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClients from "@/pages/admin/Clients";
import AdminClientDetail from "@/pages/admin/ClientDetail";
import AdminChat from "@/pages/admin/Chat";
import AdminDocuments from "@/pages/admin/Documents";
import AdminSettings from "@/pages/admin/Settings";
import AdminTracking from "@/pages/admin/Tracking";
import AdminCalendar from "@/pages/admin/AdminCalendar";
import AdminAIIdeas from "@/pages/admin/AdminAIIdeas";
import AdminCourseModules from "@/pages/admin/CourseModules";
import CompetitorStudy from "@/pages/client/CompetitorStudy";
import AIContentCoach from "@/pages/client/AIContentCoach";
import DMTracker from "@/pages/client/DMTracker";
import AIVideoEditor from "@/pages/client/AIVideoEditor";
import TwitterScheduler from "@/pages/client/TwitterScheduler";
import LinkedInScheduler from "@/pages/client/LinkedInScheduler";
import YouTubeScheduler from "@/pages/client/YouTubeScheduler";
import Sessions from "@/pages/client/Sessions";
import AdminSessions from "@/pages/admin/AdminSessions";
import Credits from "@/pages/client/Credits";
import AdminCredits from "@/pages/admin/AdminCredits";
import AdminCRM from "@/pages/admin/AdminCRM";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Landing from "@/pages/Landing";
import Apply from "@/pages/Apply";
import Audit from "@/pages/Audit";
import PlanSettings from "@/pages/client/PlanSettings";
import LeadMagnetGenerator from "@/pages/client/LeadMagnetGenerator";

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
  // Block clients who haven't selected a plan yet
  if (user.role !== "admin" && !user.planConfirmed) return <Redirect to="/" />;

  return <Component {...props} />;
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Landing />;
  if (user.role === "admin") return <Redirect to="/admin" />;
  // Client logged in but hasn't chosen a plan yet — show landing so they can pick one
  if (!user.planConfirmed) return <Landing />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/apply" component={Apply} />
      <Route path="/audit" component={Audit} />
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
      <Route path="/ai-ideas">
        {() => <ProtectedRoute component={AIIdeas} />}
      </Route>
      <Route path="/carousel-studio">
        {() => <ProtectedRoute component={CarouselStudio} />}
      </Route>
      <Route path="/ai-design">
        {() => <ProtectedRoute component={AIDesign} />}
      </Route>
      <Route path="/lead-magnet">
        {() => <ProtectedRoute component={LeadMagnetGenerator} />}
      </Route>
      <Route path="/ai-coach">
        {() => <ProtectedRoute component={AIContentCoach} />}
      </Route>
      <Route path="/tracking/content/instagram">
        {() => <ProtectedRoute component={InstagramTracking} />}
      </Route>
      <Route path="/tracking/content/youtube">
        {() => <ProtectedRoute component={YouTubeTracking} />}
      </Route>
      <Route path="/tracking/content/calendar">
        {() => <ProtectedRoute component={ContentCalendar} />}
      </Route>
      <Route path="/tracking/content">
        {() => <ProtectedRoute component={ContentTrackingIndex} />}
      </Route>
      <Route path="/tracking/competitor">
        {() => <ProtectedRoute component={CompetitorStudy} />}
      </Route>
      <Route path="/dm-tracker">
        {() => <ProtectedRoute component={DMTracker} />}
      </Route>
      <Route path="/video-editor">
        {() => <ProtectedRoute component={AIVideoEditor} />}
      </Route>
      <Route path="/sessions">
        {() => <ProtectedRoute component={Sessions} />}
      </Route>
      <Route path="/twitter-scheduler">
        {() => <ProtectedRoute component={TwitterScheduler} />}
      </Route>
      <Route path="/linkedin-scheduler">
        {() => <ProtectedRoute component={LinkedInScheduler} />}
      </Route>
      <Route path="/youtube-scheduler">
        {() => <ProtectedRoute component={YouTubeScheduler} />}
      </Route>
      <Route path="/credits">
        {() => <ProtectedRoute component={Credits} />}
      </Route>
      <Route path="/settings/plan">
        {() => <ProtectedRoute component={PlanSettings} />}
      </Route>
      <Route path="/tracking">
        {() => <ProtectedRoute component={TrackingHome} />}
      </Route>
      <Route path="/content-tracking">
        {() => <ProtectedRoute component={TrackingHome} />}
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
      <Route path="/admin/competitor-study">
        {() => <ProtectedRoute component={CompetitorStudy} adminOnly useAdmin={true} />}
      </Route>
      <Route path="/admin/dm-tracker">
        {() => <ProtectedRoute component={DMTracker} adminOnly useAdmin={true} />}
      </Route>
      <Route path="/admin/calendar">
        {() => <ProtectedRoute component={AdminCalendar} adminOnly />}
      </Route>
      <Route path="/admin/ai-ideas">
        {() => <ProtectedRoute component={AdminAIIdeas} adminOnly />}
      </Route>
      <Route path="/admin/course-modules">
        {() => <ProtectedRoute component={AdminCourseModules} adminOnly />}
      </Route>
      <Route path="/admin/video-editor">
        {() => <ProtectedRoute component={AIVideoEditor} adminOnly useAdmin={true} />}
      </Route>
      <Route path="/admin/sessions">
        {() => <ProtectedRoute component={AdminSessions} adminOnly />}
      </Route>
      <Route path="/admin/credits">
        {() => <ProtectedRoute component={AdminCredits} adminOnly />}
      </Route>
      <Route path="/admin/crm">
        {() => <ProtectedRoute component={AdminCRM} adminOnly />}
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
