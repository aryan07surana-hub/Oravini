import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiHealthBanner } from "./ApiHealthBanner";

const GOLD = "#d4b461";

// Lazy load the main component to prevent blocking
const PlatformView = lazy(() => import("./PlatformView"));

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: GOLD }} />
        <p className="text-sm text-zinc-400">Loading Video Marketing Studio...</p>
      </div>
    </div>
  );
}

// Error fallback with more details
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#040406" }}>
      <div className="max-w-lg w-full p-8 space-y-6 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Video Marketing Studio Error</h2>
          <p className="text-sm text-zinc-400 mb-4">
            The Video Marketing section encountered an issue. This usually happens due to:
          </p>
          <ul className="text-xs text-zinc-500 space-y-1 text-left max-w-md mx-auto mb-4">
            <li>• A network connection problem</li>
            <li>• Missing API configuration</li>
            <li>• Browser cache issues</li>
            <li>• Incomplete data from the server</li>
          </ul>
          {error.message && (
            <details className="text-left mb-4">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                Technical Details
              </summary>
              <pre className="text-[10px] mt-2 p-3 rounded-lg bg-zinc-900 text-red-400 overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              resetError();
              window.location.reload();
            }}
            style={{ background: GOLD, color: "#000" }}
            className="font-semibold"
          >
            Reload Page
          </Button>
          <Button
            onClick={() => window.location.href = "/dashboard"}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// Custom error boundary for better error handling
class VideoMarketingErrorBoundary extends ErrorBoundary {
  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} resetError={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

export default function PlatformViewWrapper() {
  return (
    <>
      <ApiHealthBanner />
      <VideoMarketingErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <PlatformView />
        </Suspense>
      </VideoMarketingErrorBoundary>
    </>
  );
}
