import PublicNav from "@/components/video-marketing/PublicNav";
import Hero from "@/components/video-marketing/Hero";
import StatsStrip from "@/components/video-marketing/StatsStrip";
import Features from "@/components/video-marketing/Features";
import UpcomingWebinars from "@/components/video-marketing/UpcomingWebinars";
import HowItWorks from "@/components/video-marketing/HowItWorks";
import AnalyticsShowcase from "@/components/video-marketing/AnalyticsShowcase";
import PricingCTA from "@/components/video-marketing/PricingCTA";
import FinalCTA from "@/components/video-marketing/FinalCTA";
import PublicFooter from "@/components/video-marketing/PublicFooter";

export default function VideoMarketing() {
    return (
        <div
            className="min-h-screen"
            style={{
                background:
                    "linear-gradient(180deg, #0a0910 0%, #12101a 50%, #0a0910 100%)",
                color: "#fff",
            }}
        >
            <PublicNav />
            <main>
                <Hero />
                <StatsStrip />
                <Features />
                <UpcomingWebinars />
                <HowItWorks />
                <AnalyticsShowcase />
                <PricingCTA />
                <FinalCTA />
            </main>
            <PublicFooter />
        </div>
    );
}
