// Oravini logo: three stacked blue blades (traced from the brand mark) plus the lowercase wordmark.
export function OraviniMark({ size = 24, className }: { size?: number; className?: string }) {
  const id = "om" + size;
  return (
    <svg width={size * 1.3} height={size} viewBox="0 0 175 135" className={className} role="img" aria-label="Oravini" style={{ flexShrink: 0, display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2e78ef" />
          <stop offset="1" stopColor="#4f93ff" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        <path transform="translate(30 0)" d="M18 41C8 41 3 35 8 29L26 11C30 7 35 5 42 4.5L128 0C139 0 143 6 138 12L120 31C116 36 111 38 104 38.5L30 41Z" />
        <path transform="translate(14 46)" d="M18 41C8 41 3 35 8 29L26 11C30 7 35 5 42 4.5L128 0C139 0 143 6 138 12L120 31C116 36 111 38 104 38.5L30 41Z" />
        <path transform="translate(0 91)" d="M18 41C8 41 3 35 8 29L26 11C30 7 35 5 42 4.5L128 0C139 0 143 6 138 12L120 31C116 36 111 38 104 38.5L30 41Z" />
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
