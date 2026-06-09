import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useStore } from '../../stores/useStore'
import { NODE_COLORS } from '../../data/seed'
import type { GraphNode, GraphLink } from '../../types'

interface FGNode extends GraphNode {
  x?: number
  y?: number
}

const TYPE_ICONS: Record<string, string> = {
  brain: '◎',
  niche: '◈',
  content: '◆',
  insight: '◉',
  competitor: '◐',
  keyword: '•',
}

export default function GraphCanvas() {
  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hoveredNode, setHoveredNode] = useState<FGNode | null>(null)

  const { nodes, links, selectedNode, selectNode } = useStore()

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-180)
      fgRef.current.d3Force('link').distance((l: GraphLink) => {
        const str = (l.strength ?? 0.5)
        return 80 + (1 - str) * 80
      })
    }
  }, [])

  const drawNode = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const color = NODE_COLORS[node.type] ?? '#8888aa'
      const radius = (node.size ?? 8) * (node.type === 'brain' ? 1.2 : 1)
      const isSelected = selectedNode?.id === node.id
      const isHovered = hoveredNode?.id === node.id

      // outer pulse ring for selected
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(x, y, radius + 10, 0, 2 * Math.PI)
        ctx.strokeStyle = `${color}55`
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x, y, radius + 6, 0, 2 * Math.PI)
        ctx.strokeStyle = `${color}99`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // glow layers
      const glowLayers = isSelected ? 5 : isHovered ? 4 : 3
      for (let i = glowLayers; i >= 1; i--) {
        ctx.beginPath()
        ctx.arc(x, y, radius + i * 4, 0, 2 * Math.PI)
        const alpha = Math.round((0.04 + (isSelected ? 0.04 : 0)) * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${color}${alpha}`
        ctx.fill()
      }

      // node body gradient
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius)
      grad.addColorStop(0, `${color}ff`)
      grad.addColorStop(0.6, color)
      grad.addColorStop(1, `${color}bb`)
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = grad
      ctx.fill()

      // inner shine
      const shine = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0, x, y, radius * 0.8)
      shine.addColorStop(0, 'rgba(255,255,255,0.25)')
      shine.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = shine
      ctx.fill()

      // icon
      const iconSize = Math.max(6, (radius * 0.9) / globalScale * globalScale)
      ctx.font = `${iconSize}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(TYPE_ICONS[node.type] ?? '•', x, y)

      // label
      if (globalScale > 0.4) {
        const fontSize = Math.min(12, Math.max(8, 11 / globalScale))
        ctx.font = `${node.type === 'brain' ? 600 : 500} ${fontSize}px Inter, system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        // label background pill
        const labelW = ctx.measureText(node.label).width + 10
        const labelH = fontSize + 6
        const labelY = y + radius + 5
        ctx.fillStyle = 'rgba(5, 5, 8, 0.75)'
        ctx.beginPath()
        const r = labelH / 2
        ctx.moveTo(x - labelW / 2 + r, labelY)
        ctx.lineTo(x + labelW / 2 - r, labelY)
        ctx.arcTo(x + labelW / 2, labelY, x + labelW / 2, labelY + r, r)
        ctx.arcTo(x + labelW / 2, labelY + labelH, x + labelW / 2 - r, labelY + labelH, r)
        ctx.lineTo(x - labelW / 2 + r, labelY + labelH)
        ctx.arcTo(x - labelW / 2, labelY + labelH, x - labelW / 2, labelY + r, r)
        ctx.arcTo(x - labelW / 2, labelY, x - labelW / 2 + r, labelY, r)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = isSelected ? color : (isHovered ? '#f0f0fa' : '#bbbbcc')
        ctx.fillText(node.label, x, labelY + 3)
      }
    },
    [selectedNode, hoveredNode]
  )

  const drawLink = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D) => {
      const src = link.source as FGNode
      const tgt = link.target as FGNode
      if (!src?.x || !tgt?.x) return

      const srcColor = NODE_COLORS[src.type] ?? '#8888aa'
      const tgtColor = NODE_COLORS[tgt.type] ?? '#8888aa'

      const grad = ctx.createLinearGradient(src.x, src.y ?? 0, tgt.x, tgt.y ?? 0)
      grad.addColorStop(0, `${srcColor}60`)
      grad.addColorStop(1, `${tgtColor}60`)

      ctx.beginPath()
      ctx.moveTo(src.x, src.y ?? 0)
      ctx.lineTo(tgt.x, tgt.y ?? 0)
      ctx.strokeStyle = grad
      ctx.lineWidth = (link.strength ?? 0.5) * 1.5
      ctx.stroke()
    },
    []
  )

  const handleNodeClick = useCallback(
    (node: FGNode) => {
      selectNode(node as GraphNode)
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 600)
        fgRef.current.zoom(2.2, 600)
      }
    },
    [selectNode]
  )

  const handleBackgroundClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.06) 0%, transparent 70%),
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      <ForceGraph2D
        ref={fgRef}
        width={dims.w}
        height={dims.h}
        graphData={{ nodes: nodes as any[], links: links as any[] }}
        backgroundColor="transparent"
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={drawLink}
        linkCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onNodeHover={(node) => setHoveredNode(node as FGNode | null)}
        nodePointerAreaPaint={(node: FGNode, color, ctx) => {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(node.x ?? 0, node.y ?? 0, (node.size ?? 8) + 8, 0, 2 * Math.PI)
          ctx.fill()
        }}
        cooldownTicks={120}
        enableZoomInteraction
        enablePanInteraction
        minZoom={0.3}
        maxZoom={6}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.4}
      />

      {/* hover tooltip */}
      {hoveredNode && !selectedNode && (
        <div
          className="absolute pointer-events-none glass rounded-lg px-3 py-2 text-xs"
          style={{
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            maxWidth: 220,
          }}
        >
          <span className="font-semibold text-white">{hoveredNode.label}</span>
          <span className="ml-2 text-[var(--text-muted)] capitalize">{hoveredNode.type}</span>
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-5 right-5 glass rounded-xl p-3 flex flex-col gap-2">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 6px ${color}99` }}
            />
            <span className="text-[10px] capitalize text-[var(--text-muted)]">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
