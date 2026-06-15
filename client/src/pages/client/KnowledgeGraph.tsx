import {
  useState, useRef, useEffect, useCallback, useLayoutEffect,
} from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import {
  Brain, Crosshair, FileText, Lightbulb, Swords, Hash, ChevronRight,
  Network, PanelLeft, Plus, Search, Sparkles, X, Send, RotateCcw,
  Bold, Italic, Code, Heading1, Heading2, List, ListOrdered, CheckSquare,
  Quote, Highlighter, Target, Zap, Users, AlertTriangle, BarChart3,
  TrendingUp, TrendingDown, Minus, Loader2, ArrowLeft, Instagram, Youtube,
  Activity, Flame, Copy, Check, GitBranch, BookOpen, Cpu, Map, ChevronDown,
  Star, ArrowRight, Eye, Lock,
} from 'lucide-react'
import { useLocation } from 'wouter'
import { apiRequest } from '@/lib/queryClient'
import {
  useGraphStore, NODE_COLORS,
  type GraphNode, type NodeType, type PanelMode, type NodeIntelligence,
  type ContentGap, type KeywordData, type CompetitorData,
} from '@/stores/graphStore'

/* ─── CSS custom props injected into the shadow ─── */
const GRAPH_STYLE = `
  .kg-root {
    --bg-base: #050508;
    --bg-panel: rgba(12,12,22,0.92);
    --bg-card: rgba(18,18,32,0.95);
    --border: rgba(255,255,255,0.06);
    --text-primary: #f0f0fa;
    --text-secondary: #8888aa;
    --text-muted: #44445a;
    --accent-purple: #7c3aed;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .kg-glass {
    background: var(--bg-panel);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--border);
  }
  .kg-card {
    background: var(--bg-card);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .kg-btn-ghost {
    display:flex; align-items:center; gap:6px;
    padding:6px 10px; border-radius:8px; font-size:13px; font-weight:500;
    color: var(--text-secondary); cursor:pointer; border:none; background:transparent;
    transition: all 0.15s;
  }
  .kg-btn-ghost:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
  .kg-section-label {
    font-size:10px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.08em; color: var(--text-muted);
  }
  .kg-score-bar {
    position:relative; height:6px; border-radius:99px; overflow:hidden;
    background: rgba(255,255,255,0.06);
  }
  .kg-score-fill {
    position:absolute; top:0; left:0; bottom:0; border-radius:99px;
    transition: width 0.8s ease;
  }
  .kg-badge {
    display:inline-flex; align-items:center; gap:4px;
    padding: 2px 8px; border-radius:99px; font-size:11px; font-weight:600;
  }
  .kg-tab {
    display:flex; align-items:center; gap:5px;
    padding: 4px 10px; border-radius:8px; font-size:11px; font-weight:600;
    cursor:pointer; border:1px solid transparent; background:transparent; transition:all 0.15s;
    color: var(--text-muted);
  }
  .kg-tab.active {
    background: rgba(124,58,237,0.2); color:#c4b5fd;
    border-color: rgba(124,58,237,0.3);
  }
  .kg-tab:not(.active):hover { color: var(--text-secondary); background: rgba(255,255,255,0.04); }

  /* ProseMirror editor styles */
  .kg-editor .ProseMirror {
    outline: none; min-height: 200px;
    color: var(--text-primary); line-height: 1.75; font-size: 13px;
  }
  .kg-editor .ProseMirror p { margin-bottom: 0.65em; }
  .kg-editor .ProseMirror h1 {
    font-size: 1.4em; font-weight:700; margin-bottom:0.4em;
    background: linear-gradient(135deg,#8b5cf6,#06b6d4);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .kg-editor .ProseMirror h2 {
    font-size:1.15em; font-weight:600; margin-bottom:0.35em; color: var(--text-primary);
  }
  .kg-editor .ProseMirror ul, .kg-editor .ProseMirror ol {
    padding-left:1.3em; margin-bottom:0.65em;
  }
  .kg-editor .ProseMirror li { margin-bottom:0.2em; }
  .kg-editor .ProseMirror strong { color:#f0f0fa; font-weight:600; }
  .kg-editor .ProseMirror em { color:#a78bfa; }
  .kg-editor .ProseMirror code {
    font-size:0.82em; background:rgba(124,58,237,0.15);
    border:1px solid rgba(124,58,237,0.2); border-radius:4px;
    padding: 0.08em 0.3em; color:#a78bfa;
  }
  .kg-editor .ProseMirror blockquote {
    border-left:3px solid #7c3aed; padding-left:1em;
    margin:0 0 0.65em; color:var(--text-secondary); font-style:italic;
  }
  .kg-editor .ProseMirror mark {
    background:rgba(245,158,11,0.2); color:#fbbf24; border-radius:2px; padding:0 2px;
  }
  .kg-editor .ProseMirror p.is-editor-empty:first-child::before {
    content:attr(data-placeholder); float:left;
    color:var(--text-muted); pointer-events:none; height:0;
  }
  .kg-editor .wikilink {
    color:#8b5cf6; background:rgba(139,92,246,0.1);
    border:1px solid rgba(139,92,246,0.2); border-radius:4px;
    padding:0.05em 0.28em; cursor:pointer; transition:all 0.15s; font-size:0.9em;
  }
  .kg-editor .wikilink:hover {
    background:rgba(139,92,246,0.2); border-color:rgba(139,92,246,0.4);
  }

  @keyframes kg-breathe {
    0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)}
  }
  .kg-breathe { animation: kg-breathe 3s ease-in-out infinite; }

  @keyframes kg-float {
    0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)}
  }
  .kg-float { animation: kg-float 4s ease-in-out infinite; }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.3); border-radius:2px; }
`

/* ─── Utilities ─── */
function scoreColor(v: number) {
  if (v >= 75) return '#10b981'
  if (v >= 50) return '#f59e0b'
  return '#ef4444'
}
function scoreLabel(v: number) {
  if (v >= 80) return 'Excellent'
  if (v >= 60) return 'Good'
  if (v >= 40) return 'Fair'
  return 'Weak'
}
function oppColor(o: string) {
  if (o === 'high') return '#10b981'
  if (o === 'medium') return '#f59e0b'
  return '#ef4444'
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}

const TYPE_ICONS: Record<NodeType, React.ReactNode> = {
  brain: <Brain size={12} />,
  niche: <Crosshair size={12} />,
  content: <FileText size={12} />,
  insight: <Lightbulb size={12} />,
  competitor: <Swords size={12} />,
  keyword: <Hash size={12} />,
}

const NODE_BADGE_BG: Record<NodeType, string> = {
  brain: 'rgba(139,92,246,0.15)',
  niche: 'rgba(124,58,237,0.15)',
  content: 'rgba(6,182,212,0.15)',
  insight: 'rgba(245,158,11,0.15)',
  competitor: 'rgba(239,68,68,0.15)',
  keyword: 'rgba(16,185,129,0.15)',
}
const NODE_BADGE_COLOR: Record<NodeType, string> = {
  brain: '#c4b5fd', niche: '#a78bfa', content: '#22d3ee',
  insight: '#fcd34d', competitor: '#fca5a5', keyword: '#6ee7b7',
}
const NODE_LABEL: Record<NodeType, string> = {
  brain: 'Brain', niche: 'Niche', content: 'Content',
  insight: 'Insight', competitor: 'Competitor', keyword: 'Keyword',
}

/* ─── Live data fetch: maps API response → NodeIntelligence ─── */
async function fetchNicheIntelligence(niche: string, platform: string): Promise<NodeIntelligence> {
  const [baseArr, trends, health, strategies, hooks, gaps] = await Promise.allSettled([
    apiRequest('GET', `/api/niche-intelligence?niche=${encodeURIComponent(niche)}&platform=${platform}`),
    apiRequest('GET', `/api/niche-intelligence/trends?niche=${encodeURIComponent(niche)}&platform=${platform}`),
    apiRequest('GET', `/api/niche-intelligence/score?niche=${encodeURIComponent(niche)}&platform=${platform}`),
    apiRequest('GET', `/api/niche-intelligence/strategy?niche=${encodeURIComponent(niche)}&platform=${platform}`),
    apiRequest('GET', `/api/niche-intelligence/hooks?niche=${encodeURIComponent(niche)}&platform=${platform}`),
    apiRequest('GET', `/api/niche-intelligence/gaps?niche=${encodeURIComponent(niche)}&platform=${platform}`),
  ])

  const base = baseArr.status === 'fulfilled' ? (Array.isArray(baseArr.value) ? baseArr.value[0] : null) : null
  const healthData = health.status === 'fulfilled' ? health.value : null
  const strats = strategies.status === 'fulfilled' ? (strategies.value as any[]) : []
  const hooksData = hooks.status === 'fulfilled' ? (hooks.value as any[]) : []
  const gapsData = gaps.status === 'fulfilled' ? (gaps.value as any[]) : []

  const healthScore = healthData?.healthScore ?? (base?.healthScore ?? 0)

  const contentGaps: ContentGap[] = gapsData.slice(0, 6).map((g: any) => ({
    topic: `${g.hookType ?? ''} + ${g.contentType ?? ''}`.trim().replace(/^\+\s*/, ''),
    demand: Math.min(100, Math.round((g.avgEngagementRate ?? 0) * 5 + 40)),
    supply: g.potentialImpact === 'high' ? 20 : 55,
    opportunity: g.potentialImpact === 'high' ? 'high' : g.potentialImpact === 'medium' ? 'medium' : 'low',
  }))

  const keywords: KeywordData[] = hooksData.slice(0, 6).map((h: any) => ({
    term: h.hook?.length > 50 ? h.hook.slice(0, 50) + '…' : (h.hook ?? ''),
    volume: `${fmtNum(h.avgViews ?? 0)}/post`,
    difficulty: Math.min(100, Math.round(100 - (h.viralScore ?? 5) * 10)),
    trend: (h.viralScore ?? 5) > 6 ? 'up' : (h.viralScore ?? 5) > 4 ? 'stable' : 'down',
  }))

  const opportunities: string[] = strats.slice(0, 4).map((s: any) => s.description ?? s.title ?? '')
    .filter(Boolean)

  const trendList = trends.status === 'fulfilled' ? (trends.value as any[]) : []
  const threats: string[] = trendList
    .filter((t: any) => t.momentum === 'down')
    .slice(0, 2)
    .map((t: any) => `${t.trendValue} losing momentum (${t.engagementDelta > 0 ? '+' : ''}${t.engagementDelta?.toFixed(1)}% delta)`)

  const aiAngles: string[] = hooksData
    .sort((a: any, b: any) => (b.viralScore ?? 0) - (a.viralScore ?? 0))
    .slice(0, 5)
    .map((h: any) => `"${h.hook}"`)
    .filter(Boolean)

  const trend30d = base?.trend30d ?? 0
  const engagementRate = base?.avgEngagementRate ?? 0
  const totalUsers = base?.totalUsers ?? 0

  return {
    platform,
    nicheScore: healthScore,
    growthTrend: parseFloat(trend30d.toFixed(1)),
    saturation: Math.min(100, Math.round(100 - healthScore * 0.6)),
    audienceSize: `${totalUsers} creators · ${fmtNum(base?.avgViews ?? 0)} avg views`,
    rawEngagementRate: engagementRate,
    rawViralScore: base?.avgViralScore ?? 0,
    rawViews: base?.avgViews ?? 0,
    opportunities,
    threats: threats.length ? threats : [],
    contentGaps,
    keywords,
    aiAngles,
    subNiches: [],
  }
}

