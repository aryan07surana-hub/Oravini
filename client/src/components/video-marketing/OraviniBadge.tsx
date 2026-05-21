import { useState } from "react";
import { ExternalLink } from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#e8cc6e";

export type WatermarkPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

/**
 * Premium Oravini "Powered by" badge — visible by default, clickable, animated.
 * Used as a player watermark and on public pages (channel view, public landing).
 *
 * Default behaviour:
 *   - Bottom-right of player
 *   - Compact pill with logo + "Powered by Oravini" wordmark
 *   - Gold accent border, glassmorphism background
 *   - Hover expands to show tagline
 *   - Click → opens oravini.com in new tab
 */
export function OraviniBadge({
  position = "bottom-right",
  show = true,
  variant = "player",
  bottomOffset = 52,
}: {
  position?: WatermarkPosition;
  show?: boolean;
  variant?: "player" | "page" | "minimal";
  /** Pixels from the bottom — bumped above the player controls bar by default */
  bottomOffset?: number;
}) {
  const [hover, setHover] = useState(false);

  if (!show) return null;

  const positionStyle: React.CSSProperties = (() => {
    switch (position) {
      case "bottom-left":  return { bottom: bottomOffset, left: 12 };
      case "top-right":    return { top: 12, right: 12 };
      case "top-left":     return { top: 12, left: 12 };
      case "bottom-right":
      default:             return { bottom: bottomOffset, right: 12 };
    }
  })();

  // Page variant — solid dark pill that sits in the corner of a static page
  if (variant === "page") {
    return (
      <a
        href="https://oravini.com"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-50 group flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full transition-all hover:scale-105"
        style={{
          ...positionStyle,
          position: "fixed",
          background: "rgba(12,12,16,0.92)",
          border: `1px solid ${GOLD}40`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 12px 36px rgba(0,0,0,0.45), 0 0 32px ${GOLD}18, inset 0 1px 0 ${GOLD}25`,
          textDecoration: "none",
        }}
      >
        <OraviniSymbol />
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: `${GOLD}cc` }}>Powered by</span>
          <span className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Oravini</span>
        </div>
      </a>
    );
  }

  // Minimal — used in places where space is tight
  if (variant === "minimal") {
    return (
      <a
        href="https://oravini.com"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute z-30 flex items-center gap-1.5 px-2 py-1 rounded-md transition-all opacity-75 hover:opacity-100"
        style={{
          ...positionStyle,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${GOLD}30`,
          textDecoration: "none",
        }}
      >
        <OraviniSymbol size={12} />
        <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: GOLD }}>Oravini</span>
      </a>
    );
  }

  // Default: player variant — visible, branded, expands on hover
  return (
    <a
      href="https://oravini.com"
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="absolute z-30 group flex items-center gap-2 rounded-full transition-all"
      style={{
        ...positionStyle,
        background: "rgba(0,0,0,0.78)",
        border: `1px solid ${GOLD}55`,
        backdropFilter: "blur(14px)",
        padding: hover ? "5px 12px 5px 6px" : "4px 9px 4px 5px",
        boxShadow: hover
          ? `0 12px 40px rgba(0,0,0,0.55), 0 0 28px ${GOLD}30, inset 0 1px 0 ${GOLD}25`
          : `0 6px 20px rgba(0,0,0,0.4), 0 0 12px ${GOLD}15, inset 0 1px 0 ${GOLD}15`,
        textDecoration: "none",
        animation: "oravini-badge-glow 4s ease-in-out infinite",
      }}
      title="Hosted with Oravini · Click to learn more"
    >
      <OraviniSymbol size={hover ? 18 : 16} />
      <div className="flex flex-col leading-none overflow-hidden" style={{ marginRight: hover ? 4 : 0 }}>
        <span
          className="text-[7.5px] font-bold uppercase tracking-[0.22em] transition-all"
          style={{ color: `${GOLD}aa`, opacity: hover ? 1 : 0.85, marginBottom: 1 }}
        >
          Powered by
        </span>
        <span
          className="text-[11px] font-black uppercase tracking-[0.16em]"
          style={{
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Oravini
        </span>
      </div>
      <ExternalLink
        className="transition-all"
        style={{
          width: hover ? 11 : 0,
          height: hover ? 11 : 0,
          color: GOLD,
          opacity: hover ? 1 : 0,
          marginLeft: hover ? 0 : -4,
        }}
      />
      <style>{`
        @keyframes oravini-badge-glow {
          0%, 100% { box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 12px ${GOLD}15, inset 0 1px 0 ${GOLD}15; }
          50%      { box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 22px ${GOLD}30, inset 0 1px 0 ${GOLD}25; }
        }
      `}</style>
    </a>
  );
}

function OraviniSymbol({ size = 16 }: { size?: number }) {
  return (
    <div
      className="rounded-md flex items-center justify-center flex-shrink-0 transition-all"
      style={{
        width: size + 4,
        height: size + 4,
        background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
        boxShadow: `0 0 8px ${GOLD}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
      }}
    >
      <svg width={size - 2} height={size - 2} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="13" stroke="#0a0a0a" strokeWidth="2.5" fill="none" />
        <circle cx="16" cy="16" r="6" fill="#0a0a0a" />
      </svg>
    </div>
  );
}
