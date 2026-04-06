const BRANCH_COLORS = ['#4A7CF7', '#F7A94A', '#4AC88E', '#EF4F7A', '#A14AF7', '#4ADAF7'];
const GOLD = '#d4b461';
const NODE_SPACING = 50;
const CLUSTER_GAP = 70;
const BOX_W = 216;
const BOX_H = 40;
const CENTER_TO_BOX = 195;
const BOX_TO_DOT = 44;
const DOT_R = 5;

export interface MindMapData {
  center: string;
  branches: { label: string; emoji?: string; nodes: string[] }[];
}

function computeLayout(branches: MindMapData['branches']) {
  const N = branches.length;
  const rightCount = Math.ceil(N / 2);
  const leftCount = N - rightCount;

  const rightBranches = branches.slice(0, rightCount);
  const leftBranches = branches.slice(rightCount);

  function clusterH(M: number) { return Math.max(BOX_H, (M - 1) * NODE_SPACING + BOX_H); }

  function getYPositions(bArr: typeof branches): number[] {
    const heights = bArr.map(b => clusterH(b.nodes.length));
    const total = heights.reduce((a, b) => a + b, 0) + Math.max(0, bArr.length - 1) * CLUSTER_GAP;
    let y = -total / 2;
    return bArr.map((_, i) => {
      const center = y + heights[i] / 2;
      y += heights[i] + CLUSTER_GAP;
      return center;
    });
  }

  const rightYs = getYPositions(rightBranches);
  const leftYs = getYPositions(leftBranches);

  // Canvas height: fit all clusters
  const rightTotal = rightBranches.length
    ? rightBranches.map(b => clusterH(b.nodes.length)).reduce((a, b) => a + b, 0) + (rightBranches.length - 1) * CLUSTER_GAP
    : 0;
  const leftTotal = leftBranches.length
    ? leftBranches.map(b => clusterH(b.nodes.length)).reduce((a, b) => a + b, 0) + (leftBranches.length - 1) * CLUSTER_GAP
    : 0;
  const neededH = Math.max(rightTotal, leftTotal, 300);

  const W = 1760;
  const H = neededH + 160; // 80px margin top + bottom
  const cx = W / 2;
  const cy = H / 2;

  const RIGHT_BOX_X = cx + CENTER_TO_BOX;
  const LEFT_BOX_X = cx - CENTER_TO_BOX - BOX_W;

  return {
    W, H, cx, cy,
    items: branches.map((branch, i) => {
      const isRight = i < rightCount;
      const idx = isRight ? i : i - rightCount;
      const relY = isRight ? rightYs[idx] : leftYs[idx];
      const by = cy + relY; // absolute Y of branch center

      const bx = isRight ? RIGHT_BOX_X : LEFT_BOX_X;
      const boxCY = by;
      const boxY = boxCY - BOX_H / 2;

      const connX = isRight ? bx : bx + BOX_W;
      const connY = boxCY;

      const cp1x = cx + (isRight ? 110 : -110);
      const cp1y = cy;
      const cp2x = isRight ? connX - 90 : connX + 90;
      const cp2y = connY;

      const M = branch.nodes.length;
      const nodeOriginX = isRight ? bx + BOX_W : bx;
      const dotX = isRight ? nodeOriginX + BOX_TO_DOT : nodeOriginX - BOX_TO_DOT;
      const textX = isRight ? dotX + DOT_R + 11 : dotX - DOT_R - 11;

      const nodes = branch.nodes.map((node, j) => ({
        node,
        ny: boxCY + (j - (M - 1) / 2) * NODE_SPACING,
        dotX,
        textX,
      }));

      const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
      const labelText = (branch.emoji ? branch.emoji + ' ' : '') + branch.label;

      return { branch, i, isRight, bx, boxY, boxCY, connX, connY, cp1x, cp1y, cp2x, cp2y, nodes, nodeOriginX, color, labelText };
    }),
  };
}

