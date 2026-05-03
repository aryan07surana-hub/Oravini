import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { CustomCursor, GlobalBackground } from "@/components/GlobalUI";
import { JarvisProvider } from "@/contexts/JarvisContext";
import { TourProvider } from "@/components/ui/TourGuide";
import CookieBanner from "@/components/CookieBanner";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import OraviniLanding from "@/pages/OraviniLanding";
import VideoMarketingLanding from "@/pages/VideoMarketingLanding";
import Brandverse from "@/pages/Brandverse";
import Login from "@/pages/Login";
import DashboardPreview from "@/pages/DashboardPreview";
import SelectPlan from "@/pages/SelectPlan";
import Apply from "@/pages/Apply";
import Audit from "@/pages/Audit";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Onboarding from "@/pages/Onboarding";
import VerifyPhone from "@/pages/VerifyPhone";
import PublicForm from "@/pages/PublicForm";
import PublicBooking from "@/pages/PublicBooking";

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
import CompetitorStudy from "@/pages/client/CompetitorStudy";
import AIContentCoach from "@/pages/client/AIContentCoach";
import DMTracker from "@/pages/client/DMTracker";
import DMHub from "@/pages/client/DMHub";
import AIVideoEditor from "@/pages/client/AIVideoEditor";
import TwitterScheduler from "@/pages/client/TwitterScheduler";
import LinkedInScheduler from "@/pages/client/LinkedInScheduler";
import YouTubeScheduler from "@/pages/client/YouTubeScheduler";
import Sessions from "@/pages/client/Sessions";
import Credits from "@/pages/client/Credits";
import PlanSettings from "@/pages/client/PlanSettings";
import LeadMagnetGenerator from "@/pages/client/LeadMagnetGenerator";
import InstagramStoryGenerator from "@/pages/client/InstagramStoryGenerator";
import BrandKitBuilder from "@/pages/client/BrandKitBuilder";
import ICPBuilder from "@/pages/client/ICPBuilder";
import SOPGenerator from "@/pages/client/SOPGenerator";
import AudiencePsychologyMap from "@/pages/client/AudiencePsychologyMap";
import AIContentPlanner from "@/pages/client/AIContentPlanner";
import ContentAnalyser from "@/pages/client/ContentAnalyser";
import ContentAnalyserYouTube from "@/pages/client/ContentAnalyserYouTube";
import ContentAnalyserInstagram from "@/pages/client/ContentAnalyserInstagram";
import SendDM from "@/pages/client/SendDM";
import ToolsHub from "@/pages/client/ToolsHub";
import FormsHub from "@/pages/client/FormsHub";
import FormBuilder from "@/pages/client/FormBuilder";
import BoardBuilder from "@/pages/client/BoardBuilder";
import FormResponses from "@/pages/client/FormResponses";
import MeetingsHub from "@/pages/client/MeetingsHub";
import NewMeeting from "@/pages/client/NewMeeting";
import MeetingDetail from "@/pages/client/MeetingDetail";
import VideoEditorStudio from "@/pages/client/VideoEditorStudio";
import WebinarStudio from "@/pages/client/WebinarStudio";
import WebinarAnalytics from "@/pages/client/WebinarAnalytics";
import WatchWebinar from "@/pages/public/WatchWebinar";
import PublicLandingPage from "@/pages/public/PublicLandingPage";
import ClipFinder from "@/pages/client/ClipFinder";
import IgCommentBot from "@/pages/client/IgCommentBot";
import Community from "@/pages/client/Community";
import ClientVideoMarketing from "@/pages/client/VideoMarketing";
import VideoMarketingAddon from "@/pages/client/VideoMarketingAddon";
import Jarvis from "@/pages/client/Jarvis";
import IgGrowthTracker from "@/pages/client/IgGrowthTracker";
import ViralityTester from "@/pages/client/ViralityTester";
import EverydayRead from "@/pages/client/EverydayRead";

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
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminCredits from "@/pages/admin/AdminCredits";
import AdminCRM from "@/pages/admin/AdminCRM";
import AdminEmailMarketing from "@/pages/admin/AdminEmailMarketing";
import AdminChurnAnalysis from "@/pages/admin/AdminChurnAnalysis";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminResponses from "@/pages/admin/AdminResponses";
import AdminCommunity from "@/pages/admin/AdminCommunity";
import AdminScheduling from "@/pages/admin/AdminScheduling";
import AdminVideoMarketing from "@/pages/admin/AdminVideoMarketing";
import AdminEverydayRead from "@/pages/admin/AdminEverydayRead";
import AdminDailyTracker from "@/pages/admin/AdminDailyTracker";
import AdminToolHeatmap from "@/pages/admin/AdminToolHeatmap";
import ProjectTracker from "@/pages/admin/ProjectTracker";
import AdminFeedback from "@/pages/admin/AdminFeedback";

