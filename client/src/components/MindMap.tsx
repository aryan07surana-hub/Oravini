const BRANCH_COLORS = ['#4A7CF7', '#F7A94A', '#4AC88E', '#EF4F7A', '#A14AF7', '#4ADAF7'];
const GOLD = '#d4b461';

interface MindMapData {
  center: string;
  branches: { label: string; emoji?: string; nodes: string[] }[];
}

export default function MindMap({ data }: { data: MindMapData }) {
  const { center, branches } = data;
  if (!branches?.length) return null;

  const W = 1000, H = 640;
  const cx = W / 2, cy = H / 2;
  const BR = 185;   // center → branch radius
  const LR = 135;   // branch → leaf distance
  const LS = 42;    // perpendicular leaf spread
  const N = branches.length;

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#080d1e', borderRadius: 14 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 640, display: 'block', padding: 8 }}>
        <defs>
          <pattern id="mmgrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="0.7" fill="rgba(255,255,255,0.04)" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e2550" />
            <stop offset="100%" stopColor="#0f1428" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mmgrid)" rx={12} />

        {branches.map((branch, i) => {
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
          const cosA = Math.cos(angle), sinA = Math.sin(angle);
          const bx = cx + cosA * BR, by = cy + sinA * BR;
          const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
          const M = branch.nodes.length;
          const pX = -sinA, pY = cosA; // perpendicular

          // Bezier: smooth curve from center to branch
          const cp1x = cx + cosA * 75, cp1y = cy + sinA * 75;
          const cp2x = bx - cosA * 55, cp2y = by - sinA * 55;

          // Branch label positioning
          const isRight = cosA > 0.28;
          const isLeft = cosA < -0.28;
          const isTop = !isRight && !isLeft && sinA < 0;
          let lblX: number, lblY: number, lblAnchor: string;
          if (isRight)     { lblX = bx + 16; lblY = by; lblAnchor = 'start'; }
          else if (isLeft) { lblX = bx - 16; lblY = by; lblAnchor = 'end'; }
          else if (isTop)  { lblX = bx; lblY = by - 18; lblAnchor = 'middle'; }
          else             { lblX = bx; lblY = by + 18; lblAnchor = 'middle'; }

          const labelText = (branch.emoji ? branch.emoji + ' ' : '') + branch.label;

          return (
            <g key={i}>
              {/* Animated-style line from root to branch */}
              <path d={`M ${cx} ${cy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${bx} ${by}`}
                fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" />

              {/* Branch glow dot */}
              <circle cx={bx} cy={by} r={9} fill={color} opacity="0.15" filter="url(#glow)" />
              <circle cx={bx} cy={by} r={7} fill={color} opacity="0.9" />

              {/* Branch label */}
              <text x={lblX} y={lblY} textAnchor={lblAnchor} dominantBaseline="middle"
                fill={color} fontSize="11.5" fontWeight="800" letterSpacing="-0.01em">
                {labelText.length > 24 ? labelText.slice(0, 22) + '…' : labelText}
              </text>

              {/* Leaf nodes */}
              {branch.nodes.map((node, j) => {
                const offset = (j - (M - 1) / 2) * LS;
                const lx = bx + cosA * LR + pX * offset;
                const ly = by + sinA * LR + pY * offset;

                // Text anchor/position for leaf
                let tAnchor: string, tx: number, ty: number;
                if (cosA > 0.25)      { tAnchor = 'start'; tx = lx + 8; ty = ly; }
                else if (cosA < -0.25){ tAnchor = 'end';   tx = lx - 8; ty = ly; }
                else if (sinA < 0)    { tAnchor = 'middle';tx = lx;     ty = ly - 8; }
                else                  { tAnchor = 'middle';tx = lx;     ty = ly + 8; }

                // Clamp to SVG bounds
                const clampedTx = Math.min(Math.max(tx, 10), W - 10);
                const clampedTy = Math.min(Math.max(ty, 12), H - 12);

                return (
                  <g key={j}>
                    <line x1={bx} y1={by} x2={lx} y2={ly}
                      stroke={`${color}38`} strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx={lx} cy={ly} r={3.5} fill={color} opacity="0.65" />
                    <text x={clampedTx} y={clampedTy} textAnchor={tAnchor}
                      dominantBaseline="middle" fill="rgba(255,255,255,0.7)" fontSize="9.5">
                      {node.length > 36 ? node.slice(0, 34) + '…' : node}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Center node */}
        <ellipse cx={cx} cy={cy} rx={85} ry={30} fill="url(#centerGrad)" stroke={GOLD} strokeWidth="2" filter="url(#glow)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={GOLD} fontSize="12" fontWeight="900" letterSpacing="-0.01em">
          {center.length > 22 ? center.slice(0, 20) + '…' : center}
        </text>
      </svg>
    </div>
  );
}
