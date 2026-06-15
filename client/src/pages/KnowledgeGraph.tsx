import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  nodeType: string;
  title: string;
  viralScore?: number;
  funnelStage?: string;
  platform?: string;
  tags?: string[];
  color?: string;
  x?: number;
  y?: number;
}

interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: string;
  strength?: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export default function KnowledgeGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<any>(null);

  // Fetch graph data
  useEffect(() => {
    fetch('/api/knowledge-graph')
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph:', err);
        setLoading(false);
      });
  }, []);

  // Render D3 graph
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Filter nodes based on search and type
    let filteredNodes = graphData.nodes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (filterType !== 'all') {
      filteredNodes = filteredNodes.filter(n => n.nodeType === filterType);
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graphData.edges.filter(e => 
      filteredNodeIds.has(e.sourceId) && filteredNodeIds.has(e.targetId)
    );

    // Create simulation
    const simulation = d3.forceSimulation(filteredNodes as any)
      .force('link', d3.forceLink(filteredEdges).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Create container group
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Color scale for node types
    const colorScale = d3.scaleOrdinal()
      .domain(['content', 'hook', 'topic', 'competitor', 'brand_voice', 'project', 'idea', 'note'])
      .range(['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1']);

    // Funnel stage colors
    const funnelColors: Record<string, string> = {
      top: '#3b82f6',
      middle: '#f59e0b',
      bottom: '#ef4444'
    };

    // Draw edges
    const links = g.append('g')
      .selectAll('line')
      .data(filteredEdges)
      .join('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d: any) => (d.strength || 0.5) * 2);

    // Draw nodes
    const nodes = g.append('g')
      .selectAll('circle')
      .data(filteredNodes)
      .join('circle')
      .attr('r', (d: any) => {
        const baseSize = 8;
        const scoreBonus = (d.viralScore || 0) / 2;
        return Math.max(baseSize, Math.min(baseSize + scoreBonus, 25));
      })
      .attr('fill', (d: any) => {
        if (d.color) return d.color;
        if (d.funnelStage) return funnelColors[d.funnelStage] || colorScale(d.nodeType);
        return colorScale(d.nodeType) as string;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      )
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    // Add labels
    const labels = g.append('g')
      .selectAll('text')
      .data(filteredNodes)
      .join('text')
      .text((d: any) => d.title.slice(0, 20))
      .attr('font-size', 10)
      .attr('fill', '#9ca3af')
      .attr('text-anchor', 'middle')
      .attr('dy', -15)
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, searchQuery, filterType]);

  // Migrate existing content to graph
  const handleMigrate = async () => {
    try {
      const res = await fetch('/api/knowledge-graph/migrate', { method: 'POST' });
      const data = await res.json();
      alert(`Success! Migrated ${data.nodes_created} nodes and ${data.edges_created} edges`);
      // Reload graph
      const graphRes = await fetch('/api/knowledge-graph');
      const graphData = await graphRes.json();
      setGraphData(graphData);
    } catch (err) {
      alert('Migration failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Loading knowledge graph...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Knowledge Graph</h2>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 rounded mb-4 text-sm"
        />

        {/* Filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Filter by Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded text-sm"
          >
            <option value="all">All Types</option>
            <option value="content">Content</option>
            <option value="hook">Hooks</option>
            <option value="topic">Topics</option>
            <option value="competitor">Competitors</option>
            <option value="brand_voice">Brand Voice</option>
            <option value="project">Projects</option>
            <option value="idea">Ideas</option>
            <option value="note">Notes</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <div className="text-xs text-gray-400 mb-1">Total Nodes</div>
          <div className="text-2xl font-bold">{graphData.nodes.length}</div>
        </div>

        <div className="mb-4 p-3 bg-gray-700 rounded">
          <div className="text-xs text-gray-400 mb-1">Connections</div>
          <div className="text-2xl font-bold">{graphData.edges.length}</div>
        </div>

        {/* Migrate Button */}
        {graphData.nodes.length === 0 && (
          <button
            onClick={handleMigrate}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
          >
            Import Existing Data
          </button>
        )}

        {/* Legend */}
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Node Types</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Content (TOFU)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Content (MOFU)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Content (BOFU)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Hooks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Topics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Competitors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ background: '#111827' }}
        />
      </div>

      {/* Right Sidebar - Node Details */}
      {selectedNode && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold">{selectedNode.title}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Type</div>
              <div className="text-sm capitalize">{selectedNode.nodeType}</div>
            </div>

            {selectedNode.viralScore !== undefined && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Viral Score</div>
                <div className="text-sm">{selectedNode.viralScore}/10</div>
              </div>
            )}

            {selectedNode.funnelStage && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Funnel Stage</div>
                <div className="text-sm capitalize">{selectedNode.funnelStage}</div>
              </div>
            )}

            {selectedNode.platform && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Platform</div>
                <div className="text-sm capitalize">{selectedNode.platform}</div>
              </div>
            )}

            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => window.open(`/api/knowledge-graph/node/${selectedNode.id}`, '_blank')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
            >
              View Full Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
