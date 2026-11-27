// Offer banner in the live room: shows the seller's attached Oravini checkout and opens it.
// The browser only sends the checkout code and the registrant id; price, fee and seller
// are decided by the server when /pay/:code is opened.
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";

type Offer = { code: string; title: string; description: string | null; price: string; buttonColor: string | null };

export function PayBanner({ slug, registrationId }: { slug: string; registrationId?: string }) {
  const { data } = useQuery<{ offer: Offer | null }>({
    queryKey: [`/api/public/webinars/${encodeURIComponent(slug)}/pay-offer`],
    refetchInterval: 30_000,
  });
  const o = data?.offer;
  if (!o) return null;
  const href = `/pay/${encodeURIComponent(o.code)}${registrationId ? `?r=${encodeURIComponent(registrationId)}` : ""}`;
  const color = o.buttonColor && /^#[0-9a-fA-F]{6}$/.test(o.buttonColor) ? o.buttonColor : "#d4b461";
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.06] bg-[#d4b461]/[0.06]" data-testid="pay-banner">
      <ShoppingBag className="w-4 h-4 flex-shrink-0" style={{ color }} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">{o.title}</p>
        {o.description && <p className="text-[11px] text-zinc-400 truncate">{o.description}</p>}
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid="pay-banner-buy"
        className="flex-shrink-0 h-8 px-3 inline-flex items-center rounded-lg text-[13px] font-semibold text-black" style={{ background: color }}>
        Buy {o.price}
      </a>
    </div>
  );
}
