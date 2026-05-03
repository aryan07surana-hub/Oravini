import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Youtube, Instagram, ArrowRight, Sparkles, FileSearch } from "lucide-react";

const GOLD = "#d4b461";

export default function ContentAnalyser() {
  const [, navigate] = useLocation();

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#060606", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        {/* Ambient glow */}
        <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}07 0%, transparent 70%)`, pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${GOLD}18`, border: `1px solid ${GOLD}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileSearch style={{ width: 18, height: 18, color: GOLD }} />
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em", margin: 0 }}>Content Analyser</h1>
          </div>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.42)", maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>
            Paste a link. Get a full breakdown — summary, insights, and a mind map — powered by AI.
          </p>
        </div>

        {/* Platform cards */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 680, width: "100%", position: "relative" }}>
          {/* YouTube */}
          <button onClick={() => navigate("/content-analyser/youtube")} data-testid="card-analyser-youtube"
            style={{ flex: "1 1 280px", maxWidth: 320, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 28px", cursor: "pointer", textAlign: "left", transition: "all 0.22s", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${GOLD}40`; e.currentTarget.style.background = "rgba(212,180,97,0.06)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, borderRadius: "0 20px 0 100%", background: "rgba(255,0,0,0.04)", pointerEvents: "none" }} />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Youtube style={{ width: 26, height: 26, color: "#ff4444" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>YouTube</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Paste any YouTube link. Get summary, key takeaways, section breakdown, and a full mind map.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["Summary", "Breakdown", "Mind Map"].map(t => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px" }}>{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 13, fontWeight: 700 }}>
              Analyse video <ArrowRight style={{ width: 14, height: 14 }} />
            </div>
          </button>

          {/* Instagram */}
          <button onClick={() => navigate("/content-analyser/instagram")} data-testid="card-analyser-instagram"
            style={{ flex: "1 1 280px", maxWidth: 320, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 28px", cursor: "pointer", textAlign: "left", transition: "all 0.22s", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${GOLD}40`; e.currentTarget.style.background = "rgba(212,180,97,0.06)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, borderRadius: "0 20px 0 100%", background: "rgba(225,48,108,0.04)", pointerEvents: "none" }} />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Instagram style={{ width: 26, height: 26, color: "#e1306c" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Instagram</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Add up to 6 post links. Analyse content strategy, themes, engagement patterns, and more.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["Summary", "Strategy", "Mind Map"].map(t => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px" }}>{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 13, fontWeight: 700 }}>
              Analyse posts <ArrowRight style={{ width: 14, height: 14 }} />
            </div>
          </button>
        </div>

        <p style={{ marginTop: 40, fontSize: 11, color: "rgba(255,255,255,0.2)", position: "relative" }}>
          YouTube: 2 credits · Instagram: 3 credits
        </p>
      </div>
    </ClientLayout>
  );
}
