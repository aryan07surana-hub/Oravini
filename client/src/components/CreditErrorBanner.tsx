import { Link } from "wouter";
import { Zap, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditErrorBannerProps {
  message?: string;
}

export default function CreditErrorBanner({ message }: CreditErrorBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-[#d4b461]/40 bg-[#d4b461]/5 p-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-full bg-[#d4b461]/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-[#d4b461]" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Not enough credits</p>
          <p className="text-zinc-400 text-xs mt-0.5">
            {message || "You've run out of credits for this feature."}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Link href="/credits">
          <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs" data-testid="button-view-credits">
            View Credits
          </Button>
        </Link>
        <Button
          size="sm"
          className="bg-[#d4b461] hover:bg-[#c4a451] text-black font-semibold text-xs"
          onClick={() => window.location.href = "/credits"}
          data-testid="button-buy-credits-banner"
        >
          <ShoppingCart className="w-3 h-3 mr-1.5" />
          Buy Credits
        </Button>
      </div>
    </div>
  );
}
