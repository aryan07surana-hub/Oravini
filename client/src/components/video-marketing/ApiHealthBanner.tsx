import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApiHealthBanner() {
  const [health, setHealth] = useState<"checking" | "healthy" | "unhealthy">("checking");
  const [failedEndpoints, setFailedEndpoints] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    const endpoints = [
      "/api/webinars",
      "/api/video-events",
      "/api/webinar-contacts",
    ];

    const failed: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) failed.push(endpoint);
      } catch {
        failed.push(endpoint);
      }
    }

    setFailedEndpoints(failed);
    setHealth(failed.length > 0 ? "unhealthy" : "healthy");
  };

  if (dismissed || health === "checking" || health === "healthy") {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full mx-4"
      style={{
        background: "rgba(239, 68, 68, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(239, 68, 68, 0.5)",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">
              API Connection Issues Detected
            </h3>
            <p className="text-xs text-white/80 mb-2">
              Some features may not work properly. {failedEndpoints.length} endpoint{failedEndpoints.length > 1 ? "s" : ""} failed.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer text-white/60 hover:text-white/90 mb-1">
                Show failed endpoints
              </summary>
              <ul className="space-y-1 mt-2">
                {failedEndpoints.map((endpoint) => (
                  <li key={endpoint} className="font-mono text-white/70 text-[10px]">
                    • {endpoint}
                  </li>
                ))}
              </ul>
            </details>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={checkHealth}
                className="h-7 text-xs text-white hover:bg-white/10"
              >
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.href = "/video-marketing-diagnostic"}
                className="h-7 text-xs text-white hover:bg-white/10"
              >
                Run Diagnostics
              </Button>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
