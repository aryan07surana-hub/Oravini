import { Loader2 } from "lucide-react";

const GOLD = "#d4b461";

export function LoadingSpinner({ size = "md", color = GOLD }: { size?: "sm" | "md" | "lg"; color?: string }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className={`${sizes[size]} animate-spin`} style={{ color }} />
    </div>
  );
}

export function LoadingSkeleton({ count = 3, height = "h-20" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className={`${height} w-full rounded-xl bg-zinc-800/50 animate-pulse`} />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