// ── Build SVG string (for PDF embedding) ──────────────────────────────────────
export function buildMindMapSVGString(data: MindMapData): string {
  if (!data?.branches?.length) return '';
  const { W, H, cx, cy, items } = computeLayout(data.branches);

  const defs = `
    <pattern id="pdgrid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="14" cy="14" r="0.65" fill="rgba(255,255,255,0.04)"/>
    </pattern>
    ${items.map(({ i, color, connX, connY }) =>
      `<linearGradient id="pdg${i}" x1="${cx}" y1="${cy}" x2="${connX}" y2="${connY}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.85"/>
      </linearGradient>`
    ).join('')}
    <radialGradient id="pdctr" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1c2a65"/><stop offset="100%" stop-color="#080e26"/>
    </radialGradient>
    <filter id="pdcglow" x="-50%" y="-150%" width="200%" height="400%">
      <feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="pdbg" x="-30%" y="-100%" width="160%" height="300%">
      <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;

  const lines = items.map(({ i, cp1x, cp1y, cp2x, cp2y, connX, connY }) =>
    `<path d="M${cx},${cy} C${cp1x},${cp1y} ${cp2x},${cp2y} ${connX},${connY}" fill="none" stroke="url(#pdg${i})" stroke-width="2.5" stroke-linecap="round"/>`
  ).join('');

  const branchSVG = items.map(({ i, isRight, bx, boxY, boxCY, color, labelText, nodes, nodeOriginX }) => {
    const truncLabel = labelText.length > 26 ? labelText.slice(0, 24) + '…' : labelText;
    const leafLines = nodes.map(({ ny, dotX, textX, node }) => {
      const cpx = nodeOriginX + (isRight ? 30 : -30);
      const trunc = node.length > 52 ? node.slice(0, 50) + '…' : node;
      return `
        <path d="M${nodeOriginX},${boxCY} Q${cpx},${ny} ${dotX},${ny}" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="${dotX}" cy="${ny}" r="5.5" fill="${color}" opacity="0.8"/>
        <text x="${textX}" y="${ny}" text-anchor="${isRight ? 'start' : 'end'}" dominant-baseline="middle"
          fill="rgba(255,255,255,0.88)" font-size="13" font-family="Arial,sans-serif">${trunc}</text>`;
    }).join('');
    return `
      <rect x="${bx - 2}" y="${boxY - 2}" width="${BOX_W + 4}" height="${BOX_H + 4}" rx="11" fill="${color}" opacity="0.08" filter="url(#pdbg)"/>
      <rect x="${bx}" y="${boxY}" width="${BOX_W}" height="${BOX_H}" rx="10" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/>
      <text x="${bx + BOX_W / 2}" y="${boxCY}" text-anchor="middle" dominant-baseline="middle"
        fill="${color}" font-size="13.5" font-weight="800" font-family="Arial,sans-serif">${truncLabel}</text>
      ${leafLines}`;
  }).join('');

  const truncCenter = data.center.length > 32 ? data.center.slice(0, 30) + '…' : data.center;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs}</defs>
  <rect width="${W}" height="${H}" rx="14" fill="#060d22"/>
  <rect width="${W}" height="${H}" rx="14" fill="url(#pdgrid)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="140" ry="60" fill="${GOLD}" opacity="0.04" filter="url(#pdcglow)"/>
  ${lines}
  ${branchSVG}
  <ellipse cx="${cx}" cy="${cy}" rx="120" ry="42" fill="url(#pdctr)" stroke="${GOLD}" stroke-width="2.6" filter="url(#pdcglow)"/>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
    fill="${GOLD}" font-size="15" font-weight="900" font-family="Arial,sans-serif">${truncCenter}</text>
</svg>`;
}

