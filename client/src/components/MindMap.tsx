const BRANCH_COLORS = ['#4A7CF7', '#F7A94A', '#4AC88E', '#EF4F7A', '#A14AF7', '#4ADAF7'];
const GOLD = '#d4b461';

interface MindMapData {
  center: string;
  branches: { label: string; emoji?: string; nodes: string[] }[];
}

function estimateTextWidth(text: string, fontSize = 10.5) {
  return text.length * (fontSize * 0.62);
}

export default function MindMap({ data }: { data: MindMapData }) {
  const { center, branches } = data;
  if (!branches?.length) return null;

  const W = 1060, H = 680;
  const cx = W / 2, cy = H / 2;
  const BR = 200;   // center → branch box center
  const LR = 145;   // branch → leaf
  const LS = 44;    // perpendicular leaf spread
  const N = branches.length;
  const BOX_H = 30;

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#080d1e', borderRadius: 14 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 660, display: 'block', padding: '6px' }}>
        <defs>
          <pattern id="mmgrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="0.6" fill="rgba(255,255,255,0.035)" />
          </pattern>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="centerglow" x="-40%" y="-100%" width="180%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e2860" />
            <stop offset="100%" stopColor="#0c1030" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mmgrid)" rx={12} />

        {branches.map((branch, i) => {
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
          const cosA = Math.cos(angle), sinA = Math.sin(angle);
          const bx = cx + cosA * BR, by = cy + sinA * BR;
          const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
          const M = branch.nodes.length;
          const pX = -sinA, pY = cosA;

          const isRight = cosA > 0.28;
          const isLeft = cosA < -0.28;
          const isTop = !isRight && !isLeft && sinA < 0;

          const labelText = (branch.emoji ? branch.emoji + ' ' : '') + branch.label;
          const BOX_W = Math.min(165, Math.max(95, estimateTextWidth(labelText, 10.5) + 28));

          // Box position: offset from branch point in branch direction so line connects to near edge
          let boxX: number, boxY: number;
          if (isRight)     { boxX = bx + 12;           boxY = by - BOX_H / 2; }
          else if (isLeft) { boxX = bx - 12 - BOX_W;   boxY = by - BOX_H / 2; }
          else if (isTop)  { boxX = bx - BOX_W / 2;     boxY = by - 12 - BOX_H; }
          else             { boxX = bx - BOX_W / 2;     boxY = by + 12; }

          // Clamp box inside SVG
          boxX = Math.max(6, Math.min(W - BOX_W - 6, boxX));
          boxY = Math.max(6, Math.min(H - BOX_H - 6, boxY));

          const boxCX = boxX + BOX_W / 2;
          const boxCY = boxY + BOX_H / 2;

          // Bezier: center → near edge of box
          const edgeX = isRight ? boxX : isLeft ? boxX + BOX_W : boxCX;
          const edgeY = isTop ? boxY + BOX_H : !isRight && !isLeft && !isTop ? boxY : boxCY;

          const cp1x = cx + cosA * 80, cp1y = cy + sinA * 80;
          const cp2x = edgeX - cosA * 60, cp2y = edgeY - sinA * 60;

          // Leaf positions: from box center, extend outward
          const leafOriginX = isRight ? boxX + BOX_W : isLeft ? boxX : boxCX;
          const leafOriginY = isTop ? boxY : !isRight && !isLeft && !isTop ? boxY + BOX_H : boxCY;

          return (
            <g key={i}>
              {/* Center → box bezier */}
              <path d={`M ${cx} ${cy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${edgeX} ${edgeY}`}
                fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round" />

              {/* Branch box */}
              <rect x={boxX} y={boxY} width={BOX_W} height={BOX_H} rx={7}
                fill={`${color}18`} stroke={color} strokeWidth="1.5" filter="url(#glow)" />
              <text x={boxCX} y={boxCY} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize="10.5" fontWeight="800" letterSpacing="-0.01em">
                {labelText.length > 22 ? labelText.slice(0, 20) + '…' : labelText}
              </text>

              {/* Leaf nodes */}
              {branch.nodes.map((node, j) => {
                const offset = (j - (M - 1) / 2) * LS;
                const lx = leafOriginX + cosA * LR + pX * offset;
                const ly = leafOriginY + sinA * LR + pY * offset;

                let tAnchor: string, tx: number, ty: number;
                if (cosA > 0.25)      { tAnchor = 'start'; tx = lx + 8;  ty = ly; }
                else if (cosA < -0.25){ tAnchor = 'end';   tx = lx - 8;  ty = ly; }
                else if (sinA < 0)    { tAnchor = 'middle';tx = lx;      ty = ly - 8; }
                else                  { tAnchor = 'middle';tx = lx;      ty = ly + 8; }

                const clTx = Math.min(Math.max(tx, 8), W - 8);
                const clTy = Math.min(Math.max(ty, 10), H - 10);

                return (
                  <g key={j}>
                    <line x1={leafOriginX} y1={leafOriginY} x2={lx} y2={ly}
                      stroke={`${color}30`} strokeWidth="1.1" strokeLinecap="round" />
                    <circle cx={lx} cy={ly} r={3} fill={color} opacity="0.55" />
                    <text x={clTx} y={clTy} textAnchor={tAnchor} dominantBaseline="middle"
                      fill="rgba(255,255,255,0.68)" fontSize="9.5" letterSpacing="0">
                      {node.length > 38 ? node.slice(0, 36) + '…' : node}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Center node — rendered last so it's on top */}
        <ellipse cx={cx} cy={cy} rx={90} ry={32} fill="url(#centerGrad)" stroke={GOLD} strokeWidth="2" filter="url(#centerglow)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={GOLD} fontSize="12" fontWeight="900" letterSpacing="-0.01em">
          {center.length > 24 ? center.slice(0, 22) + '…' : center}
        </text>
      </svg>
    </div>
  );
}
