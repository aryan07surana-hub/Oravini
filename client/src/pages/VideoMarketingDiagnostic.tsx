import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOLD = "#d4b461";

const API_ENDPOINTS = [
  "/api/webinars",
  "/api/video-events",
  "/api/webinar-contacts",
  "/api/webinar-landing-pages",
  "/api/webinar-recordings",
  "/api/webinar-series",
  "/api/webinar-templates",
  "/api/video-marketing-settings",
  "/api/webinar-domains",
  "/api/video-analytics-overview",
];

export default function VideoMarketingDiagnostic() {
  return (
    <div className="min-h-screen p-8" style={{ background: "#040406" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2" style={{ color: GOLD }}>
            Video Marketing Diagnostic
          </h1>
          <p className="text-sm text-zinc-400">
            Testing API endpoints to identify the issue causing crashes
          </p>
        </div>

        <div className="space-y-3">
          {API_ENDPOINTS.map((endpoint) => (
            <EndpointTest key={endpoint} endpoint={endpoint} />
          ))}
        </div>

        <div className="mt-8 p-6 rounded-2xl" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.2)" }}>
          <h3 className="text-sm font-bold text-white mb-2">How to Fix</h3>
          <ul className="text-xs text-zinc-400 space-y-2">
            <li>• If endpoints show 404: Backend routes are missing</li>
            <li>• If endpoints show 401: Authentication issue</li>
            <li>• If endpoints show 500: Server error, check logs</li>
            <li>• If endpoints timeout: Backend server isn't running</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function EndpointTest({ endpoint }: { endpoint: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: "include" });
      return { status: res.status, ok: res.ok };
    },
    retry: false,
    enabled: false,
  });

  const handleTest = async () => {
    await refetch();
  };

  const status = data?.status;
  const isOk = data?.ok;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#0c0c10", border: "1px solid rgba(212,180,97,0.14)" }}>
      <div className="flex-1 min-w-0">
        <code className="text-xs text-zinc-300 font-mono">{endpoint}</code>
      </div>

      <div className="flex items-center gap-3">
        {status !== undefined && (
          <div className="flex items-center gap-2">
            {isOk ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-bold ${isOk ? "text-green-400" : "text-red-400"}`}>
              {status}
            </span>
          </div>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={handleTest}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </Button>
      </div>
    </div>
  );
}
