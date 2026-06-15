import type { BoardNode, BoardConnector } from "./types";

export interface LayoutResult {
  nodes: BoardNode[];
  connectors: BoardConnector[];
}

export function autoLayout(
  nodes: BoardNode[],
  connectors: BoardConnector[],
): LayoutResult {
  if (nodes.length === 0) return { nodes, connectors };

  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDeg.set(n.id, 0);
  }
  for (const c of connectors) {
    adj.get(c.fromId)?.push(c.toId);
    inDeg.set(c.toId, (inDeg.get(c.toId) ?? 0) + 1);
  }

  /* topological sort → layers */
  const layers: string[][] = [];
  let queue = [...nodes].filter(n => (inDeg.get(n.id) ?? 0) === 0).map(n => n.id);
  if (queue.length === 0) queue = [nodes[0].id];

  const visited = new Set<string>();
  while (queue.length > 0) {
    layers.push([...queue]);
    const next: string[] = [];
    for (const id of queue) {
      visited.add(id);
      for (const neighbor of adj.get(id) ?? []) {
        const d = (inDeg.get(neighbor) ?? 1) - 1;
        inDeg.set(neighbor, d);
        if (d <= 0 && !visited.has(neighbor)) next.push(neighbor);
      }
    }
    queue = next.filter(id => !visited.has(id));
  }

  const unvisited = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
  if (unvisited.length > 0) layers.push(unvisited);

  const GAP_X = 220;
  const GAP_Y = 160;
  const START_X = 80;
  const START_Y = 60;

  const maxInLayer = Math.max(...layers.map(l => l.length), 1);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const newNodes = nodes.map(n => {
    for (let li = 0; li < layers.length; li++) {
      const idx = layers[li].indexOf(n.id);
      if (idx !== -1) {
        const layerCenter = (layers[li].length - 1) / 2;
        const x = START_X + li * GAP_X;
        const y = START_Y + (idx - layerCenter) * GAP_Y;
        return { ...n, x: Math.round(x), y: Math.round(y) };
      }
    }
    return n;
  });

  return { nodes: newNodes, connectors };
}
