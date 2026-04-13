import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { CustomCursor, GlobalBackground } from "@/components/GlobalUI";
import { JarvisProvider } from "@/contexts/JarvisContext";
import { TourProvider } from "@/components/ui/TourGuide";
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
import OraviniLanding from "@/pages/OraviniLanding";
import Brandverse from "@/pages/Brandverse";
import SelectPlan from "@/pages/SelectPlan";
import Apply from "@/pages/Apply";
import Audit from "@/pages/Audit";
import PlanSettings from "@/pages/client/PlanSettings";
import LeadMagnetGenerator from "@/pages/client/LeadMagnetGenerator";
import InstagramStoryGenerator from "@/pages/client/InstagramStoryGenerator";
import BrandKitBuilder from "@/pages/client/BrandKitBuilder";
import ICPBuilder from "@/pages/client/ICPBuilder";
import SOPGenerator from "@/pages/client/SOPGenerator";
import AudiencePsychologyMap from "@/pages/client/AudiencePsychologyMap";
import AIContentPlanner from "@/pages/client/AIContentPlanner";
import DashboardPreview from "@/pages/DashboardPreview";
import ContentAnalyser from "@/pages/client/ContentAnalyser";
import ContentAnalyserYouTube from "@/pages/client/ContentAnalyserYouTube";
import ContentAnalyserInstagram from "@/pages/client/ContentAnalyserInstagram";
import FormsHub from "@/pages/client/FormsHub";
import FormBuilder from "@/pages/client/FormBuilder";
import FormResponses from "@/pages/client/FormResponses";
import PublicForm from "@/pages/PublicForm";

const GOLD = "#d4b461";

function JarvisComingSoon() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: `radial-gradient(circle at 40% 35%, #fff7 0%, transparent 60%), radial-gradient(circle at 60% 70%, ${GOLD}55 0%, transparent 70%), linear-gradient(135deg, ${GOLD}cc, #a8892d)`, margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 32px ${GOLD}55, 0 0 64px ${GOLD}22` }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={GOLD} strokeWidth="1.5" opacity="0.4"/>
            <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" fill={GOLD}/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          </svg>
        </div>
        <div style={{ display: "inline-block", background: `${GOLD}18`, border: `1px solid ${GOLD}44`, borderRadius: 20, padding: "4px 14px", marginBottom: 18 }}>
          <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Coming Soon</span>
        </div>
        <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5 }}>Jarvis AI</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.7, margin: "0 0 32px" }}>
          Your personal voice-powered AI assistant is on its way. Jarvis will help you create content, analyse your brand, and navigate the platform — all hands-free.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {["Voice Commands", "Brand Analysis", "Content Creation", "Real-time Insights"].map(tag => (
            <span key={tag} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  if (user.role !== "admin" && !user.planConfirmed) return <Redirect to="/select-plan" />;

  return <Component {...props} />;
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <OraviniLanding />;
  if (user.role === "admin") return <Redirect to="/admin" />;
  // Client logged in but hasn't chosen a plan yet — send to plan selection
  if (!user.planConfirmed) return <Redirect to="/select-plan" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/oravini" component={OraviniLanding} />
      <Route path="/brandverse" component={Brandverse} />
      <Route path="/select-plan" component={SelectPlan} />
      <Route path="/login" component={Login} />
      <Route path="/register">{() => { window.location.replace("/login?tab=register"); return null; }}</Route>
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/apply" component={Apply} />
      <Route path="/audit" component={Audit} />
      <Route path="/preview" component={DashboardPreview} />
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
      <Route path="/story-generator">
        {() => <ProtectedRoute component={InstagramStoryGenerator} />}
      </Route>
      <Route path="/brand-kit-builder">
        {() => <ProtectedRoute component={BrandKitBuilder} />}
      </Route>
      <Route path="/icp-builder">
        {() => <ProtectedRoute component={ICPBuilder} />}
      </Route>
      <Route path="/audience-psychology-map">
        {() => <ProtectedRoute component={AudiencePsychologyMap} />}
      </Route>
      <Route path="/sop-generator">
        {() => <ProtectedRoute component={SOPGenerator} />}
      </Route>
      <Route path="/ai-content-planner">
        {() => <ProtectedRoute component={AIContentPlanner} />}
      </Route>
      <Route path="/ai-coach">
        {() => <ProtectedRoute component={AIContentCoach} />}
      </Route>
      <Route path="/jarvis">
        {() => <ProtectedRoute component={JarvisComingSoon} />}
      </Route>
      <Route path="/content-analyser/youtube">
        {() => <ProtectedRoute component={ContentAnalyserYouTube} />}
      </Route>
      <Route path="/content-analyser/instagram">
        {() => <ProtectedRoute component={ContentAnalyserInstagram} />}
      </Route>
      <Route path="/content-analyser">
        {() => <ProtectedRoute component={ContentAnalyser} />}
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
      <Route path="/tools/forms/:id/responses">
        {(params) => <ProtectedRoute component={FormResponses} id={params.id} />}
      </Route>
      <Route path="/tools/forms/:id">
        {(params) => <ProtectedRoute component={FormBuilder} id={params.id} />}
      </Route>
      <Route path="/tools/forms">
        {() => <ProtectedRoute component={FormsHub} />}
      </Route>
      <Route path="/f/:slug">
        {(params) => <PublicForm />}
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
        <JarvisProvider>
          <TourProvider>
            <Toaster />
            <GlobalBackground />
            <CustomCursor />
            <Router />
          </TourProvider>
        </JarvisProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
