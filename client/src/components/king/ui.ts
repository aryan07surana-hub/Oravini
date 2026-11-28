// King Astrology — self-contained visual primitives.
//
// This funnel deliberately shares no UI code with the rest of the app: a change
// to another product's buttons or surfaces can never alter King's pages, and
// nothing here carries another brand. Deep black, thin borders, one gold accent.
export const GOLD = "#d4b461";
export const INK = "#0b0b0e";

export const surface = {
  page: "bg-[#0b0b0e]",
  card: "bg-[#111115] border border-white/[0.1]",
  inset: "bg-white/[0.025] border border-white/[0.07]",
};

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#d4b461]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]";

type BtnVariant = "primary" | "secondary" | "ghost";
type BtnSize = "sm" | "md" | "lg";

/** Class string for a button, or a link styled as one. */
export function btn(variant: BtnVariant = "secondary", size: BtnSize = "md"): string {
  const base =
    `inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${focusRing}`;
  const sizes: Record<BtnSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-[15px]",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-[#d4b461] text-[#14110a] hover:bg-[#dfc277] disabled:hover:bg-[#d4b461]",
    secondary: "bg-white/[0.04] text-zinc-200 border border-white/[0.1] hover:bg-white/[0.08] hover:text-white",
    ghost: "text-zinc-400 hover:text-white hover:bg-white/[0.05]",
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

/** Text input / form field. Pass an error state to colour the border red. */
export function field(invalid = false): string {
  return `w-full h-11 px-3.5 rounded-lg text-sm text-white placeholder:text-zinc-600 bg-white/[0.03] border transition-colors focus:border-[#d4b461]/70 ${focusRing} ${
    invalid ? "border-red-400/60" : "border-white/[0.1]"
  }`;
}
