import {useLocation} from 'wouter';import {useAuth} from '@/hooks/use-auth';import {Gift} from 'lucide-react';import LegacyPricingCards from '@/components/pricing/LegacyPricingCards';
const GOLD='#d4b461',GOLD_BRIGHT='#f0c84b',oraviniLogoPath='/oravini-logo.png';
export default function LegacyPricingPreview(){const {user}=useAuth();const [,navigate]=useLocation();
  const name = (user as any)?.name?.split(" ")[0] || "there";

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" as const, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={oraviniLogoPath} alt="Oravini" style={{ height: 36, width: 36, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 6 }} />
          <button
            onClick={() => navigate("/oravini")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 500, transition: "color 0.2s", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
            Go back to home page
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user && (user as any).planConfirmed && (
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "none", border: `1px solid rgba(255,255,255,0.12)`,
                cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13,
                fontWeight: 500, padding: "7px 16px", borderRadius: 8, transition: "all 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              Go to Dashboard →
            </button>
          )}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Choose Your Plan</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40, maxWidth: 560 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>
            Welcome, {name}
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: 14 }}>
            Choose your plan to<br /><span style={{ color: GOLD }}>unlock your dashboard</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
            Start free, or choose the plan and term that fit your work.
          </p>
        </div>

        {/* Notice banner */}
        <div style={{ width: "100%", maxWidth: 1100, marginBottom: 28, background: "rgba(212,180,97,0.08)", border: `1px solid ${GOLD}44`, borderRadius: 14, padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 99, background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gift size={18} color={GOLD} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: GOLD, margin: 0 }}>Free, Growth, Pro and Growth + Video</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>Pricing review only. Nothing here changes your current plan.</p>
          </div>
        </div>

<LegacyPricingCards/></div></div>);}
