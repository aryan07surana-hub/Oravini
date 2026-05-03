import PublicNav from "@/components/video-marketing/PublicNav";
import Hero from "@/components/video-marketing/Hero";
import StatsStrip from "@/components/video-marketing/StatsStrip";
import Features from "@/components/video-marketing/Features";
import HowItWorks from "@/components/video-marketing/HowItWorks";
import AnalyticsShowcase from "@/components/video-marketing/AnalyticsShowcase";
import UpcomingWebinars from "@/components/video-marketing/UpcomingWebinars";
import PricingCTA from "@/components/video-marketing/PricingCTA";
import FinalCTA from "@/components/video-marketing/FinalCTA";
import PublicFooter from "@/components/video-marketing/PublicFooter";

export default function VideoMarketingLanding() {
  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <PublicNav />
      <Hero />
      <StatsStrip />
      <Features />
      <HowItWorks />
      <AnalyticsShowcase />
      <UpcomingWebinars />
      <PricingCTA />
      <FinalCTA />
      <PublicFooter />
    </div>
  );
}