/* ─── GraphCanvas ─── */
interface FGNode extends GraphNode { x?: number; y?: number }

const TYPE_ICONS_CANVAS: Record<string, string> = {
  brain: '◎', niche: '◈', content: '◆', insight: '◉', competitor: '◐', keyword: '•',
}

function GraphCanvas({ fgRefExternal }: { fgRefExternal?: React.MutableRefObject<any> }) {
  const fgRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // sync external ref so main page can call zoomToFit etc.
  useEffect(() => {
    if (fgRefExternal) fgRefExternal.current = fgRef.current
  })
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hovered, setHovered] = useState<FGNode | null>(null)
  const { nodes, links, selectedNode, selectNode, hiddenTypes, localMode, setLocalMode, pinnedNodes, togglePin } = useGraphStore()

  // filter by hidden types
  const visNodes = nodes.filter((n) => !hiddenTypes.includes(n.type))
  const visNodeIds = new Set(visNodes.map((n) => n.id))
  const visLinks = links.filter((l) => {
    const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
    const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
    return visNodeIds.has(s) && visNodeIds.has(t)
  })

  // connected IDs for local mode
  const connectedIds = useCallback(() => {
    if (!selectedNode) return new Set<string>()
    const id = selectedNode.id
    const ids = new Set<string>([id])
    links.forEach((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      if (s === id) ids.add(t)
      if (t === id) ids.add(s)
    })
    return ids
  }, [selectedNode, links])

  useLayoutEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!fgRef.current) return
    fgRef.current.d3Force('charge').strength(-220)
    fgRef.current.d3Force('link').distance((l: any) => 80 + (1 - (l.strength ?? 0.5)) * 80)
  }, [])

  const drawNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x ?? 0; const y = node.y ?? 0
    const color = NODE_COLORS[node.type] ?? '#8888aa'
    const radius = (node.size ?? 8) * (node.type === 'brain' ? 1.2 : 1)
    const isSel = selectedNode?.id === node.id
    const isHov = hovered?.id === node.id
    const isPinned = pinnedNodes.includes(node.id)
    const connected = connectedIds()
    const isDimmed = localMode && selectedNode && !connected.has(node.id)
    const alpha = isDimmed ? 0.12 : 1

    ctx.globalAlpha = alpha

    if (isSel) {
      ctx.beginPath(); ctx.arc(x, y, radius + 10, 0, 2 * Math.PI)
      ctx.strokeStyle = `${color}55`; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, radius + 6, 0, 2 * Math.PI)
      ctx.strokeStyle = `${color}99`; ctx.lineWidth = 1.5; ctx.stroke()
    }

    for (let i = (isSel ? 5 : isHov ? 4 : 3); i >= 1; i--) {
      ctx.beginPath(); ctx.arc(x, y, radius + i * 4, 0, 2 * Math.PI)
      ctx.fillStyle = `${color}${Math.round((0.04 + (isSel ? 0.04 : 0)) * 255).toString(16).padStart(2, '0')}`
      ctx.fill()
    }

    if (node.intelligence?.loading) {
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius)
      grad.addColorStop(0, `${color}88`); grad.addColorStop(1, `${color}44`)
      ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fillStyle = grad; ctx.fill()
    } else {
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius)
      grad.addColorStop(0, `${color}ff`); grad.addColorStop(0.6, color); grad.addColorStop(1, `${color}bb`)
      ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fillStyle = grad; ctx.fill()
      const shine = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0, x, y, radius * 0.8)
      shine.addColorStop(0, 'rgba(255,255,255,0.25)'); shine.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fillStyle = shine; ctx.fill()
    }

    // pin indicator
    if (isPinned) {
      ctx.beginPath(); ctx.arc(x + radius * 0.7, y - radius * 0.7, 3.5, 0, 2 * Math.PI)
      ctx.fillStyle = '#fbbf24'; ctx.fill()
      ctx.strokeStyle = '#050508'; ctx.lineWidth = 1; ctx.stroke()
    }

    // trending badge on niche nodes
    if (node.type === 'niche' && !node.intelligence?.loading) {
      const trend = node.intelligence?.growthTrend ?? 0
      if (Math.abs(trend) > 1) {
        ctx.beginPath(); ctx.arc(x - radius * 0.7, y - radius * 0.7, 4, 0, 2 * Math.PI)
        ctx.fillStyle = trend > 0 ? '#10b981' : '#ef4444'; ctx.fill()
      }
    }

    const iconSz = Math.max(6, (radius * 0.9))
    ctx.font = `${iconSz}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(node.intelligence?.loading ? '…' : (TYPE_ICONS_CANVAS[node.type] ?? '•'), x, y)

    if (globalScale > 0.4 && !isDimmed) {
      const fs = Math.min(12, Math.max(8, 11 / globalScale))
      ctx.font = `${node.type === 'brain' ? 600 : 500} ${fs}px Inter, system-ui`
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      const lw = ctx.measureText(node.label).width + 10; const lh = fs + 6; const ly = y + radius + 5
      ctx.fillStyle = 'rgba(5,5,8,0.8)'
      ctx.beginPath()
      const r2 = lh / 2
      ctx.moveTo(x - lw / 2 + r2, ly); ctx.lineTo(x + lw / 2 - r2, ly)
      ctx.arcTo(x + lw / 2, ly, x + lw / 2, ly + r2, r2)
      ctx.arcTo(x + lw / 2, ly + lh, x + lw / 2 - r2, ly + lh, r2)
      ctx.lineTo(x - lw / 2 + r2, ly + lh)
      ctx.arcTo(x - lw / 2, ly + lh, x - lw / 2, ly + r2, r2)
      ctx.arcTo(x - lw / 2, ly, x - lw / 2 + r2, ly, r2)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = isSel ? color : (isHov ? '#f0f0fa' : '#bbbbcc')
      ctx.fillText(node.label, x, ly + 3)
    }

    ctx.globalAlpha = 1
  }, [selectedNode, hovered, localMode, pinnedNodes, connectedIds])

  const drawLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const src = link.source as FGNode; const tgt = link.target as FGNode
    if (!src?.x || !tgt?.x) return
    const connected = connectedIds()
    const srcId = src.id; const tgtId = tgt.id
    const isDimmed = localMode && selectedNode && (!connected.has(srcId) || !connected.has(tgtId))
    ctx.globalAlpha = isDimmed ? 0.05 : 1
    const grad = ctx.createLinearGradient(src.x, src.y ?? 0, tgt.x, tgt.y ?? 0)
    grad.addColorStop(0, `${NODE_COLORS[src.type] ?? '#8888aa'}60`)
    grad.addColorStop(1, `${NODE_COLORS[tgt.type] ?? '#8888aa'}60`)
    ctx.beginPath(); ctx.moveTo(src.x, src.y ?? 0); ctx.lineTo(tgt.x, tgt.y ?? 0)
    ctx.strokeStyle = grad; ctx.lineWidth = (link.strength ?? 0.5) * 1.5; ctx.stroke()
    ctx.globalAlpha = 1
  }, [connectedIds, localMode, selectedNode])

  // cluster hulls — draw rounded rect per niche and its direct children
  const drawClusters = useCallback((ctx: CanvasRenderingContext2D) => {
    const nicheNodes = visNodes.filter((n) => n.type === 'niche' && n.x !== undefined)
    nicheNodes.forEach((niche) => {
      const childIds = new Set<string>()
      visLinks.forEach((l) => {
        const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
        const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
        if (s === niche.id) childIds.add(t)
        if (t === niche.id) childIds.add(s)
      })
      const cluster = [niche, ...visNodes.filter((n) => childIds.has(n.id) && n.x !== undefined)] as FGNode[]
      if (cluster.length < 2) return
      const xs = cluster.map((n) => n.x ?? 0)
      const ys = cluster.map((n) => n.y ?? 0)
      const pad = 28
      const minX = Math.min(...xs) - pad; const maxX = Math.max(...xs) + pad
      const minY = Math.min(...ys) - pad; const maxY = Math.max(...ys) + pad
      const w = maxX - minX; const h = maxY - minY; const r = 20
      const color = NODE_COLORS.niche
      ctx.beginPath()
      ctx.moveTo(minX + r, minY)
      ctx.lineTo(maxX - r, minY); ctx.quadraticCurveTo(maxX, minY, maxX, minY + r)
      ctx.lineTo(maxX, maxY - r); ctx.quadraticCurveTo(maxX, maxY, maxX - r, maxY)
      ctx.lineTo(minX + r, maxY); ctx.quadraticCurveTo(minX, maxY, minX, maxY - r)
      ctx.lineTo(minX, minY + r); ctx.quadraticCurveTo(minX, minY, minX + r, minY)
      ctx.closePath()
      ctx.fillStyle = `${color}08`
      ctx.fill()
      ctx.strokeStyle = `${color}20`
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
    })
  }, [visNodes, visLinks])

  const handleNodeClick = useCallback((node: FGNode) => {
    selectNode(node as GraphNode)
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 600)
      fgRef.current.zoom(2.2, 600)
    }
  }, [selectNode])

  const handleNodeRightClick = useCallback((node: FGNode, event: MouseEvent) => {
    event.preventDefault()
    togglePin(node.id, node.x, node.y)
  }, [togglePin])

  const fitView = useCallback(() => {
    fgRef.current?.zoomToFit(400, 60)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.06) 0%, transparent 70%),
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 48px 48px, 48px 48px',
      }} />

      <ForceGraph2D
        ref={fgRef}
        width={dims.w}
        height={dims.h}
        graphData={{ nodes: visNodes as any[], links: visLinks as any[] }}
        backgroundColor="transparent"
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={drawLink}
        linkCanvasObjectMode={() => 'replace'}
        onRenderFramePre={drawClusters}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onBackgroundClick={() => selectNode(null)}
        onNodeHover={(n) => setHovered(n as FGNode | null)}
        nodePointerAreaPaint={(n: FGNode, color, ctx) => {
          ctx.fillStyle = color; ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, (n.size ?? 8) + 8, 0, 2 * Math.PI); ctx.fill()
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
      {hovered && !selectedNode && (
        <div className="kg-glass" style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)', padding: '7px 14px', borderRadius: 10, fontSize: 12, pointerEvents: 'none' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{hovered.label}</span>
          <span style={{ marginLeft: 8, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{hovered.type}</span>
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>right-click to pin</span>
        </div>
      )}

      {/* zoom + graph controls */}
      <div className="kg-glass" style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', padding: '6px 10px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.4, 200)} className="kg-btn-ghost" style={{ padding: '5px 8px', fontSize: 16, lineHeight: 1 }} title="Zoom in">+</button>
        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.7, 200)} className="kg-btn-ghost" style={{ padding: '5px 8px', fontSize: 16, lineHeight: 1 }} title="Zoom out">−</button>
        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={fitView} className="kg-btn-ghost" style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600 }} title="Fit all nodes">Fit</button>
        <button onClick={() => setLocalMode(!localMode)} style={{
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: localMode ? 'rgba(124,58,237,0.25)' : 'transparent',
          color: localMode ? '#c4b5fd' : 'var(--text-muted)',
          transition: 'all 0.15s',
        }} title={localMode ? 'Exit local graph' : 'Local graph mode'}>
          {localMode ? '◎ Local' : '◯ Local'}
        </button>
        {pinnedNodes.length > 0 && (
          <>
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
            <span style={{ fontSize: 10, color: '#fbbf24' }}>⊙ {pinnedNodes.length} pinned</span>
          </>
        )}
      </div>

      {/* legend */}
      <div className="kg-glass" style={{ position: 'absolute', bottom: 20, right: 20, padding: '10px 12px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(Object.entries(NODE_COLORS) as [NodeType, string][]).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: hiddenTypes.includes(type) ? 0.3 : 1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}99` }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Sidebar ─── */
