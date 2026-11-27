// Oravini logo: three stacked blue blades plus the lowercase wordmark. Pure SVG, scales cleanly.
export function OraviniMark({ size = 24, className }: { size?: number; className?: string }) {
  const id = "om" + size;
  return (
    <svg width={size * 1.2} height={size} viewBox="0 0 60 50" className={className} role="img" aria-label="Oravini" style={{ flexShrink: 0, display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fa4ff" />
          <stop offset="1" stopColor="#2e78ef" />
        </linearGradient>
      </defs>
      <g transform="rotate(-9 30 25) skewX(-28) translate(14 0)" fill={`url(#${id})`}>
        <rect x="14" y="2" width="38" height="12" rx="6" />
        <rect x="8" y="19" width="44" height="12" rx="6" />
        <rect x="4" y="36" width="34" height="12" rx="6" />
      </g>
    </svg>
  );
}

export function OraviniLogo({ height = 28, color = "#101828" }: { height?: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: height * 0.3, lineHeight: 1 }}>
      <OraviniMark size={height} />
      <span style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: height * 0.95, letterSpacing: "-0.035em", color }}>oravini</span>
    </span>
  );
}
