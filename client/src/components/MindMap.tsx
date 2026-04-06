const BRANCH_COLORS = ['#4A7CF7', '#F7A94A', '#4AC88E', '#EF4F7A', '#A14AF7', '#4ADAF7'];
const GOLD = '#d4b461';
const BOX_CHAR_W = 7.8;

export interface MindMapData {
  center: string;
  branches: { label: string; emoji?: string; nodes: string[] }[];
}

function buildGeo(branches: MindMapData['branches'], W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const BR = 250;
  const LR = 195;
  const LS = 60;
  const BOX_H = 38;
  const N = branches.length;
  const rightCount = Math.ceil(N / 2);
  const leftCount = N - rightCount;

  return branches.map((branch, i) => {
    const isRight = i < rightCount;
    const ri = i;
    const li = i - rightCount;

    let angleDeg: number;
    if (isRight) {
      angleDeg = rightCount === 1 ? 0 : -50 + (ri / (rightCount - 1)) * 100;
    } else {
      angleDeg = leftCount === 1 ? 180 : 130 + (li / (leftCount - 1)) * 100;
    }

    const rad = (angleDeg * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const bx = cx + cosA * BR, by = cy + sinA * BR;
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];

    const labelText = (branch.emoji ? branch.emoji + ' ' : '') + branch.label;
    const BOX_W = Math.min(210, Math.max(130, labelText.length * BOX_CHAR_W + 50));

    let boxX = isRight ? bx + 18 : bx - 18 - BOX_W;
    boxX = Math.max(8, Math.min(W - BOX_W - 8, boxX));
    const boxY = Math.max(8, Math.min(H - BOX_H - 8, by - BOX_H / 2));
    const boxCY = boxY + BOX_H / 2;

    const connX = isRight ? boxX : boxX + BOX_W;
    const connY = boxCY;

    const cp1x = cx + cosA * 105, cp1y = cy + sinA * 105;
    const cp2x = isRight ? connX - 85 : connX + 85;
    const cp2y = connY;

    const leafOriginX = isRight ? boxX + BOX_W : boxX;
    const leafOriginY = boxCY;
    const pX = -sinA, pY = cosA;

    return { branch, i, isRight, cosA, sinA, bx, by, color, labelText, BOX_W, BOX_H, boxX, boxY, boxCY, connX, connY, cp1x, cp1y, cp2x, cp2y, leafOriginX, leafOriginY, pX, pY, LR, LS };
  });
}