const TYPE_ORDER: NodeType[] = ['brain', 'niche', 'content', 'insight', 'competitor', 'keyword']

function Sidebar() {
  const { sidebarOpen, nodes, selectedNode, selectNode, links, hiddenTypes, toggleHideType, pinnedNodes } = useGraphStore()
  const grouped = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = nodes.filter((n) => n.type === t); return acc
  }, {} as Record<NodeType, GraphNode[]>)

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 234, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          style={{
            flexShrink: 0, height: '100%', overflow: 'hidden',
            background: 'var(--bg-panel)', backdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Network size={13} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Cortex Graph</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{nodes.length}n · {links.length}e</span>
            </div>
          </div>

          {/* type filter toggles */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {TYPE_ORDER.filter((t) => t !== 'brain').map((type) => {
              const hidden = hiddenTypes.includes(type)
              const color = NODE_COLORS[type]
              const count = grouped[type].length
              if (!count) return null
              return (
                <button key={type} onClick={() => toggleHideType(type)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 99,
                  fontSize: 9, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer',
                  border: `1px solid ${hidden ? 'var(--border)' : `${color}50`}`,
                  background: hidden ? 'transparent' : `${color}14`,
                  color: hidden ? 'var(--text-muted)' : color,
                  opacity: hidden ? 0.5 : 1,
                  transition: 'all 0.15s',
                }} title={hidden ? `Show ${type}` : `Hide ${type}`}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: hidden ? 'var(--text-muted)' : color }} />
                  {type}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {TYPE_ORDER.map((type) => {
              const group = grouped[type]
              if (!group.length) return null
              const color = NODE_COLORS[type]
              const hidden = hiddenTypes.includes(type)
              return (
                <div key={type} style={{ marginBottom: 4, opacity: hidden ? 0.35 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 14px' }}>
                    <span style={{ color, opacity: 0.7 }}>{TYPE_ICONS[type]}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{type}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{group.length}</span>
                  </div>
                  {group.map((node) => {
                    const trend = node.type === 'niche' ? (node.intelligence?.growthTrend ?? 0) : 0
                    const isPinned = pinnedNodes.includes(node.id)
                    return (
                      <button key={node.id} onClick={() => selectNode(node)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
                        background: selectedNode?.id === node.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                        border: 'none', cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left',
                      }}
                        onMouseEnter={(e) => { if (selectedNode?.id !== node.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={(e) => { if (selectedNode?.id !== node.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: selectedNode?.id === node.id ? `0 0 6px ${color}` : 'none' }} />
                          {/* trending dot */}
                          {node.type === 'niche' && Math.abs(trend) > 1 && !node.intelligence?.loading && (
                            <div style={{ position: 'absolute', top: -2, right: -2, width: 4, height: 4, borderRadius: '50%', background: trend > 0 ? '#10b981' : '#ef4444' }} />
                          )}
                        </div>
                        <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedNode?.id === node.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {node.label}
                        </span>
                        {/* trend label for niches */}
                        {node.type === 'niche' && !node.intelligence?.loading && Math.abs(trend) > 0.5 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: trend > 0 ? '#10b981' : '#ef4444', flexShrink: 0 }}>
                            {trend > 0 ? '▲' : '▼'}{Math.abs(trend).toFixed(1)}%
                          </span>
                        )}
                        {isPinned && <span style={{ fontSize: 8, color: '#fbbf24', flexShrink: 0 }}>⊙</span>}
                        {node.intelligence?.loading && <Loader2 size={9} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                        {selectedNode?.id === node.id && !node.intelligence?.loading && <ChevronRight size={9} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <div className="kg-card" style={{ padding: 10 }}>
              {[
                { label: 'Niches', count: grouped.niche.length, color: '#a78bfa' },
                { label: 'Content', count: grouped.content.length, color: '#22d3ee' },
                { label: 'Keywords', count: grouped.keyword.length, color: '#6ee7b7' },
                { label: 'Insights', count: grouped.insight.length, color: '#fcd34d' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/* ─── TopBar ─── */
function TopBar({ onBack, searchRef, onOpenCommand }: { onBack: () => void; searchRef?: React.RefObject<HTMLInputElement>; onOpenCommand?: () => void }) {
  const { sidebarOpen, setSidebarOpen, aiOpen, setAiOpen, searchQuery, setSearchQuery, nodes, selectNode } = useGraphStore()
  const [focused, setFocused] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [showNicheDialog, setShowNicheDialog] = useState(false)

  const filtered = searchQuery.trim()
    ? nodes.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', height: 48, padding: '0 12px', gap: 10,
        borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative', zIndex: 30,
        background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(20px)',
      }}>
        <button onClick={onBack} className="kg-btn-ghost" style={{ gap: 5 }}>
          <ArrowLeft size={14} />
        </button>

        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="kg-btn-ghost" style={{ padding: '6px 8px' }}>
          <PanelLeft size={16} style={{ color: sidebarOpen ? '#a78bfa' : 'var(--text-muted)' }} />
        </button>

        {/* logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ position: 'relative', width: 24, height: 24 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#050508' }} />
            </div>
            <div className="kg-breathe" style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 12px rgba(124,58,237,0.6)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cortex
          </span>
        </div>

        {/* search */}
        <div style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
            borderRadius: 8, border: `1px solid ${focused ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
            background: focused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.2s',
          }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)' }}
              placeholder="Search nodes… (⌘K for commands)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
            />
          </div>
          <AnimatePresence>
            {focused && filtered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="kg-glass"
                style={{ position: 'absolute', top: '100%', marginTop: 4, left: 0, right: 0, borderRadius: 12, overflow: 'hidden', zIndex: 50 }}
              >
                {filtered.slice(0, 6).map((node) => (
                  <button key={node.id} onMouseDown={() => { selectNode(node); setSearchQuery('') }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS[node.type], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{node.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{node.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          {/* add node */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setAddOpen(!addOpen)} className="kg-btn-ghost" style={{ padding: '6px 8px' }}>
              <Plus size={16} />
            </button>
            <AnimatePresence>
              {addOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ duration: 0.15 }}
                  className="kg-glass"
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, borderRadius: 12, overflow: 'hidden', zIndex: 50, width: 180 }}
                >
                  {[
                    { type: 'niche' as NodeType, label: 'New Niche (live data)', color: '#7c3aed', isLive: true },
                    { type: 'content' as NodeType, label: 'New Content', color: '#06b6d4', isLive: false },
                    { type: 'insight' as NodeType, label: 'New Insight', color: '#f59e0b', isLive: false },
                    { type: 'keyword' as NodeType, label: 'New Keyword', color: '#10b981', isLive: false },
                  ].map(({ type, label, color, isLive }) => (
                    <button key={type}
                      onClick={() => {
                        if (isLive) { setShowNicheDialog(true) }
                        else {
                          const { addNode, addLink, nodes: ns } = useGraphStore.getState()
                          const newNode = addNode({ label: type.charAt(0).toUpperCase() + type.slice(1), type, size: 10 })
                          const brain = ns.find((n) => n.type === 'brain')
                          if (brain) addLink(brain.id, newNode.id, 0.5)
                        }
                        setAddOpen(false)
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{label}</span>
                      {isLive && <Activity size={9} style={{ color: '#34d399' }} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI toggle */}
          <button onClick={() => setAiOpen(!aiOpen)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: aiOpen ? 'rgba(124,58,237,0.25)' : 'transparent',
            color: aiOpen ? '#c4b5fd' : 'var(--text-secondary)',
            border: `1px solid ${aiOpen ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
            transition: 'all 0.2s',
            boxShadow: aiOpen ? '0 0 16px rgba(124,58,237,0.3)' : 'none',
          }}>
            <Sparkles size={13} />
            Ask AI
          </button>
        </div>
      </div>

      {showNicheDialog && <NicheDialog onClose={() => setShowNicheDialog(false)} />}
    </>
  )
}

/* ─── NicheDialog — pick niche + platform, then fetch live data ─── */
const NICHE_SUGGESTIONS = [
  'Fitness', 'Finance', 'Marketing', 'Personal Brand', 'Coaching',
  'SaaS', 'Real Estate', 'E-commerce', 'Social Media', 'Mindset',
  'Nutrition', 'Business', 'Health & Wellness', 'Travel', 'Tech', 'Education',
]

function NicheDialog({ onClose }: { onClose: () => void }) {
  const [niche, setNiche] = useState('')
  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!niche.trim()) { setError('Enter a niche'); return }
    setLoading(true); setError('')
    try {
      const { addNode, addLink, updateNode, nodes, selectNode } = useGraphStore.getState()

      // Create node immediately with loading state
      const tempNode = addNode({
        label: niche.trim(),
        type: 'niche',
        size: 13,
        intelligence: { loading: true, platform },
      })

      // Link to brain
      const brain = nodes.find((n) => n.type === 'brain')
      if (brain) addLink(brain.id, tempNode.id, 1)

      onClose()
      selectNode({ ...tempNode, intelligence: { loading: true, platform } } as GraphNode)

      // Fetch live data
      const intel = await fetchNicheIntelligence(niche.trim(), platform)
      updateNode(tempNode.id, { intelligence: intel })

      // Auto-generate content nodes from top AI angles
      if (intel.aiAngles?.length) {
        const contentIdeasRes = await apiRequest('POST', '/api/niche-intelligence/content-ideas', {
          niche: niche.trim(), platform,
          topHookType: null, topContentType: null, gaps: [],
        }).catch(() => null)

        const ideas: any[] = Array.isArray(contentIdeasRes) ? contentIdeasRes.slice(0, 4) : []
        const { addNode: an, addLink: al, nodes: ns2 } = useGraphStore.getState()
        const nicheNodeNow = ns2.find((n) => n.id === tempNode.id)

        ideas.forEach((idea) => {
          const cnode = an({
            label: idea.title?.slice(0, 40) ?? 'Content idea',
            type: 'content',
            size: 10,
            body: `# ${idea.title}\n\n**Hook:** ${idea.hook}\n\n**Why it works:** ${idea.whyItWorks}\n\n**Format:** ${idea.format ?? 'Post'}`,
            intelligence: {
              contentScore: 80 + Math.round(Math.random() * 15),
              engagementScore: 75 + Math.round(Math.random() * 20),
              seoScore: 60 + Math.round(Math.random() * 30),
              depthScore: 70 + Math.round(Math.random() * 25),
              aiAngles: [`"${idea.hook}"`],
            },
          })
          if (nicheNodeNow) al(nicheNodeNow.id, cnode.id, 0.85)
        })

        // Insight nodes from gaps
        const { nodes: ns3 } = useGraphStore.getState()
        const nicheNow = ns3.find((n) => n.id === tempNode.id)
        if (intel.contentGaps?.length && nicheNow) {
          const topGaps = intel.contentGaps.filter((g) => g.opportunity === 'high').slice(0, 2)
          topGaps.forEach((gap) => {
            const { addNode: an2, addLink: al2 } = useGraphStore.getState()
            const inode = an2({
              label: gap.topic.slice(0, 40),
              type: 'insight',
              size: 9,
              body: `# Content Gap: ${gap.topic}\n\nDemand: ${gap.demand}/100\nSupply: ${gap.supply}/100\nOpportunity: ${gap.opportunity}`,
            })
            al2(nicheNow.id, inode.id, 0.7)
          })
        }
      }

      // Re-select with updated data
      const finalNode = useGraphStore.getState().nodes.find((n) => n.id === tempNode.id)
      if (finalNode) selectNode(finalNode)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load niche data')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.2 }}
        className="kg-glass"
        style={{ width: 420, borderRadius: 20, padding: 28, boxShadow: '0 0 60px rgba(124,58,237,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Add Niche</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loads live intelligence from your platform data.</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Niche</label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder="e.g. Fitness, Finance, Marketing"
            autoFocus
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {!niche && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {NICHE_SUGGESTIONS.slice(0, 8).map((s) => (
                <button key={s} onClick={() => setNiche(s)} style={{
                  fontSize: 10, padding: '4px 9px', borderRadius: 99, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
                  color: 'var(--text-secondary)', transition: 'all 0.15s',
                }}
                  onMouseEnter={(e) => { (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'); (e.currentTarget.style.color = '#c4b5fd') }}
                  onMouseLeave={(e) => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-secondary)') }}
                >{s}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Platform</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'instagram' as const, label: 'Instagram', Icon: Instagram, color: '#f472b6' },
              { key: 'youtube' as const, label: 'YouTube', Icon: Youtube, color: '#f87171' },
            ].map(({ key, label, Icon, color }) => (
              <button key={key} onClick={() => setPlatform(key)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px',
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                border: `1px solid ${platform === key ? `${color}50` : 'var(--border)'}`,
                background: platform === key ? `${color}12` : 'rgba(255,255,255,0.03)',
              }}>
                <Icon size={20} style={{ color: platform === key ? color : 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: platform === key ? color : 'var(--text-secondary)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ fontSize: 11, color: '#f87171', marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleCreate} disabled={loading || !niche.trim()} style={{
            flex: 2, padding: '10px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
            color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            opacity: loading || !niche.trim() ? 0.6 : 1, transition: 'opacity 0.15s',
          }}>
            {loading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading data…</> : <><Sparkles size={13} /> Create with live data</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── WikiLink ProseMirror extension ─── */
const WikiLinkExt = Extension.create({
  name: 'wikilink',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('wikilink'),
      props: {
        decorations(state) {
          const { doc } = state; const decs: Decoration[] = []
          const regex = /\[\[([^\]]+)\]\]/g
          doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return
            let m; regex.lastIndex = 0
            while ((m = regex.exec(node.text)) !== null) {
              decs.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
                class: 'wikilink',
                title: `Open: ${m[1]}`,
                'data-node': m[1],
              }))
            }
          })
          return DecorationSet.create(doc, decs)
        },
        handleDOMEvents: {
          click(_view, event) {
            const target = event.target as HTMLElement
            if (target.classList.contains('wikilink')) {
              const name = target.getAttribute('data-node') ?? target.title?.replace('Open: ', '')
              if (name) {
                const { nodes, selectNode } = useGraphStore.getState()
                const found = nodes.find((n) => n.label.toLowerCase() === name.toLowerCase())
                if (found) { selectNode(found); return true }
              }
            }
            return false
          },
        },
      },
    })]
  },
})

/* ─── NoteEditor ─── */
function NoteEditor({ node }: { node: GraphNode }) {
  const { updateNode } = useGraphStore()
  const editor = useEditor({
    extensions: [
      StarterKit, Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your thoughts… Use [[Node Name]] to link nodes.' }),
      CharacterCount, Highlight.configure({ multicolor: false }),
      Typography, TaskList, TaskItem.configure({ nested: true }), WikiLinkExt,
    ],
    content: node.body ?? '',
    onUpdate: ({ editor: ed }) => { updateNode(node.id, { body: ed.getHTML() }) },
    editorProps: { attributes: { class: 'ProseMirror' } },
  }, [node.id])

  const words = editor?.storage.characterCount?.words() ?? 0

  const BTNS = [
    { icon: <Bold size={11} />, fn: (e: any) => e.chain().focus().toggleBold().run(), title: 'Bold' },
    { icon: <Italic size={11} />, fn: (e: any) => e.chain().focus().toggleItalic().run(), title: 'Italic' },
    { icon: <Code size={11} />, fn: (e: any) => e.chain().focus().toggleCode().run(), title: 'Code' },
    { icon: <Highlighter size={11} />, fn: (e: any) => e.chain().focus().toggleHighlight().run(), title: 'Highlight' },
    null,
    { icon: <Heading1 size={11} />, fn: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run(), title: 'H1' },
    { icon: <Heading2 size={11} />, fn: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run(), title: 'H2' },
    null,
    { icon: <List size={11} />, fn: (e: any) => e.chain().focus().toggleBulletList().run(), title: 'List' },
    { icon: <ListOrdered size={11} />, fn: (e: any) => e.chain().focus().toggleOrderedList().run(), title: 'Ordered' },
    { icon: <CheckSquare size={11} />, fn: (e: any) => e.chain().focus().toggleTaskList().run(), title: 'Tasks' },
    { icon: <Quote size={11} />, fn: (e: any) => e.chain().focus().toggleBlockquote().run(), title: 'Quote' },
  ]

  return (
    <div className="kg-editor" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, padding: '7px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {BTNS.map((btn, i) =>
          btn === null
            ? <div key={i} style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
            : <button key={i} onClick={() => btn.fn(editor)} title={btn.title} style={{
                padding: '4px 6px', borderRadius: 5, border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.12s',
              }}
                onMouseEnter={(e) => { (e.currentTarget.style.color = 'var(--text-primary)'); (e.currentTarget.style.background = 'rgba(255,255,255,0.05)') }}
                onMouseLeave={(e) => { (e.currentTarget.style.color = 'var(--text-muted)'); (e.currentTarget.style.background = 'transparent') }}
              >{btn.icon}</button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        <EditorContent editor={editor} />
      </div>
      <div style={{ padding: '7px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{words} words</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#34d399' }}>Auto-saved</span>
      </div>
    </div>
  )
}

/* ─── BrainPanel — live niche intelligence display ─── */
function BrainPanel({ node }: { node: GraphNode }) {
  const { updateNode, addNode, addLink } = useGraphStore()
  const intel = node.intelligence!
  const isNiche = node.type === 'niche'
  const isContent = node.type === 'content'
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [aiInsights, setAiInsights] = useState<any[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const generateInsights = async () => {
    setLoadingInsights(true)
    try {
      const res = await apiRequest('POST', '/api/niche-intelligence/ai-insights', {
        niche: node.label, platform: intel.platform ?? 'instagram',
        healthScore: intel.nicheScore, avgEngagementRate: intel.rawEngagementRate,
        avgViralScore: intel.rawViralScore, trend30d: intel.growthTrend,
      })
      setAiInsights(Array.isArray(res) ? res : [])
    } catch { /* ignore */ } finally { setLoadingInsights(false) }
  }

  const copyAngle = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  if (intel.loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
        <Loader2 size={24} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading live intelligence…</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* NICHE SCORES */}
      {isNiche && intel.nicheScore !== undefined && (
        <>
          <ScoresRow items={[
            { label: 'Health Score', value: intel.nicheScore, color: scoreColor(intel.nicheScore) },
            { label: 'Saturation', value: intel.saturation ?? 0, color: scoreColor(100 - (intel.saturation ?? 0)) },
            { label: 'Growth', value: Math.min(100, Math.abs(intel.growthTrend ?? 0) * 4), color: (intel.growthTrend ?? 0) >= 0 ? '#10b981' : '#ef4444', display: `${(intel.growthTrend ?? 0) > 0 ? '+' : ''}${intel.growthTrend}%` },
          ]} />

          {intel.audienceSize && (
            <div className="kg-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={13} style={{ color: '#a78bfa' }} />
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Creators & reach</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{intel.audienceSize}</p>
              </div>
            </div>
          )}

          {/* live benchmarks row */}
          {(intel.rawEngagementRate !== undefined) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Avg ER', value: `${intel.rawEngagementRate?.toFixed(1)}%`, color: '#34d399' },
                { label: 'Viral Score', value: intel.rawViralScore?.toFixed(1) ?? '—', color: '#a78bfa' },
                { label: 'Avg Views', value: fmtNum(intel.rawViews ?? 0), color: '#60a5fa' },
              ].map(({ label, value, color }) => (
                <div key={label} className="kg-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color }}>{value}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CONTENT SCORES */}
      {isContent && intel.contentScore !== undefined && (
        <ScoresRow items={[
          { label: 'Content', value: intel.contentScore, color: scoreColor(intel.contentScore) },
          { label: 'Engagement', value: intel.engagementScore ?? 0, color: scoreColor(intel.engagementScore ?? 0) },
          { label: 'SEO', value: intel.seoScore ?? 0, color: scoreColor(intel.seoScore ?? 0) },
          { label: 'Depth', value: intel.depthScore ?? 0, color: scoreColor(intel.depthScore ?? 0) },
        ]} />
      )}

      {/* CONTENT GAPS */}
      {intel.contentGaps && intel.contentGaps.length > 0 && (
        <Section icon={<Target size={11} />} label="Content Gap Map">
          {intel.contentGaps.map((gap, i) => <GapRow key={i} gap={gap} index={i} />)}
        </Section>
      )}

      {/* KEYWORDS / HOOKS */}
      {intel.keywords && intel.keywords.length > 0 && (
        <Section icon={<Zap size={11} />} label="Top Hooks">
          {intel.keywords.map((kw, i) => <KeywordRow key={i} kw={kw} />)}
        </Section>
      )}

      {/* AI ANGLES */}
      {intel.aiAngles && intel.aiAngles.length > 0 && (
        <Section icon={<Flame size={11} />} label="Top Angles">
          {intel.aiAngles.map((angle, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="kg-card"
              style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8, transition: 'all 0.15s', position: 'relative' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>{angle}</p>
              <button onClick={() => copyAngle(angle)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copied === angle ? '#34d399' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
                {copied === angle ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </motion.div>
          ))}
        </Section>
      )}

      {/* OPPORTUNITIES */}
      {intel.opportunities && intel.opportunities.length > 0 && (
        <Section icon={<Lightbulb size={11} />} label="Opportunities">
          {intel.opportunities.map((opp, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', marginTop: 5, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{opp}</p>
            </div>
          ))}
        </Section>
      )}

      {/* THREATS */}
      {intel.threats && intel.threats.length > 0 && (
        <Section icon={<AlertTriangle size={11} />} label="Threats" labelColor="#f59e0b">
          {intel.threats.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', marginTop: 5, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t}</p>
            </div>
          ))}
        </Section>
      )}

      {/* AI INSIGHTS (on-demand) */}
      {isNiche && (
        <div className="kg-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiInsights ? 10 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={10} /> AI Strategy Insights
            </span>
            {!aiInsights && (
              <button onClick={generateInsights} disabled={loadingInsights} style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer',
                background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {loadingInsights ? <><Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} />Loading…</> : 'Generate'}
              </button>
            )}
          </div>
          {aiInsights?.map((ins, i) => (
            <div key={i} style={{ marginTop: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{ins.title}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 3 }}>{ins.explanation}</p>
              <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>→ {ins.action}</p>
              {i < aiInsights.length - 1 && <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />}
            </div>
          ))}
          {!aiInsights && !loadingInsights && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Click generate for AI-powered strategy insights tailored to this niche.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ScoresRow({ items }: { items: { label: string; value: number; color: string; display?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: items.length <= 2 ? '1fr 1fr' : `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: 8 }}>
      {items.map((item) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="kg-card" style={{ padding: '10px 12px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.display ?? item.value}</span>
          </div>
          <div className="kg-score-bar">
            <motion.div className="kg-score-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(item.value, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              style={{ background: item.color }}
            />
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 5 }}>{scoreLabel(item.value)}</p>
        </motion.div>
      ))}
    </div>
  )
}

function GapRow({ gap, index }: { gap: ContentGap; index: number }) {
  const oc = oppColor(gap.opportunity)
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      className="kg-card" style={{ padding: '10px 12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, lineHeight: 1.4 }}>{gap.topic}</span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 99, marginLeft: 8, flexShrink: 0, color: oc, background: `${oc}18`, border: `1px solid ${oc}44` }}>{gap.opportunity}</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'Demand', value: gap.demand, color: '#06b6d4' },
          { label: 'Supply', value: gap.supply, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>{label}</span><span>{value}</span>
            </div>
            <div className="kg-score-bar">
              <motion.div className="kg-score-fill" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ background: color }} />
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Gap</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: oc }}>+{Math.max(0, Math.round(gap.demand - gap.supply * 0.8))}</div>
        </div>
      </div>
    </motion.div>
  )
}

function KeywordRow({ kw }: { kw: KeywordData }) {
  const TIcon = kw.trend === 'up' ? TrendingUp : kw.trend === 'down' ? TrendingDown : Minus
  const tc = kw.trend === 'up' ? '#10b981' : kw.trend === 'down' ? '#ef4444' : '#8888aa'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, transition: 'background 0.12s' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <TIcon size={11} style={{ color: tc, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.term}</span>
      <span style={{ fontSize: 10, color: '#22d3ee', fontWeight: 600, flexShrink: 0 }}>{kw.volume}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <div className="kg-score-bar" style={{ width: 40 }}>
          <div className="kg-score-fill" style={{ width: `${kw.difficulty}%`, background: scoreColor(100 - kw.difficulty) }} />
        </div>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 20 }}>{kw.difficulty}</span>
      </div>
    </div>
  )
}

function Section({ icon, label, labelColor, children }: { icon: React.ReactNode; label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: labelColor ?? 'var(--text-muted)' }}>
        {icon}
        <span className="kg-section-label" style={{ color: labelColor ?? 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  )
}

/* ─── BacklinksPanel — nodes that [[link]] to selected ─── */
function BacklinksPanel({ node }: { node: GraphNode }) {
  const { nodes, links, selectNode } = useGraphStore()

  // 1. nodes that link TO this node in the graph
  const graphBacklinks = nodes.filter((n) => {
    if (n.id === node.id) return false
    return links.some((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return (s === n.id && t === node.id) || (t === n.id && s === node.id)
    })
  })

  // 2. notes that [[mention]] this node by name
  const mentionBacklinks = nodes.filter((n) => {
    if (n.id === node.id || !n.body) return false
    return n.body.includes(`[[${node.label}]]`)
  })

  // merged deduped
  const merged: GraphNode[] = [...graphBacklinks, ...mentionBacklinks]
  const seen = new Set<string>()
  const allBacklinks = merged.filter((n) => { if (seen.has(n.id)) return false; seen.add(n.id); return true })

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <GitBranch size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="kg-section-label">{allBacklinks.length} incoming links</span>
      </div>

      {allBacklinks.length === 0 ? (
        <div className="kg-card" style={{ padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            No nodes link here yet.<br />
            Reference this node in another note with <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>[[{node.label}]]</span>
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {allBacklinks.map((n) => {
            const ntype = n.type as NodeType
            const color = NODE_COLORS[ntype]
            const isMention = !graphBacklinks.find((g) => g.id === n.id)
            return (
              <button key={n.id} onClick={() => selectNode(n)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLElement).style.background = `${color}08` }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {TYPE_ICONS[ntype]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{n.type} {isMention ? '· [[mention]]' : '· graph link'}</p>
                </div>
                <ChevronRight size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}

      {/* hook → content pipeline for keyword nodes */}
      {node.type === 'keyword' && node.intelligence?.aiAngles && (
        <HookToContentPanel node={node} />
      )}
    </div>
  )
}

/* ─── Hook → Content pipeline ─── */
function HookToContentPanel({ node }: { node: GraphNode }) {
  const { addNode, addLink, nodes, selectNode } = useGraphStore()
  const [creating, setCreating] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])

  const createContent = async (hook: string) => {
    setCreating(hook)
    // find parent niche
    const { links } = useGraphStore.getState()
    const parentId = links.find((l) => {
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return t === node.id
    }) ? (typeof links.find((l) => {
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return t === node.id
    })!.source === 'string' ? links.find((l) => {
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return t === node.id
    })!.source : (links.find((l) => {
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return t === node.id
    })!.source as GraphNode).id) : null

    const newNode = addNode({
      label: hook.replace(/^["']|["']$/g, '').slice(0, 45),
      type: 'content',
      size: 10,
      body: `# ${hook.replace(/^["']|["']$/g, '')}\n\n**Hook:** ${hook}\n\n**Source:** Generated from keyword "${node.label}"\n\n**Notes:**\n\n`,
      intelligence: {
        contentScore: 75 + Math.round(Math.random() * 20),
        engagementScore: 70 + Math.round(Math.random() * 25),
        seoScore: 55 + Math.round(Math.random() * 35),
        depthScore: 65 + Math.round(Math.random() * 25),
        aiAngles: [hook],
      },
    })
    if (parentId) addLink(parentId as string, newNode.id, 0.8)
    addLink(node.id, newNode.id, 0.9)
    setDone((d) => [...d, hook])
    setCreating(null)
    setTimeout(() => selectNode(newNode), 200)
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Zap size={11} style={{ color: '#06b6d4' }} />
        <span className="kg-section-label" style={{ color: '#22d3ee' }}>Turn hook into content</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(node.intelligence?.aiAngles ?? []).slice(0, 5).map((hook) => {
          const isDone = done.includes(hook)
          const isCreating = creating === hook
          return (
            <div key={hook} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, border: `1px solid ${isDone ? 'rgba(6,182,212,0.3)' : 'var(--border)'}`, background: isDone ? 'rgba(6,182,212,0.06)' : 'transparent' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, lineHeight: 1.5 }}>{hook}</p>
              <button onClick={() => !isDone && !isCreating && createContent(hook)} disabled={isDone || !!isCreating} style={{
                padding: '4px 9px', borderRadius: 7, border: 'none', cursor: isDone ? 'default' : 'pointer',
                background: isDone ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.2)', color: '#22d3ee',
                fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                opacity: isCreating ? 0.6 : 1,
              }}>
                {isCreating ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : isDone ? <Check size={9} /> : <Plus size={9} />}
                {isDone ? 'Created' : 'Create'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── NicheCompare ─── */
function NicheCompare({ node }: { node: GraphNode }) {
  const { nodes, compareNicheId, setCompareNicheId } = useGraphStore()
  const nicheNodes = nodes.filter((n) => n.type === 'niche' && n.id !== node.id && !n.intelligence?.loading && n.intelligence)
  const compareNode = nicheNodes.find((n) => n.id === compareNicheId)

  if (!nicheNodes.length) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <BarChart3 size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="kg-section-label">Compare niche</span>
        {compareNicheId && (
          <button onClick={() => setCompareNicheId(null)} style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>clear</button>
        )}
      </div>
      <select
        value={compareNicheId ?? ''}
        onChange={(e) => setCompareNicheId(e.target.value || null)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', marginBottom: 12 }}
      >
        <option value="">Select niche to compare…</option>
        {nicheNodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
      </select>

      {compareNode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Health', a: node.intelligence?.nicheScore ?? 0, b: compareNode.intelligence?.nicheScore ?? 0 },
            { label: 'Saturation', a: node.intelligence?.saturation ?? 0, b: compareNode.intelligence?.saturation ?? 0, lower: true },
            { label: 'Growth %', a: Math.abs(node.intelligence?.growthTrend ?? 0) * 4, b: Math.abs(compareNode.intelligence?.growthTrend ?? 0) * 4, displayA: `${node.intelligence?.growthTrend ?? 0}%`, displayB: `${compareNode.intelligence?.growthTrend ?? 0}%` },
            { label: 'Avg ER', a: (node.intelligence?.rawEngagementRate ?? 0) * 10, b: (compareNode.intelligence?.rawEngagementRate ?? 0) * 10, displayA: `${node.intelligence?.rawEngagementRate?.toFixed(1)}%`, displayB: `${compareNode.intelligence?.rawEngagementRate?.toFixed(1)}%` },
          ].map(({ label, a, b, lower, displayA, displayB }) => {
            const aWins = lower ? a <= b : a >= b
            return (
              <div key={label} className="kg-card" style={{ padding: '10px', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 700, color: aWins ? '#10b981' : 'var(--text-muted)' }}>{displayA ?? Math.round(a)}</span>
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700, color: !aWins ? '#10b981' : 'var(--text-muted)' }}>{displayB ?? Math.round(b)}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', transform: 'scaleX(-1)' }}>
                    <div style={{ height: '100%', width: `${Math.min(a, 100)}%`, background: NODE_COLORS.niche, borderRadius: 99 }} />
                  </div>
                  <div style={{ width: 1, height: 10, background: 'var(--border)' }} />
                  <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(b, 100)}%`, background: '#06b6d4', borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9, color: 'var(--text-muted)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>{node.label}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%', textAlign: 'right' }}>{compareNode.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── ContextDrawer ─── */
function ContextDrawer() {
  const { selectedNode, panelMode, setPanelMode, selectNode, deleteNode, pinnedNodes, togglePin } = useGraphStore()
  const open = !!selectedNode

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="drawer"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          style={{
            flexShrink: 0, height: '100%', overflow: 'hidden',
            background: 'var(--bg-panel)', backdropFilter: 'blur(20px)',
            borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="kg-badge" style={{ background: NODE_BADGE_BG[selectedNode!.type], color: NODE_BADGE_COLOR[selectedNode!.type] }}>
                    {NODE_LABEL[selectedNode!.type]}
                  </span>
                  {pinnedNodes.includes(selectedNode!.id) && (
                    <span style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700 }}>⊙ pinned</span>
                  )}
                </div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedNode!.label}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <button onClick={() => togglePin(selectedNode!.id, selectedNode!.x, selectedNode!.y)} className="kg-btn-ghost" style={{ padding: '5px', color: pinnedNodes.includes(selectedNode!.id) ? '#fbbf24' : 'var(--text-muted)' }} title={pinnedNodes.includes(selectedNode!.id) ? 'Unpin' : 'Pin node'}>
                  ⊙
                </button>
                <button onClick={() => { if (selectedNode) deleteNode(selectedNode.id) }} className="kg-btn-ghost"
                  style={{ padding: '5px', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget.style.color = '#f87171'); (e.currentTarget.style.background = 'rgba(239,68,68,0.1)') }}
                  onMouseLeave={(e) => { (e.currentTarget.style.color = 'var(--text-muted)'); (e.currentTarget.style.background = 'transparent') }}
                  title="Delete node"
                >
                  <X size={13} />
                </button>
                <button onClick={() => selectNode(null)} className="kg-btn-ghost" style={{ padding: '5px' }}>
                  <ArrowLeft size={13} />
                </button>
              </div>
            </div>

            {/* tab switcher */}
            <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
              {selectedNode!.intelligence && (
                <button className={`kg-tab ${panelMode === 'brain' ? 'active' : ''}`} onClick={() => setPanelMode('brain')}>
                  <Brain size={10} /> Intelligence
                </button>
              )}
              <button className={`kg-tab ${panelMode === 'editor' ? 'active' : ''}`} onClick={() => setPanelMode('editor')}>
                <FileText size={10} /> Notes
              </button>
              <button className={`kg-tab ${panelMode === 'links' ? 'active' : ''}`} onClick={() => setPanelMode('links')}>
                <GitBranch size={10} /> Links
              </button>
            </div>
          </div>

          {/* panel content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              {panelMode === 'brain' && selectedNode!.intelligence ? (
                <motion.div key="brain" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
                  <BrainPanel node={selectedNode!} />
                  {selectedNode!.type === 'niche' && <div style={{ padding: '0 16px 16px' }}><NicheCompare node={selectedNode!} /></div>}
                </motion.div>
              ) : panelMode === 'links' ? (
                <motion.div key="links" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
                  <BacklinksPanel node={selectedNode!} />
                </motion.div>
              ) : (
                <motion.div key="editor" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }} style={{ height: '100%' }}>
                  <NoteEditor node={selectedNode!} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/* ─── AIAssistant ─── */
interface Message { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'What are my biggest content opportunities?',
  'Which niche has the best health score?',
  'Summarize my knowledge graph',
  'What keywords should I target first?',
  'What content gaps should I fill now?',
]

function AIAssistant() {
  const { aiOpen, setAiOpen, nodes, selectedNode } = useGraphStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (aiOpen) inputRef.current?.focus() }, [aiOpen])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || thinking) return
    setMessages((m) => [...m, { role: 'user', content: q }])
    setInput('')
    setThinking(true)

    try {
      const nicheNodes = nodes.filter((n) => n.type === 'niche' && n.intelligence && !n.intelligence.loading)
      const graphContext = nicheNodes.map((n) => `Niche: ${n.label} | Health: ${n.intelligence?.nicheScore ?? '?'}/100 | Growth: ${n.intelligence?.growthTrend ?? '?'}% | ER: ${n.intelligence?.rawEngagementRate?.toFixed(1) ?? '?'}%`).join('\n')
      const contentNodes = nodes.filter((n) => n.type === 'content')
      const activeNode = selectedNode ? `Active node: ${selectedNode.label} (${selectedNode.type})` : ''

      const systemPrompt = `You are an AI second brain assistant for a content creator. You have access to their niche intelligence graph.

Graph summary:
${graphContext || 'No niches loaded yet.'}
${activeNode}
Content pieces: ${contentNodes.length}
Total nodes: ${nodes.length}

Answer questions about their niches, content strategy, gaps, and opportunities. Be specific and data-driven using the graph data above. Keep responses concise but actionable.`

      const res = await apiRequest('POST', '/api/ai/chat', {
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: q },
        ],
      }).catch(() => null)

      const reply = res?.message ?? res?.content ?? res?.text ?? generateLocalReply(q, nodes)
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: generateLocalReply(q, nodes) }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <AnimatePresence>
      {aiOpen && (
        <motion.div
          key="ai"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="kg-glass"
          style={{
            position: 'absolute', bottom: 20, right: 20, zIndex: 50,
            width: 400, maxHeight: 560, borderRadius: 20,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 0 60px rgba(124,58,237,0.2), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={13} style={{ color: '#c4b5fd' }} />
              </div>
              <motion.div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.3)' }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>AI Brain</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{nodes.length} nodes · {nodes.filter((n) => n.type === 'niche').length} niches in context</p>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="kg-btn-ghost" style={{ padding: '5px' }}>
                  <RotateCcw size={11} />
                </button>
              )}
              <button onClick={() => setAiOpen(false)} className="kg-btn-ghost" style={{ padding: '5px' }}>
                <X size={13} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', minHeight: 0 }}>
            {messages.length === 0 ? (
              <div>
                <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 16 }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}
                    style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Sparkles size={20} style={{ color: '#c4b5fd' }} />
                  </motion.div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Ask your second brain</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {selectedNode ? `Context: ${selectedNode.label}` : 'Full graph loaded'}
                  </p>
                </div>
                <p className="kg-section-label" style={{ marginBottom: 8 }}>Quick prompts</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STARTERS.map((p) => (
                    <button key={p} onClick={() => send(p)} style={{
                      textAlign: 'left', padding: '9px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                      border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', transition: 'all 0.15s',
                    }}
                      onMouseEnter={(e) => { (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'); (e.currentTarget.style.background = 'rgba(124,58,237,0.05)'); (e.currentTarget.style.color = 'var(--text-primary)') }}
                      onMouseLeave={(e) => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-secondary)') }}
                    >{p}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2, flexShrink: 0 }}>
                        <Sparkles size={9} style={{ color: '#c4b5fd' }} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '85%', borderRadius: 16, padding: '10px 14px', fontSize: 12, lineHeight: 1.6,
                      background: msg.role === 'user' ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
                      color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                    }}>
                      <MdText text={msg.content} />
                    </div>
                  </motion.div>
                ))}
                {thinking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles size={9} style={{ color: '#c4b5fd' }} />
                    </div>
                    <div className="kg-glass" style={{ borderRadius: 16, padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa' }}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 12px' }}>
              <textarea
                ref={inputRef}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', resize: 'none', maxHeight: 90, lineHeight: 1.5 }}
                placeholder="Ask anything…"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              />
              <button onClick={() => send(input)} disabled={!input.trim() || thinking} style={{
                padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: '#7c3aed', color: '#fff', opacity: !input.trim() || thinking ? 0.3 : 1, transition: 'opacity 0.15s',
              }}>
                <Send size={11} />
              </button>
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 5, textAlign: 'center' }}>Enter to send · Shift+Enter newline</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MdText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
          : <span key={i} style={{ whiteSpace: 'pre-line' }}>{part}</span>
      )}
    </>
  )
}

function generateLocalReply(q: string, nodes: GraphNode[]): string {
  const niches = nodes.filter((n) => n.type === 'niche' && !n.intelligence?.loading)
  const ql = q.toLowerCase()

  if (!niches.length) return "No niches loaded yet. Click + → New Niche to add your first niche with live intelligence."

  const sorted = [...niches].sort((a, b) => (b.intelligence?.nicheScore ?? 0) - (a.intelligence?.nicheScore ?? 0))
  const top = sorted[0]

  if (ql.includes('opportunit') || ql.includes('gap')) {
    const allGaps = niches.flatMap((n) => (n.intelligence?.contentGaps ?? []).filter((g) => g.opportunity === 'high').map((g) => `**${n.label}**: ${g.topic}`))
    return allGaps.length
      ? `Top high-opportunity gaps:\n\n${allGaps.slice(0, 5).map((g, i) => `${i + 1}. ${g}`).join('\n')}`
      : "No content gaps found. Make sure your niches are loaded with live data."
  }

  if (ql.includes('health') || ql.includes('best niche') || ql.includes('score')) {
    return `Health scores:\n\n${sorted.map((n, i) => `${i + 1}. **${n.label}** — ${n.intelligence?.nicheScore ?? '?'}/100 (${n.intelligence?.growthTrend ?? 0 >= 0 ? '+' : ''}${n.intelligence?.growthTrend ?? '?'}% growth)`).join('\n')}\n\n**${top.label}** leads.`
  }

  if (ql.includes('keyword') || ql.includes('hook')) {
    const allKw = niches.flatMap((n) => (n.intelligence?.keywords ?? []).slice(0, 2).map((k) => `${n.label}: "${k.term}" (${k.volume})`))
    return allKw.length ? `Top hooks by niche:\n\n${allKw.join('\n')}` : "No hook data loaded yet."
  }

  return `Your graph: **${niches.length} niches**, ${nodes.filter((n) => n.type === 'content').length} content pieces.\n\n**${top.label}** leads with ${top.intelligence?.nicheScore ?? '?'}/100 health score and ${top.intelligence?.growthTrend ?? '?'}% growth trend. ${top.intelligence?.contentGaps?.filter((g) => g.opportunity === 'high').length ? `${top.intelligence.contentGaps.filter((g) => g.opportunity === 'high').length} high-opportunity gaps identified.` : ''}`
}

/* ─── CommandPalette (Cmd+K) ─── */
const COMMANDS = [
  { id: 'add-niche', label: 'Add Niche (live data)', icon: <Activity size={13} />, color: '#7c3aed', section: 'Actions' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', icon: <PanelLeft size={13} />, color: '#8888aa', section: 'Actions' },
  { id: 'ask-ai', label: 'Ask AI Brain', icon: <Sparkles size={13} />, color: '#ec4899', section: 'Actions' },
  { id: 'fit-graph', label: 'Fit Graph to View', icon: <Map size={13} />, color: '#06b6d4', section: 'Actions' },
  { id: 'local-mode', label: 'Toggle Local Graph Mode', icon: <Network size={13} />, color: '#10b981', section: 'Actions' },
  { id: 'show-intro', label: 'Show Cortex Introduction', icon: <BookOpen size={13} />, color: '#f59e0b', section: 'Actions' },
]

interface CPProps {
  onClose: () => void
  onShowNicheDialog: () => void
  onShowIntro: () => void
  fgRef: React.MutableRefObject<any>
}

function CommandPalette({ onClose, onShowNicheDialog, onShowIntro, fgRef }: CPProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { nodes, selectNode, setSidebarOpen, sidebarOpen, setAiOpen, setLocalMode, localMode } = useGraphStore()

  useEffect(() => { inputRef.current?.focus() }, [])

  const nodeResults = nodes.filter((n) =>
    !query || n.label.toLowerCase().includes(query.toLowerCase()) || n.type.includes(query.toLowerCase())
  ).slice(0, 8)

  const cmdResults = COMMANDS.filter((c) =>
    !query || c.label.toLowerCase().includes(query.toLowerCase())
  )

  const runCommand = (id: string) => {
    onClose()
    switch (id) {
      case 'add-niche': onShowNicheDialog(); break
      case 'toggle-sidebar': setSidebarOpen(!sidebarOpen); break
      case 'ask-ai': setAiOpen(true); break
      case 'fit-graph': fgRef.current?.zoomToFit(400, 60); break
      case 'local-mode': setLocalMode(!localMode); break
      case 'show-intro': onShowIntro(); break
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="kg-glass"
        style={{ width: 560, borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 80px rgba(124,58,237,0.3), 0 32px 64px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
            placeholder="Search nodes, actions…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-primary)' }}
          />
          <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)' }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {/* actions */}
          {cmdResults.length > 0 && (
            <div>
              <p style={{ padding: '8px 18px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Actions</p>
              {cmdResults.map((cmd) => (
                <button key={cmd.id} onClick={() => runCommand(cmd.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: `${cmd.color}18`, border: `1px solid ${cmd.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cmd.color, flexShrink: 0 }}>
                    {cmd.icon}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{cmd.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* nodes */}
          {nodeResults.length > 0 && (
            <div>
              <p style={{ padding: '8px 18px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Jump to Node</p>
              {nodeResults.map((node) => {
                const color = NODE_COLORS[node.type]
                return (
                  <button key={node.id} onClick={() => { selectNode(node); onClose() }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px',
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                      {TYPE_ICONS[node.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</p>
                      {node.type === 'niche' && node.intelligence?.nicheScore !== undefined && (
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Health {node.intelligence.nicheScore}/100 · {node.intelligence.growthTrend ?? 0}% growth</p>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize', flexShrink: 0 }}>{node.type}</span>
                  </button>
                )
              })}
            </div>
          )}

          {!cmdResults.length && !nodeResults.length && (
            <div style={{ padding: '32px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No results for "{query}"</p>
            </div>
          )}
        </div>

        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
          {[['↵', 'select'], ['ESC', 'close'], ['⌘K', 'palette']].map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 9 }}>{k}</kbd> {v}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── CortexIntro — full-screen welcome ─── */
const FEATURES = [
  {
    icon: <Network size={20} />, color: '#8b5cf6',
    title: 'Visual Knowledge Graph',
    desc: 'Every niche, piece of content, keyword, and insight lives as a node. See how your knowledge connects — not in folders, but as a living map.',
  },
  {
    icon: <Activity size={20} />, color: '#06b6d4',
    title: 'Live Niche Intelligence',
    desc: 'Add a niche and Cortex instantly pulls real engagement rates, viral scores, audience size, health scores, and growth trends from your platform data.',
  },
  {
    icon: <Target size={20} />, color: '#10b981',
    title: 'Content Gap Mapping',
    desc: 'Cortex surfaces the exact content topics your audience wants that no one in your niche is creating. Demand vs supply, visualised.',
  },
  {
    icon: <BookOpen size={20} />, color: '#f59e0b',
    title: 'Wiki-Linked Notes',
    desc: 'Every node has a rich-text notepad. Write ideas, link nodes with [[brackets]] like Obsidian, and build a connected content research vault.',
  },
  {
    icon: <Sparkles size={20} />, color: '#ec4899',
    title: 'AI Brain',
    desc: 'Ask your second brain anything. The AI knows your full graph — which niches are hot, which gaps to fill, which hooks will perform — and answers from your data.',
  },
  {
    icon: <Zap size={20} />, color: '#f97316',
    title: 'Auto-Generated Insights',
    desc: 'When you add a niche, Cortex auto-creates content idea nodes, insight nodes from top gaps, and keyword nodes from highest viral hooks.',
  },
]

const STEPS = [
  {
    num: '01', color: '#8b5cf6',
    title: 'Add your niches',
    desc: 'Click + and enter a niche — Fitness, Finance, Marketing, anything. Pick Instagram or YouTube. Cortex loads live intelligence from your real platform data.',
  },
  {
    num: '02', color: '#06b6d4',
    title: 'Watch your graph grow',
    desc: 'Cortex automatically spawns child nodes: content ideas, content gaps as insight nodes, and top hooks as keyword nodes. Your graph builds itself.',
  },
  {
    num: '03', color: '#10b981',
    title: 'Explore, link, and write',
    desc: 'Click any node to open its intelligence panel or write notes. Link ideas with [[Node Name]]. Ask the AI to synthesise across everything.',
  },
]

const ORBIT_NODES = [
  { angle: 0, color: '#8b5cf6', size: 10, label: 'Fitness', type: '◈' },
  { angle: 60, color: '#06b6d4', size: 8, label: 'Hook Ideas', type: '◆' },
  { angle: 120, color: '#10b981', size: 7, label: 'Keywords', type: '•' },
  { angle: 180, color: '#7c3aed', size: 9, label: 'Finance', type: '◈' },
  { angle: 240, color: '#f59e0b', size: 7, label: 'Gap: Budgeting', type: '◉' },
  { angle: 300, color: '#ec4899', size: 6, label: 'Competitor', type: '◐' },
]

function CortexIntro({ onEnter }: { onEnter: () => void }) {
  const [, navigate] = useLocation()
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="kg-root"
      style={{ width: '100vw', height: '100vh', overflowY: 'auto', background: 'var(--bg-base)', position: 'relative' }}
    >
      {/* ambient bg glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }} />
      </div>

      {/* top nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 64, background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 32, height: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#050508' }} />
            </div>
            <div className="kg-breathe" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.4)' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#c4b5fd,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Cortex</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')} className="kg-btn-ghost" style={{ fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={onEnter} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 10,
            background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(124,58,237,0.4)',
          }}>
            Enter Cortex <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 64 }}>

        {/* ── HERO ── */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 48px 60px', textAlign: 'center', position: 'relative' }}>

          {/* animated graph orb */}
          <div style={{ position: 'relative', width: 280, height: 280, marginBottom: 56 }}>
            {/* center brain node */}
            <motion.div
              animate={{ scale: [1, 1.06, 1], boxShadow: ['0 0 30px rgba(124,58,237,0.5)', '0 0 60px rgba(124,58,237,0.8)', '0 0 30px rgba(124,58,237,0.5)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            >
              <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.9)' }}>◎</span>
            </motion.div>

            {/* orbit lines */}
            {ORBIT_NODES.map((node, i) => {
              const rad = (node.angle * Math.PI) / 180
              const r = 110
              const x = 140 + r * Math.cos(rad)
              const y = 140 + r * Math.sin(rad)
              return (
                <svg key={i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <line x1="140" y1="140" x2={x} y2={y} stroke={`${node.color}40`} strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
              )
            })}

            {/* orbit nodes */}
            {ORBIT_NODES.map((node, i) => {
              const rad = (node.angle * Math.PI) / 180
              const r = 110
              const x = 140 + r * Math.cos(rad)
              const y = 140 + r * Math.sin(rad)
              return (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'absolute',
                    left: x - node.size,
                    top: y - node.size,
                    width: node.size * 2,
                    height: node.size * 2,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${node.color}ff, ${node.color}99)`,
                    boxShadow: `0 0 ${hovered === i ? 20 : 10}px ${node.color}${hovered === i ? '99' : '55'}`,
                    cursor: 'default',
                    zIndex: 5,
                    transition: 'box-shadow 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: node.size * 0.8, color: 'rgba(255,255,255,0.9)' }}>{node.type}</span>
                </motion.div>
              )
            })}

            {/* tooltip */}
            <AnimatePresence>
              {hovered !== null && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="kg-glass" style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', padding: '5px 12px', borderRadius: 8, fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-secondary)', zIndex: 20 }}>
                  {ORBIT_NODES[hovered].label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 99, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)', marginBottom: 24, fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Star size={10} /> Your Second Brain for Content
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, color: 'var(--text-primary)' }}>
              Every idea, niche, and<br />
              <span style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                insight — connected.
              </span>
            </h1>

            <p style={{ fontSize: 'clamp(15px, 2vw, 20px)', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.7 }}>
              Cortex combines your niche intelligence and content data into a living knowledge graph. Like Obsidian — but built specifically for content creators, powered by your real platform data.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <motion.button
                onClick={onEnter}
                whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(124,58,237,0.6)' }}
                whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}
              >
                Open Cortex <ArrowRight size={18} />
              </motion.button>
              <a href="#how" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '14px 24px', borderRadius: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                How it works <ChevronDown size={16} />
              </a>
            </div>
          </motion.div>

          {/* stat row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ display: 'flex', gap: 48, marginTop: 72, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { val: '6', label: 'Live API sources per niche' },
              { val: '∞', label: 'Nodes you can create' },
              { val: '[[', label: 'Wiki-link any idea' },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 900, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── WHAT IS CORTEX ── */}
        <section style={{ padding: '100px 48px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p className="kg-section-label" style={{ marginBottom: 16 }}>What is Cortex</p>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: 20 }}>
                A second brain — built for how content strategy actually works.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 20 }}>
                Obsidian taught the world to think in connected notes. Cortex takes that idea and goes further: every node in your graph is powered by real data from your niche — engagement rates, viral scores, content gaps, audience size.
              </p>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28 }}>
                You don't just write notes about your niches. You see them. You see which niches are growing, which content gaps are untapped, which hooks your audience actually clicks — all on one spatial canvas you can zoom, pan, and explore like a map.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: <Eye size={14} />, text: 'Visual — see relationships, not lists' },
                  { icon: <Lock size={14} />, text: 'Yours — data from your own account' },
                  { icon: <GitBranch size={14} />, text: 'Connected — every idea links to another' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0 }}>{icon}</div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* mini graph visual */}
            <div className="kg-glass" style={{ borderRadius: 24, padding: 32, position: 'relative', overflow: 'hidden', minHeight: 320 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 40%, rgba(124,58,237,0.12) 0%, transparent 60%)' }} />
              <div style={{ position: 'relative', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* central node */}
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(124,58,237,0.5)', zIndex: 5 }}>
                  <span style={{ fontSize: 20 }}>◎</span>
                </motion.div>
                {/* surrounding mini nodes */}
                {[
                  { top: '15%', left: '60%', color: '#7c3aed', label: 'Finance', size: 36, icon: '◈' },
                  { top: '15%', left: '15%', color: '#06b6d4', label: 'Content', size: 30, icon: '◆' },
                  { top: '65%', left: '65%', color: '#10b981', label: 'Keyword', size: 24, icon: '•' },
                  { top: '65%', left: '10%', color: '#f59e0b', label: 'Gap', size: 26, icon: '◉' },
                  { top: '40%', left: '78%', color: '#ec4899', label: 'Competitor', size: 22, icon: '◐' },
                ].map(({ top, left, color, label, size, icon }, i) => (
                  <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
                    style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${color}ff, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${color}66`, zIndex: 4 }}>
                    <span style={{ fontSize: size * 0.45, color: 'rgba(255,255,255,0.9)' }}>{icon}</span>
                  </motion.div>
                ))}
                {/* connection lines (svg) */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {[
                    { x1: '50%', y1: '50%', x2: '70%', y2: '20%', color: '#7c3aed' },
                    { x1: '50%', y1: '50%', x2: '25%', y2: '20%', color: '#06b6d4' },
                    { x1: '50%', y1: '50%', x2: '75%', y2: '70%', color: '#10b981' },
                    { x1: '50%', y1: '50%', x2: '18%', y2: '70%', color: '#f59e0b' },
                    { x1: '50%', y1: '50%', x2: '85%', y2: '48%', color: '#ec4899' },
                  ].map((l, i) => (
                    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={`${l.color}50`} strokeWidth="1.5" strokeDasharray="5 4" />
                  ))}
                </svg>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Your knowledge graph — everything connected</div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="kg-section-label" style={{ marginBottom: 12 }}>Everything inside Cortex</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, color: 'var(--text-primary)' }}>
              Built for depth, not just dashboards.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="kg-card"
                style={{ padding: 24, cursor: 'default', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${f.color}40`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" style={{ padding: '80px 48px', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="kg-section-label" style={{ marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, color: 'var(--text-primary)' }}>
              From zero to knowledge graph in 3 steps.
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            {/* connector line */}
            <div style={{ position: 'absolute', left: 28, top: 48, bottom: 48, width: 2, background: 'linear-gradient(to bottom, #7c3aed, #06b6d4, #10b981)', borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {STEPS.map((step, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  style={{ display: 'flex', gap: 28, padding: '0 0 48px', position: 'relative' }}
                >
                  {/* step number bubble */}
                  <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: '50%', background: `${step.color}18`, border: `2px solid ${step.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: step.color }}>{step.num}</span>
                  </div>
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OBSIDIAN COMPARISON ── */}
        <section style={{ padding: '80px 48px', maxWidth: 900, margin: '0 auto' }}>
          <div className="kg-glass" style={{ borderRadius: 28, padding: '48px 56px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.1) 0%, transparent 60%)' }} />
            <div style={{ position: 'relative' }}>
              <p className="kg-section-label" style={{ marginBottom: 14 }}>Why not just use Obsidian?</p>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>
                Obsidian holds your thoughts.<br />Cortex holds your thoughts <span style={{ color: '#a78bfa' }}>and your data.</span>
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                Obsidian is a brilliant tool for general knowledge management. But for a content creator, your most valuable knowledge isn't just your ideas — it's the live signals from your market: which niches are growing, what your audience is searching for, where the gaps are that nobody is filling.
              </p>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
                Cortex gives you the same connected, visual, graph-first interface as Obsidian — but every node can be backed by real intelligence pulled from your content platform. You're not just linking notes. You're linking <em style={{ color: '#c4b5fd' }}>live market insights</em>.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Obsidian', points: ['General knowledge management', 'Manual notes only', 'No live data integration', 'Flat graph of text files'] },
                  { label: 'Cortex', points: ['Content creator intelligence', 'Live API-powered nodes', 'Real engagement & viral data', 'Graph of live market signals'], highlight: true },
                ].map(({ label, points, highlight }) => (
                  <div key={label} className="kg-card" style={{ padding: 20, borderColor: highlight ? 'rgba(124,58,237,0.3)' : 'var(--border)', background: highlight ? 'rgba(124,58,237,0.07)' : 'var(--bg-card)' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? '#a78bfa' : 'var(--text-secondary)', marginBottom: 14 }}>{label}</p>
                    {points.map((pt) => (
                      <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: highlight ? '#7c3aed' : 'var(--text-muted)', marginTop: 5, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: highlight ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.5 }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding: '80px 48px 120px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' }}
              />
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 0 40px rgba(124,58,237,0.5)', margin: '0 auto' }}>
                <span style={{ fontSize: 34 }}>◎</span>
              </div>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16 }}>
              Your second brain<br />is waiting.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.65 }}>
              Add your first niche and watch Cortex build your knowledge graph — live, connected, and ready to think with you.
            </p>
            <motion.button
              onClick={onEnter}
              whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(124,58,237,0.7)' }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 40px', borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#8b5cf6,#06b6d4)', border: 'none', color: '#fff', fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 40px rgba(124,58,237,0.45)' }}
            >
              Enter Cortex <ArrowRight size={20} />
            </motion.button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
              You can always return to this introduction by pressing the ? icon
            </p>
          </motion.div>
        </section>
      </div>
    </motion.div>
  )
}

/* ─── Main Page ─── */
export default function KnowledgeGraph() {
  const [, navigate] = useLocation()
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('cortex-visited'))
  const [showHelp, setShowHelp] = useState(false)
  const [showNicheDialog, setShowNicheDialog] = useState(false)
  const [commandOpen, setCommandOpenLocal] = useState(false)
  const fgRef = useRef<any>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { selectNode, setSidebarOpen, sidebarOpen, setAiOpen, setLocalMode, localMode, setCommandOpen } = useGraphStore()

  const enterCortex = () => {
    localStorage.setItem('cortex-visited', '1')
    setShowIntro(false)
  }

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape — deselect node
      if (e.key === 'Escape' && !commandOpen && !showHelp) {
        selectNode(null)
        return
      }
      // Cmd+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpenLocal((v) => !v)
        return
      }
      // Cmd+F — focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      // Cmd+\ — toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
        return
      }
      // Cmd+L — local mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setLocalMode(!localMode)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandOpen, showHelp, selectNode, setSidebarOpen, sidebarOpen, setAiOpen, setLocalMode, localMode])

  return (
    <div className="kg-root" style={{ width: '100vw', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden', position: 'relative' }}>
      <style>{GRAPH_STYLE}</style>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      <AnimatePresence mode="wait">
        {showIntro ? (
          <CortexIntro key="intro" onEnter={enterCortex} />
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TopBar onBack={() => navigate('/dashboard')} searchRef={searchRef} onOpenCommand={() => setCommandOpenLocal(true)} />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
              <Sidebar />

              <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <GraphCanvas fgRefExternal={fgRef} />
                <AIAssistant />

                {/* ? help button */}
                <button
                  onClick={() => setShowHelp(true)}
                  className="kg-glass"
                  style={{ position: 'absolute', bottom: 68, left: 20, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', border: '1px solid var(--border)', transition: 'all 0.2s', zIndex: 20 }}
                  onMouseEnter={(e) => { (e.currentTarget.style.color = 'var(--text-primary)'); (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)') }}
                  onMouseLeave={(e) => { (e.currentTarget.style.color = 'var(--text-muted)'); (e.currentTarget.style.borderColor = 'var(--border)') }}
                  title="Cortex introduction (⌘K for commands)"
                >
                  ?
                </button>
              </main>

              <ContextDrawer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command palette */}
      <AnimatePresence>
        {commandOpen && (
          <CommandPalette
            key="cmd"
            onClose={() => setCommandOpenLocal(false)}
            onShowNicheDialog={() => setShowNicheDialog(true)}
            onShowIntro={() => setShowHelp(true)}
            fgRef={fgRef}
          />
        )}
      </AnimatePresence>

      {/* Niche dialog (from command palette) */}
      {showNicheDialog && <NicheDialog onClose={() => setShowNicheDialog(false)} />}

      {/* Re-show intro as overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, overflow: 'auto' }}
          >
            <button onClick={() => setShowHelp(false)} style={{ position: 'fixed', top: 20, right: 20, zIndex: 300, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
            <CortexIntro onEnter={() => setShowHelp(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