function Guard({ component: Component, adminOnly = false, ...props }: any) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0910]">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && (user as any).role !== "admin") return <Redirect to="/dashboard" />;
  if ((user as any).role !== "admin" && !(user as any).surveyCompleted) return <Redirect to="/onboarding" />;
  if ((user as any).role !== "admin" && !user.planConfirmed) return <Redirect to="/select-plan" />;
  return <Component {...props} />;
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0910]">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
    </div>
  );
  if (!user) return <OraviniLanding />;
  if ((user as any).role === "admin") return <Redirect to="/admin" />;
  if (!(user as any).surveyCompleted) return <Redirect to="/onboarding" />;
  if (!user.planConfirmed) return <Redirect to="/select-plan" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={HomeRedirect} />
      <Route path="/oravini" component={OraviniLanding} />
      <Route path="/video-marketing-landing" component={VideoMarketingLanding} />
      <Route path="/brandverse" component={Brandverse} />
      <Route path="/login" component={Login} />
      <Route path="/register">{() => { window.location.replace("/login?tab=register"); return null; }}</Route>
      <Route path="/preview" component={DashboardPreview} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/apply" component={Apply} />
      <Route path="/audit" component={Audit} />
      <Route path="/select-plan" component={SelectPlan} />
      <Route path="/verify-phone" component={VerifyPhone} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/f/:slug">{() => <PublicForm />}</Route>
      <Route path="/book/:slug">{() => <PublicBooking />}</Route>
      <Route path="/watch/:code">{() => <WatchWebinar />}</Route>
      <Route path="/join/:code">{() => <WatchWebinar />}</Route>
      <Route path="/lp/:slug">{() => <PublicLandingPage />}</Route>

      {/* Client — protected */}
      <Route path="/dashboard">{() => <Guard component={ClientDashboard} />}</Route>
      <Route path="/documents">{() => <Guard component={ClientDocuments} />}</Route>
      <Route path="/chat">{() => <Guard component={ClientChat} />}</Route>
      <Route path="/community">{() => <Guard component={Community} />}</Route>
      <Route path="/progress">{() => <Guard component={ClientProgress} />}</Route>
      <Route path="/calls">{() => <Guard component={ClientCalls} />}</Route>
      <Route path="/ai-ideas">{() => <Guard component={AIIdeas} />}</Route>
      <Route path="/carousel-studio">{() => <Guard component={CarouselStudio} />}</Route>
      <Route path="/ai-design">{() => <Guard component={AIDesign} />}</Route>
      <Route path="/lead-magnet">{() => <Guard component={LeadMagnetGenerator} />}</Route>
      <Route path="/story-generator">{() => <Guard component={InstagramStoryGenerator} />}</Route>
      <Route path="/brand-kit-builder">{() => <Guard component={BrandKitBuilder} />}</Route>
      <Route path="/icp-builder">{() => <Guard component={ICPBuilder} />}</Route>
      <Route path="/audience-psychology-map">{() => <Guard component={AudiencePsychologyMap} />}</Route>
      <Route path="/sop-generator">{() => <Guard component={SOPGenerator} />}</Route>
      <Route path="/ai-content-planner">{() => <Guard component={AIContentPlanner} />}</Route>
      <Route path="/ai-coach">{() => <Guard component={AIContentCoach} />}</Route>
      <Route path="/jarvis">{() => <Guard component={Jarvis} />}</Route>
      <Route path="/content-analyser/youtube">{() => <Guard component={ContentAnalyserYouTube} />}</Route>
      <Route path="/content-analyser/instagram">{() => <Guard component={ContentAnalyserInstagram} />}</Route>
      <Route path="/content-analyser">{() => <Guard component={ContentAnalyser} />}</Route>
      <Route path="/tracking/content/instagram">{() => <Guard component={InstagramTracking} />}</Route>
      <Route path="/tracking/content/youtube">{() => <Guard component={YouTubeTracking} />}</Route>
      <Route path="/tracking/content/calendar">{() => <Guard component={ContentCalendar} />}</Route>
      <Route path="/tracking/content">{() => <Guard component={ContentTrackingIndex} />}</Route>
      <Route path="/tracking/competitor">{() => <Guard component={CompetitorStudy} />}</Route>
      <Route path="/tracking">{() => <Guard component={TrackingHome} />}</Route>
      <Route path="/content-tracking">{() => <Guard component={TrackingHome} />}</Route>
      <Route path="/dm-tracker">{() => <Guard component={DMTracker} />}</Route>
      <Route path="/dm-hub">{() => <Guard component={DMHub} />}</Route>
      <Route path="/send-dm">{() => <Guard component={SendDM} />}</Route>
      <Route path="/video-editor">{() => <Guard component={AIVideoEditor} />}</Route>
      <Route path="/video-studio">{() => <Guard component={VideoEditorStudio} />}</Route>
      <Route path="/webinar-studio/:id/analytics">{(p) => <Guard component={WebinarAnalytics} id={p.id} />}</Route>
      <Route path="/webinar-studio/:id">{(p) => <Guard component={WebinarStudio} id={p.id} />}</Route>
      <Route path="/clip-finder">{() => <Guard component={ClipFinder} />}</Route>
      <Route path="/ig-bot">{() => <Guard component={IgCommentBot} />}</Route>
      <Route path="/ig-tracker">{() => { window.location.replace("/tracking/content/instagram"); return null; }}</Route>
      <Route path="/ig-growth-tracker">{() => <Guard component={IgGrowthTracker} />}</Route>
      <Route path="/virality-tester">{() => <Guard component={ViralityTester} />}</Route>
      <Route path="/everyday-read">{() => <Guard component={EverydayRead} />}</Route>
      <Route path="/sessions">{() => <Guard component={Sessions} />}</Route>
      <Route path="/twitter-scheduler">{() => <Guard component={TwitterScheduler} />}</Route>
      <Route path="/linkedin-scheduler">{() => <Guard component={LinkedInScheduler} />}</Route>
      <Route path="/youtube-scheduler">{() => <Guard component={YouTubeScheduler} />}</Route>
      <Route path="/credits">{() => <Guard component={Credits} />}</Route>
      <Route path="/settings/plan">{() => <Guard component={PlanSettings} />}</Route>
      <Route path="/video-marketing">{() => <Guard component={ClientVideoMarketing} />}</Route>
      <Route path="/video-marketing-addon">{() => <Guard component={VideoMarketingAddon} />}</Route>
      <Route path="/tools/forms/:id/responses">{(p) => <Guard component={FormResponses} id={p.id} />}</Route>
      <Route path="/tools/forms/:id">{(p) => <Guard component={FormBuilder} id={p.id} />}</Route>
      <Route path="/tools/forms">{() => <Guard component={FormsHub} />}</Route>
      <Route path="/tools/board-builder">{() => <Guard component={BoardBuilder} />}</Route>
      <Route path="/tools">{() => <Guard component={ToolsHub} />}</Route>
      <Route path="/meetings/new">{() => <Guard component={NewMeeting} />}</Route>
      <Route path="/meetings/:id">{(p) => <Guard component={MeetingDetail} id={p.id} />}</Route>
      <Route path="/meetings">{() => <Guard component={MeetingsHub} />}</Route>

      {/* Admin — protected */}
      <Route path="/admin/clients/:id">{(p) => <Guard component={AdminClientDetail} adminOnly id={p.id} />}</Route>
      <Route path="/admin/clients">{() => <Guard component={AdminClients} adminOnly />}</Route>
      <Route path="/admin/chat">{() => <Guard component={AdminChat} adminOnly />}</Route>
      <Route path="/admin/documents">{() => <Guard component={AdminDocuments} adminOnly />}</Route>
      <Route path="/admin/settings">{() => <Guard component={AdminSettings} adminOnly />}</Route>
      <Route path="/admin/tracking">{() => <Guard component={AdminTracking} adminOnly />}</Route>
      <Route path="/admin/competitor-study">{() => <Guard component={CompetitorStudy} adminOnly useAdmin={true} />}</Route>
      <Route path="/admin/dm-tracker">{() => <Guard component={DMTracker} adminOnly useAdmin={true} />}</Route>
      <Route path="/admin/dm-hub">{() => <Guard component={DMHub} adminOnly useAdmin={true} />}</Route>
      <Route path="/admin/calendar">{() => <Guard component={AdminCalendar} adminOnly />}</Route>
      <Route path="/admin/ai-ideas">{() => <Guard component={AdminAIIdeas} adminOnly />}</Route>
      <Route path="/admin/course-modules">{() => <Guard component={AdminCourseModules} adminOnly />}</Route>
      <Route path="/admin/video-editor">{() => <Guard component={AIVideoEditor} adminOnly useAdmin={true} />}</Route>
      <Route path="/admin/sessions">{() => <Guard component={AdminSessions} adminOnly />}</Route>
      <Route path="/admin/scheduling">{() => <Guard component={AdminScheduling} adminOnly />}</Route>
      <Route path="/admin/credits">{() => <Guard component={AdminCredits} adminOnly />}</Route>
      <Route path="/admin/crm">{() => <Guard component={AdminCRM} adminOnly />}</Route>
      <Route path="/admin/email-marketing">{() => <Guard component={AdminEmailMarketing} adminOnly />}</Route>
      <Route path="/admin/churn">{() => <Guard component={AdminChurnAnalysis} adminOnly />}</Route>
      <Route path="/admin/referrals">{() => <Guard component={AdminReferrals} adminOnly />}</Route>
      <Route path="/admin/responses">{() => <Guard component={AdminResponses} adminOnly />}</Route>
      <Route path="/admin/community">{() => <Guard component={AdminCommunity} adminOnly />}</Route>
      <Route path="/admin/video-marketing">{() => <Guard component={AdminVideoMarketing} adminOnly />}</Route>
      <Route path="/admin/everyday-read">{() => <Guard component={AdminEverydayRead} adminOnly />}</Route>
      <Route path="/admin/daily-tracker">{() => <Guard component={AdminDailyTracker} adminOnly />}</Route>
      <Route path="/admin/tool-heatmap">{() => <Guard component={AdminToolHeatmap} adminOnly />}</Route>
      <Route path="/admin/project-tracker">{() => <Guard component={ProjectTracker} adminOnly />}</Route>
      <Route path="/admin/feedback">{() => <Guard component={AdminFeedback} adminOnly />}</Route>
      <Route path="/admin">{() => <Guard component={AdminDashboard} adminOnly />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <JarvisProvider>
        <TourProvider>
          <Toaster />
          <GlobalBackground />
          <CustomCursor />
          <CookieBanner />
          <Router />
        </TourProvider>
      </JarvisProvider>
    </TooltipProvider>
  );
}