export function buildMindMapSVGString(data: MindMapData, W = 1400, H = 830): string {
  if (!data?.branches?.length) return '';
  const cx = W / 2, cy = H / 2;
  const geo = buildGeo(data.branches, W, H);

  const defs = `
    <pattern id="mmgrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="0.7" fill="rgba(255,255,255,0.045)"/>
    </pattern>
    ${geo.map(({ i, color, connX, connY }) =>
      `<linearGradient id="pdmmg${i}" x1="${cx}" y1="${cy}" x2="${connX}" y2="${connY}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.06"/>
        <stop offset="55%" stop-color="${color}" stop-opacity="0.58"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.95"/>
      </linearGradient>`
    ).join('')}
    <radialGradient id="pdmmcenter" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e2d70"/>
      <stop offset="100%" stop-color="#090f30"/>
    </radialGradient>
    <filter id="pdboxglow" x="-25%" y="-80%" width="150%" height="260%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="pdcglow" x="-50%" y="-150%" width="200%" height="400%">
      <feGaussianBlur stdDeviation="11" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="pdlglow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;

  const lines = geo.map(({ i, cp1x, cp1y, cp2x, cp2y, connX, connY }) =>
    `<path d="M ${cx} ${cy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${connX} ${connY}" fill="none" stroke="url(#pdmmg${i})" stroke-width="3" stroke-linecap="round"/>`
  ).join('');

  const branches = geo.map(({ branch, i, isRight, cosA, sinA, color, labelText, BOX_W, BOX_H, boxX, boxY, boxCY, leafOriginX, leafOriginY, pX, pY, LR, LS }) => {
    const M = branch.nodes.length;
    const leaves = branch.nodes.map((node, j) => {
      const offset = (j - (M - 1) / 2) * LS;
      const lx = Math.max(12, Math.min(W - 12, leafOriginX + cosA * LR + pX * offset));
      const ly = Math.max(14, Math.min(H - 14, leafOriginY + sinA * LR + pY * offset));
      const leafCp1x = leafOriginX + cosA * 58;
      const leafCp1y = leafOriginY + sinA * 58 + pY * offset * 0.3;
      const textAnchor = isRight ? 'start' : 'end';
      const tx = isRight ? Math.min(lx + 10, W - 12) : Math.max(lx - 10, 12);
      const truncated = node.length > 46 ? node.slice(0, 44) + '…' : node;
      return `
        <path d="M ${leafOriginX} ${leafOriginY} Q ${leafCp1x} ${leafCp1y} ${lx} ${ly}" fill="none" stroke="${color}" stroke-opacity="0.32" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="${lx}" cy="${ly}" r="7" fill="${color}" opacity="0.12" filter="url(#pdlglow)"/>
        <circle cx="${lx}" cy="${ly}" r="4.5" fill="${color}" opacity="0.82"/>
        <text x="${tx}" y="${ly}" text-anchor="${textAnchor}" dominant-baseline="middle" fill="rgba(255,255,255,0.85)" font-size="11" font-weight="500" font-family="Arial, sans-serif">${truncated}</text>`;
    }).join('');
    const truncLabel = labelText.length > 26 ? labelText.slice(0, 24) + '…' : labelText;
    return `
      <rect x="${boxX - 2}" y="${boxY - 2}" width="${BOX_W + 4}" height="${BOX_H + 4}" rx="11" fill="${color}" opacity="0.09" filter="url(#pdboxglow)"/>
      <rect x="${boxX}" y="${boxY}" width="${BOX_W}" height="${BOX_H}" rx="10" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="1.9"/>
      <text x="${boxX + BOX_W / 2}" y="${boxCY}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="13" font-weight="800" font-family="Arial, sans-serif">${truncLabel}</text>
      ${leaves}`;
  }).join('');

  const truncCenter = data.center.length > 30 ? data.center.slice(0, 28) + '…' : data.center;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>${defs}</defs>
    <rect width="${W}" height="${H}" rx="16" fill="url(#mmgrid)"/>
    <rect width="${W}" height="${H}" rx="16" fill="#060d22"/>
    <rect width="${W}" height="${H}" rx="16" fill="url(#mmgrid)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="150" ry="65" fill="${GOLD}" opacity="0.05" filter="url(#pdcglow)"/>
    ${lines}
    ${branches}
    <ellipse cx="${cx}" cy="${cy}" rx="115" ry="40" fill="url(#pdmmcenter)" stroke="${GOLD}" stroke-width="2.6" filter="url(#pdcglow)"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${GOLD}" font-size="14.5" font-weight="900" font-family="Arial, sans-serif" letter-spacing="-0.02em">${truncCenter}</text>
  </svg>`;
}

