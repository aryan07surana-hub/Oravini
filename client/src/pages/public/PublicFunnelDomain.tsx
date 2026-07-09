import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Globe, AlertTriangle } from "lucide-react";

const GOLD = "#d4b461";

// Resolves a custom domain → funnel slug, then mounts PublicFunnelStep
// by navigating to /f/:slug/:stepSlug so the standard route handles it.
export default function PublicFunnelDomain() {
  const [, nav] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const pathParts = window.location.pathname.replace(/^\//, "").split("/").filter(Boolean);
    // pathParts[0] is either empty (root) or a step slug

    fetch(`/api/public/domain/${hostname}`)
      .then(r => {
        if (!r.ok) throw new Error("Domain not found");
        return r.json();
      })
      .then(({ slug, status }) => {
        if (status !== "active") {
          setError("This funnel is not published yet.");
          return;
        }
        // Redirect to the standard funnel route which PublicFunnelStep handles
        if (pathParts.length > 0) {
          nav(`/f/${slug}/${pathParts[0]}`, { replace: true });
        } else {
          nav(`/f/${slug}`, { replace: true });
        }
      })
      .catch(e => setError(e.message || "Domain not configured"));
  }, [nav]);

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#040406", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <AlertTriangle style={{ width: 40, height: 40, color: "#f87171" }} />
      <p style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Domain not found</p>
      <p style={{ color: "#71717a", fontSize: 14 }}>{error}</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#040406", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Globe style={{ width: 36, height: 36, color: GOLD, opacity: 0.5 }} />
      <Loader2 style={{ width: 24, height: 24, color: GOLD, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