// ── React component ────────────────────────────────────────────────────────────
export default function MindMap({ data }: { data: MindMapData }) {
  if (!data?.branches?.length) return null;
  const { W, H, cx, cy, items } = computeLayout(data.branches);

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#060d22', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: W }}>
        <defs>
          <pattern id="mmgrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="0.65" fill="rgba(255,255,255,0.042)" />
          </pattern>
          {items.map(({ i, color, connX, connY }) => (
            <linearGradient key={i} id={`mmg${i}`}
              x1={cx} y1={cy} x2={connX} y2={connY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color} stopOpacity="0.07" />
              <stop offset="100%" stopColor={color} stopOpacity="0.88" />
            </linearGradient>
          ))}
          <radialGradient id="mmcenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1c2a65" />
            <stop offset="100%" stopColor="#080e26" />
          </radialGradient>
          <filter id="mmcglow" x="-50%" y="-150%" width="200%" height="400%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mmbglow" x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mmleaf" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="#060d22" rx={14} />
        <rect width={W} height={H} fill="url(#mmgrid)" rx={14} />

        {/* Center ambient glow */}
        <ellipse cx={cx} cy={cy} rx={140} ry={60} fill={GOLD} opacity="0.05" filter="url(#mmcglow)" />

        {/* Bezier lines center → branch */}
        {items.map(({ i, cp1x, cp1y, cp2x, cp2y, connX, connY }) => (
          <path key={`l${i}`}
            d={`M${cx},${cy} C${cp1x},${cp1y} ${cp2x},${cp2y} ${connX},${connY}`}
            fill="none" stroke={`url(#mmg${i})`} strokeWidth="2.6" strokeLinecap="round" />
        ))}

        {/* Branches */}
        {items.map(({ i, isRight, bx, boxY, boxCY, color, labelText, nodes, nodeOriginX }) => {
          const truncLabel = labelText.length > 26 ? labelText.slice(0, 24) + '…' : labelText;
          return (
            <g key={`b${i}`}>
              {/* Box glow */}
              <rect x={bx - 2} y={boxY - 2} width={BOX_W + 4} height={BOX_H + 4} rx={11}
                fill={color} opacity="0.09" filter="url(#mmbglow)" />
              {/* Box */}
              <rect x={bx} y={boxY} width={BOX_W} height={BOX_H} rx={10}
                fill={`${color}1e`} stroke={color} strokeWidth="2" />
              {/* Box label */}
              <text x={bx + BOX_W / 2} y={boxCY} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize="14" fontWeight="800" fontFamily="Arial, sans-serif">
                {truncLabel}
              </text>

              {/* Leaf nodes */}
              {nodes.map(({ ny, dotX, textX, node }, j) => {
                const cpx = nodeOriginX + (isRight ? 32 : -32);
                const trunc = node.length > 52 ? node.slice(0, 50) + '…' : node;
                return (
                  <g key={`n${j}`}>
                    {/* Fan line */}
                    <path d={`M${nodeOriginX},${boxCY} Q${cpx},${ny} ${dotX},${ny}`}
                      fill="none" stroke={color} strokeOpacity="0.38" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Dot glow */}
                    <circle cx={dotX} cy={ny} r={9} fill={color} opacity="0.12" filter="url(#mmleaf)" />
                    {/* Dot */}
                    <circle cx={dotX} cy={ny} r={DOT_R + 0.5} fill={color} opacity="0.85" />
                    {/* Label */}
                    <text x={textX} y={ny} textAnchor={isRight ? 'start' : 'end'}
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.88)" fontSize="13.5" fontFamily="Arial, sans-serif">
                      {trunc}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Center node */}
        <ellipse cx={cx} cy={cy} rx={120} ry={42} fill="url(#mmcenter)"
          stroke={GOLD} strokeWidth="2.6" filter="url(#mmcglow)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={GOLD} fontSize="15" fontWeight="900" fontFamily="Arial, sans-serif">
          {data.center.length > 32 ? data.center.slice(0, 30) + '…' : data.center}
        </text>
      </svg>
    </div>
  );
}
