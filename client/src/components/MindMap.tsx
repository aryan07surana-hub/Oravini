const BRANCH_COLORS = ['#4A7CF7', '#F7A94A', '#4AC88E', '#EF4F7A', '#A14AF7', '#4ADAF7'];
const GOLD = '#d4b461';
const BOX_CHAR_W = 7.4;

export interface MindMapData {
  center: string;
  branches: { label: string; emoji?: string; nodes: string[] }[];
}

export default function MindMap({ data }: { data: MindMapData }) {
  const { center, branches } = data;
  if (!branches?.length) return null;

  const W = 1120, H = 720;
  const cx = W / 2, cy = H / 2;
  const BR = 215;    // center → branch anchor
  const LR = 165;    // box edge → leaf distance
  const LS = 48;     // perpendicular leaf spread
  const BOX_H = 33;
  const N = branches.length;
  const rightCount = Math.ceil(N / 2);
  const leftCount = N - rightCount;

  // Pre-calculate all branch geometry so we can define SVG gradients first
  const geo = branches.map((branch, i) => {
    const isRight = i < rightCount;
    const ri = i;
    const li = i - rightCount;

    let angleDeg: number;
    if (isRight) {
      angleDeg = rightCount === 1 ? 0 : -55 + (ri / (rightCount - 1)) * 110;
    } else {
      angleDeg = leftCount === 1 ? 180 : 125 + (li / (leftCount - 1)) * 110;
    }

    const rad = (angleDeg * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const bx = cx + cosA * BR, by = cy + sinA * BR;
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];

    const labelText = (branch.emoji ? branch.emoji + ' ' : '') + branch.label;
    const BOX_W = Math.min(180, Math.max(105, labelText.length * BOX_CHAR_W + 44));

    // Box position — always on the outer side
    let boxX = isRight ? bx + 14 : bx - 14 - BOX_W;
    boxX = Math.max(6, Math.min(W - BOX_W - 6, boxX));
    const boxY = Math.max(6, Math.min(H - BOX_H - 6, by - BOX_H / 2));
    const boxCY = boxY + BOX_H / 2;

    // Connection point (where bezier line meets the box)
    const connX = isRight ? boxX : boxX + BOX_W;
    const connY = boxCY;

    // Bezier control points — natural curve outward from center
    const cp1x = cx + cosA * 90, cp1y = cy + sinA * 90;
    const cp2x = isRight ? connX - 75 : connX + 75;
    const cp2y = connY;

    // Leaf origin: far edge of box
    const leafOriginX = isRight ? boxX + BOX_W : boxX;
    const leafOriginY = boxCY;

    // Perpendicular direction for leaf spread
    const pX = -sinA, pY = cosA;

    return { branch, i, isRight, cosA, sinA, bx, by, color, labelText, BOX_W, boxX, boxY, boxCY, connX, connY, cp1x, cp1y, cp2x, cp2y, leafOriginX, leafOriginY, pX, pY };
  });

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: 'linear-gradient(135deg, #060c20 0%, #0a1128 100%)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 680, display: 'block', padding: '8px' }}>
        <defs>
          <pattern id="mmgrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.6" fill="rgba(255,255,255,0.04)" />
          </pattern>

          {/* Per-branch gradient lines */}
          {geo.map(({ i, color, connX, connY }) => (
            <linearGradient key={i} id={`mmg${i}`}
              x1={cx} y1={cy} x2={connX} y2={connY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color} stopOpacity="0.12" />
              <stop offset="60%" stopColor={color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={color} stopOpacity="0.85" />
            </linearGradient>
          ))}

          <radialGradient id="mmcenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a2460" />
            <stop offset="100%" stopColor="#0c1235" />
          </radialGradient>

          <filter id="mmboxglow" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <filter id="mmcenterglow" x="-40%" y="-120%" width="180%" height="340%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Dot grid background */}
        <rect width={W} height={H} fill="url(#mmgrid)" rx={14} />

        {/* Center glow ambient */}
        <ellipse cx={cx} cy={cy} rx={110} ry={50} fill={GOLD} opacity="0.04" filter="url(#mmcenterglow)" />

        {/* ─── BEZIER LINES (render below boxes) ─── */}
        {geo.map(({ i, cp1x, cp1y, cp2x, cp2y, connX, connY }) => (
          <path key={`line${i}`}
            d={`M ${cx} ${cy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${connX} ${connY}`}
            fill="none" stroke={`url(#mmg${i})`} strokeWidth="2.2" strokeLinecap="round" />
        ))}

        {/* ─── BRANCH BOXES + LEAF NODES ─── */}
        {geo.map(({ branch, i, isRight, cosA, sinA, color, labelText, BOX_W, boxX, boxY, boxCY, leafOriginX, leafOriginY, pX, pY }) => {
          const M = branch.nodes.length;
          return (
            <g key={`br${i}`}>
              {/* Box glow layer */}
              <rect x={boxX - 1} y={boxY - 1} width={BOX_W + 2} height={BOX_H + 2} rx={9}
                fill={color} opacity="0.06" filter="url(#mmboxglow)" />
              {/* Box border + fill */}
              <rect x={boxX} y={boxY} width={BOX_W} height={BOX_H} rx={8}
                fill={`${color}14`} stroke={color} strokeWidth="1.5" />
              {/* Box label */}
              <text x={boxX + BOX_W / 2} y={boxCY}
                textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize="11.5" fontWeight="800" letterSpacing="-0.01em">
                {labelText.length > 22 ? labelText.slice(0, 20) + '…' : labelText}
              </text>

              {/* ─── LEAF NODES ─── */}
              {branch.nodes.map((node, j) => {
                const offset = (j - (M - 1) / 2) * LS;
                const lx = leafOriginX + cosA * LR + pX * offset;
                const ly = leafOriginY + sinA * LR + pY * offset;

                const clLx = Math.max(8, Math.min(W - 8, lx));
                const clLy = Math.max(10, Math.min(H - 10, ly));

                const textAnchor = isRight ? 'start' : 'end';
                const tx = isRight
                  ? Math.min(clLx + 8, W - 8)
                  : Math.max(clLx - 8, 8);

                // Leaf branch line
                const leafCp1x = leafOriginX + cosA * 50;
                const leafCp1y = leafOriginY + sinA * 50 + pY * offset * 0.3;

                return (
                  <g key={`lf${j}`}>
                    <path
                      d={`M ${leafOriginX} ${leafOriginY} Q ${leafCp1x} ${leafCp1y} ${clLx} ${clLy}`}
                      fill="none" stroke={`${color}28`} strokeWidth="1.2" strokeLinecap="round" />
                    {/* Leaf dot */}
                    <circle cx={clLx} cy={clLy} r={3.5} fill={color} opacity="0.55" />
                    {/* Leaf text */}
                    <text x={tx} y={clLy} textAnchor={textAnchor} dominantBaseline="middle"
                      fill="rgba(255,255,255,0.72)" fontSize="9.8" letterSpacing="0">
                      {node.length > 42 ? node.slice(0, 40) + '…' : node}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* ─── CENTER NODE (render last, always on top) ─── */}
        <ellipse cx={cx} cy={cy} rx={95} ry={34} fill="url(#mmcenter)"
          stroke={GOLD} strokeWidth="2.2" filter="url(#mmcenterglow)" />
        <text x={cx} y={cy}
          textAnchor="middle" dominantBaseline="middle"
          fill={GOLD} fontSize="12.5" fontWeight="900" letterSpacing="-0.02em">
          {center.length > 26 ? center.slice(0, 24) + '…' : center}
        </text>
      </svg>
    </div>
  );
}
