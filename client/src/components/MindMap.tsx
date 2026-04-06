const GOLD = "#d4b461";

interface MindMapData {
  center: string;
  branches: { label: string; nodes: string[] }[];
}

interface MindMapProps {
  data: MindMapData;
}

export default function MindMap({ data }: MindMapProps) {
  const { center, branches } = data;
  const W = 800;
  const H = Math.max(400, branches.length * 90 + 80);
  const rootX = 130;
  const rootY = H / 2;
  const branchX = 340;
  const leafX = 590;
  const padding = 60;

  const branchSpacing = (H - padding * 2) / Math.max(branches.length - 1, 1);
  const branchYs = branches.map((_, i) =>
    branches.length === 1 ? H / 2 : padding + i * branchSpacing
  );

  return (
    <div style={{ overflowX: "auto", overflowY: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 560, height: "auto", display: "block" }}>
        {/* Lines root → branches */}
        {branchYs.map((by, i) => (
          <path key={`rb-${i}`}
            d={`M ${rootX + 56} ${rootY} C ${(rootX + branchX) / 2 + 20} ${rootY} ${(rootX + branchX) / 2 - 20} ${by} ${branchX - 68} ${by}`}
            fill="none" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.45"
          />
        ))}

        {/* Lines branches → leaves */}
        {branches.map((branch, bi) => {
          const by = branchYs[bi];
          const count = branch.nodes.length;
          const leafSpacing = Math.min(48, (H - 60) / Math.max(count, 1));
          return branch.nodes.map((_, ni) => {
            const ly = by + (ni - (count - 1) / 2) * leafSpacing;
            return (
              <line key={`bl-${bi}-${ni}`}
                x1={branchX + 68} y1={by}
                x2={leafX - 66} y2={ly}
                stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"
              />
            );
          });
        })}

        {/* Root node */}
        <rect x={rootX - 56} y={rootY - 22} width={112} height={44} rx={10}
          fill={GOLD} />
        <text x={rootX} y={rootY - 4} textAnchor="middle" fill="#000" fontSize="10" fontWeight="800" dominantBaseline="middle">
          {center.length > 18 ? center.slice(0, 16) + "…" : center}
        </text>
        <Sparkle cx={rootX} cy={rootY + 9} />

        {/* Branch nodes + leaves */}
        {branches.map((branch, bi) => {
          const by = branchYs[bi];
          const count = branch.nodes.length;
          const leafSpacing = Math.min(48, (H - 60) / Math.max(count, 1));
          return (
            <g key={`branch-${bi}`}>
              {/* Branch box */}
              <rect x={branchX - 68} y={by - 18} width={136} height={36} rx={8}
                fill={`${GOLD}20`} stroke={`${GOLD}55`} strokeWidth="1" />
              <text x={branchX} y={by + 1} textAnchor="middle" fill={GOLD} fontSize="10" fontWeight="700" dominantBaseline="middle">
                {branch.label.length > 19 ? branch.label.slice(0, 17) + "…" : branch.label}
              </text>

              {/* Leaf nodes */}
              {branch.nodes.map((node, ni) => {
                const ly = by + (ni - (count - 1) / 2) * leafSpacing;
                return (
                  <g key={`leaf-${bi}-${ni}`}>
                    <rect x={leafX - 66} y={ly - 15} width={132} height={30} rx={6}
                      fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
                    <text x={leafX} y={ly + 1} textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize="9.5" dominantBaseline="middle">
                      {node.length > 20 ? node.slice(0, 18) + "…" : node}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Sparkle({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 5},${cy - 5})`}>
      <polygon points="5,0 6.2,3.8 10,3.8 6.9,6.2 8.1,10 5,7.6 1.9,10 3.1,6.2 0,3.8 3.8,3.8"
        fill="rgba(0,0,0,0.3)" />
    </g>
  );
}