export default function MindMap({ data }: { data: MindMapData }) {
  const { center, branches } = data;
  if (!branches?.length) return null;

  const W = 1400, H = 830;
  const cx = W / 2, cy = H / 2;
  const geo = buildGeo(branches, W, H);

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: 'linear-gradient(135deg, #050d1f 0%, #08102a 100%)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 820, display: 'block' }}>
        <defs>
          <pattern id="mmgrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.7" fill="rgba(255,255,255,0.048)" />
          </pattern>
          {geo.map(({ i, color, connX, connY }) => (
            <linearGradient key={i} id={`mmg${i}`}
              x1={cx} y1={cy} x2={connX} y2={connY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color} stopOpacity="0.06" />
              <stop offset="55%" stopColor={color} stopOpacity="0.58" />
              <stop offset="100%" stopColor={color} stopOpacity="0.95" />
            </linearGradient>
          ))}
          <radialGradient id="mmcenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e2d70" />
            <stop offset="100%" stopColor="#090f30" />
          </radialGradient>
          <filter id="mmboxglow" x="-25%" y="-80%" width="150%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mmcenterglow" x="-50%" y="-150%" width="200%" height="400%">
            <feGaussianBlur stdDeviation="11" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mmleafglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#mmgrid)" rx={14} />
        <ellipse cx={cx} cy={cy} rx={150} ry={65} fill={GOLD} opacity="0.05" filter="url(#mmcenterglow)" />

        {/* BEZIER LINES */}
        {geo.map(({ i, cp1x, cp1y, cp2x, cp2y, connX, connY }) => (
          <path key={`line${i}`}
            d={`M ${cx} ${cy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${connX} ${connY}`}
            fill="none" stroke={`url(#mmg${i})`} strokeWidth="3" strokeLinecap="round" />
        ))}

        {/* BRANCHES + LEAVES */}
        {geo.map(({ branch, i, isRight, cosA, sinA, color, labelText, BOX_W, BOX_H, boxX, boxY, boxCY, leafOriginX, leafOriginY, pX, pY, LR, LS }) => {
          const M = branch.nodes.length;
          return (
            <g key={`br${i}`}>
              <rect x={boxX - 2} y={boxY - 2} width={BOX_W + 4} height={BOX_H + 4} rx={11}
                fill={color} opacity="0.09" filter="url(#mmboxglow)" />
              <rect x={boxX} y={boxY} width={BOX_W} height={BOX_H} rx={10}
                fill={`${color}1a`} stroke={color} strokeWidth="1.9" />
              <text x={boxX + BOX_W / 2} y={boxCY}
                textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize="13" fontWeight="800" letterSpacing="-0.01em">
                {labelText.length > 26 ? labelText.slice(0, 24) + '…' : labelText}
              </text>

              {branch.nodes.map((node, j) => {
                const offset = (j - (M - 1) / 2) * LS;
                const lx = Math.max(12, Math.min(W - 12, leafOriginX + cosA * LR + pX * offset));
                const ly = Math.max(14, Math.min(H - 14, leafOriginY + sinA * LR + pY * offset));
                const leafCp1x = leafOriginX + cosA * 58;
                const leafCp1y = leafOriginY + sinA * 58 + pY * offset * 0.3;
                const textAnchor = isRight ? 'start' : 'end';
                const tx = isRight ? Math.min(lx + 10, W - 12) : Math.max(lx - 10, 12);
                return (
                  <g key={`lf${j}`}>
                    <path d={`M ${leafOriginX} ${leafOriginY} Q ${leafCp1x} ${leafCp1y} ${lx} ${ly}`}
                      fill="none" stroke={`${color}`} strokeOpacity="0.32" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx={lx} cy={ly} r={7} fill={color} opacity="0.12" filter="url(#mmleafglow)" />
                    <circle cx={lx} cy={ly} r={4.5} fill={color} opacity="0.82" />
                    <text x={tx} y={ly} textAnchor={textAnchor} dominantBaseline="middle"
                      fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="500">
                      {node.length > 46 ? node.slice(0, 44) + '…' : node}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* CENTER */}
        <ellipse cx={cx} cy={cy} rx={115} ry={40} fill="url(#mmcenter)"
          stroke={GOLD} strokeWidth="2.6" filter="url(#mmcenterglow)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={GOLD} fontSize="14.5" fontWeight="900" letterSpacing="-0.02em">
          {center.length > 30 ? center.slice(0, 28) + '…' : center}
        </text>
      </svg>
    </div>
  );
}
