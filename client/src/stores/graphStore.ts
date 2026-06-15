import { create } from 'zustand'
import { nanoid } from 'nanoid'

export type NodeType = 'brain' | 'niche' | 'content' | 'insight' | 'competitor' | 'keyword'
export type PanelMode = 'brain' | 'editor' | 'links' | null

export interface ContentGap {
  topic: string
  demand: number
  supply: number
  opportunity: 'high' | 'medium' | 'low'
}

export interface KeywordData {
  term: string
  volume: string
  difficulty: number
  trend: 'up' | 'down' | 'stable'
}

export interface CompetitorData {
  name: string
  strength: number
  weakness: string
}

export interface NodeIntelligence {
  nicheScore?: number
  growthTrend?: number
  saturation?: number
  audienceSize?: string
  platform?: string
  rawEngagementRate?: number
  rawViralScore?: number
  rawViews?: number
  subNiches?: string[]
  opportunities?: string[]
  threats?: string[]
  contentGaps?: ContentGap[]
  keywords?: KeywordData[]
  aiAngles?: string[]
  competitors?: CompetitorData[]
  marketPosition?: string
  contentScore?: number
  seoScore?: number
  engagementScore?: number
  depthScore?: number
  loading?: boolean
}

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  size?: number
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  body?: string
  createdAt?: string
  intelligence?: NodeIntelligence
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  strength?: number
}

const BRAIN_NODE: GraphNode = {
  id: 'brain-1',
  label: 'My Second Brain',
  type: 'brain',
  size: 18,
  body: '# My Second Brain\n\nThis is your knowledge universe. Add niches to load live intelligence. Connect them. Discover patterns.\n\nClick + → New Niche to get started.',
}

interface GraphState {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedNode: GraphNode | null
  panelMode: PanelMode
  sidebarOpen: boolean
  aiOpen: boolean
  searchQuery: string
  hiddenTypes: NodeType[]
  localMode: boolean
  pinnedNodes: string[]
  commandOpen: boolean
  compareNicheId: string | null

  addNode: (node: Omit<GraphNode, 'id'>) => GraphNode
  updateNode: (id: string, updates: Partial<GraphNode>) => void
  deleteNode: (id: string) => void
  addLink: (source: string, target: string, strength?: number) => void
  selectNode: (node: GraphNode | null) => void
  setPanelMode: (mode: PanelMode) => void
  setSidebarOpen: (open: boolean) => void
  setAiOpen: (open: boolean) => void
  setSearchQuery: (q: string) => void
  toggleHideType: (type: NodeType) => void
  setLocalMode: (on: boolean) => void
  togglePin: (id: string, x?: number, y?: number) => void
  setCommandOpen: (open: boolean) => void
  setCompareNicheId: (id: string | null) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [BRAIN_NODE],
  links: [],
  selectedNode: null,
  panelMode: null,
  sidebarOpen: true,
  aiOpen: false,
  searchQuery: '',
  hiddenTypes: [],
  localMode: false,
  pinnedNodes: [],
  commandOpen: false,
  compareNicheId: null,

  addNode: (node) => {
    const newNode: GraphNode = { ...node, id: nanoid() }
    set((s) => ({ nodes: [...s.nodes, newNode] }))
    return newNode
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      selectedNode:
        s.selectedNode?.id === id ? { ...s.selectedNode, ...updates } : s.selectedNode,
    }))
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      links: s.links.filter((l) => {
        const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
        const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
        return src !== id && tgt !== id
      }),
      selectedNode: s.selectedNode?.id === id ? null : s.selectedNode,
      panelMode: s.selectedNode?.id === id ? null : s.panelMode,
      pinnedNodes: s.pinnedNodes.filter((pid) => pid !== id),
      compareNicheId: s.compareNicheId === id ? null : s.compareNicheId,
    }))
  },

  addLink: (source, target, strength = 0.7) => {
    const existing = get().links.find((l) => {
      const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
      const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
      return src === source && tgt === target
    })
    if (!existing) {
      set((s) => ({ links: [...s.links, { source, target, strength }] }))
    }
  },

  selectNode: (node) => {
    set({
      selectedNode: node,
      panelMode: node ? (node.intelligence ? 'brain' : 'editor') : null,
    })
  },

  setPanelMode: (mode) => set({ panelMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAiOpen: (open) => set({ aiOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  toggleHideType: (type) => {
    set((s) => ({
      hiddenTypes: s.hiddenTypes.includes(type)
        ? s.hiddenTypes.filter((t) => t !== type)
        : [...s.hiddenTypes, type],
    }))
  },

  setLocalMode: (on) => set({ localMode: on }),

  togglePin: (id, x, y) => {
    const { pinnedNodes, nodes } = get()
    const isPinned = pinnedNodes.includes(id)
    if (isPinned) {
      set((s) => ({
        pinnedNodes: s.pinnedNodes.filter((pid) => pid !== id),
        nodes: s.nodes.map((n) => n.id === id ? { ...n, fx: undefined, fy: undefined } : n),
      }))
    } else {
      const node = nodes.find((n) => n.id === id)
      const nx = x ?? node?.x ?? 0
      const ny = y ?? node?.y ?? 0
      set((s) => ({
        pinnedNodes: [...s.pinnedNodes, id],
        nodes: s.nodes.map((n) => n.id === id ? { ...n, fx: nx, fy: ny } : n),
      }))
    }
  },

  setCommandOpen: (open) => set({ commandOpen: open }),
  setCompareNicheId: (id) => set({ compareNicheId: id }),
}))

export const NODE_COLORS: Record<NodeType, string> = {
  brain: '#8b5cf6',
  niche: '#7c3aed',
  content: '#06b6d4',
  insight: '#f59e0b',
  competitor: '#ef4444',
  keyword: '#10b981',
}
