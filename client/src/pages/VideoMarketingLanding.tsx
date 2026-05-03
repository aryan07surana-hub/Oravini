import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Play, BarChart2, Users, Zap, Crown, ArrowRight } from "lucide-react";

const GOLD = "#d4b461";

export default function VideoMarketingLanding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const userPlan = (user as any)?.plan || "free";
  const hasVideoMarketing = (user as any)?.hasVideoMarketing || false;

  const getPricingCTA = () => {
    if (hasVideoMarketing) {
      return {
        text: "Access Your Platform →",
        action: () => navigate("/video-marketing/dashboard"),
        color: "primary"
      };
    }

    switch (userPlan) {
      case "free":
      case "starter":
        return {
          text: "Upgrade to Growth + Video Marketing",
          action: () => navigate("/select-plan"),
          color: "primary",
          price: "$69/mo (Growth + Video)"
        };
      case "growth":
        return {
          text: "Add Video Marketing for +$20/mo",
          action: () => navigate("/select-plan"),
          color: "primary",
          price: "$69/mo total"
        };
      case "pro":
        return {
          text: "Add Video Marketing FREE",
          action: () => navigate("/select-plan"),
          color: "primary",
          price: "Included at no extra cost"
        };
      case "elite":
        return {
          text: "Already Included - Access Now",
          action: () => navigate("/video-marketing/dashboard"),
          color: "primary"
        };
      default:
        return {
          text: "Get Started",
          action: () => navigate("/select-plan"),
          color: "primary"
        };
    }
  };

  const cta = getPricingCTA();

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff" }}>
      {/* Hero Section */}
      <div style={{ padding: "80px 24px", textAlign: "center", maxWidth: 1200, margin: "0 auto" }}>
        <Badge style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40`, color: GOLD, marginBottom: 20 }}>
          <Crown className="w-3 h-3 mr-1.5" /> Video Marketing Platform
        </Badge>
        
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
          Host Webinars.<br />
          <span style={{ color: GOLD }}>Convert Your Audience.</span>
        </h1>
        
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Everything you need to host professional webinars, build landing pages, and track analytics — all in one platform.
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Button
            onClick={cta.action}
            style={{
              background: `linear-gradient(135deg, #f0c84b, ${GOLD})`,
              color: "#000",
              padding: "16px 40px",
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              boxShadow: `0 0 30px ${GOLD}40`
            }}
          >
            {cta.text} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          {cta.price && (
            <p style={{ fontSize: 14, color: GOLD, fontWeight: 600 }}>{cta.price}</p>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ padding: "60px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            {
              icon: Play,
              title: "Webinar Hosting",
              desc: "Host live webinars with up to 500 attendees. HD streaming, interactive chat, polls, and Q&A.",
              features: ["Live streaming", "Interactive chat", "Screen sharing", "Polls & surveys"]
            },
            {
              icon: BarChart2,
              title: "Landing Pages",
              desc: "Create unlimited high-converting landing pages with our drag-and-drop builder.",
              features: ["Drag & drop builder", "Mobile optimized", "Custom domains", "A/B testing"]
            },
            {
              icon: Users,
              title: "Advanced Analytics",
              desc: "Track every metric that matters. Understand your audience and optimize performance.",
              features: ["Attendance tracking", "Engagement metrics", "Conversion tracking", "Replay analytics"]
            }
          ].map((feature, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 32
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${GOLD}15`,
                border: `1px solid ${GOLD}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20
              }}>
                <feature.icon style={{ width: 24, height: 24, color: GOLD }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>{feature.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.6 }}>
                {feature.desc}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {feature.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check style={{ width: 16, height: 16, color: GOLD }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing CTA */}
      <div style={{
        padding: "60px 24px",
        maxWidth: 800,
        margin: "0 auto",
        textAlign: "center",
        background: `linear-gradient(135deg, ${GOLD}15, ${GOLD}05)`,
        border: `1px solid ${GOLD}30`,
        borderRadius: 24
      }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
          {hasVideoMarketing 
            ? "You already have access! Start hosting webinars now."
            : userPlan === "elite"
            ? "Video Marketing is included in your Elite plan."
            : userPlan === "pro"
            ? "Add Video Marketing to your Pro plan for FREE."
            : userPlan === "growth"
            ? "Add Video Marketing to your Growth plan for just $20/mo."
            : "Upgrade to Growth or Pro to unlock Video Marketing."}
        </p>
        <Button
          onClick={cta.action}
          style={{
            background: `linear-gradient(135deg, #f0c84b, ${GOLD})`,
            color: "#000",
            padding: "16px 40px",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 12,
            border: "none",
            cursor: "pointer"
          }}
        >
          {cta.text}
        </Button>
      </div>

      {/* Footer */}
      <div style={{ padding: "40px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 80 }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          © 2025 Oravini. All rights reserved.
        </p>
      </div>
    </div>
  );
}
