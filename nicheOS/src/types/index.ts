export type NodeType = 'brain' | 'niche' | 'content' | 'insight' | 'competitor' | 'keyword'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  size?: number
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number
  fy?: number
  // metadata
  body?: string
  createdAt?: string
  // intelligence data (for niche/content nodes)
  intelligence?: NodeIntelligence
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  strength?: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface NodeIntelligence {
  // Niche metrics
  nicheScore?: number          // 0–100 overall opportunity score
  growthTrend?: number         // % growth
  saturation?: number          // 0–100 saturation level
  audienceSize?: string        // "2.4M monthly searches"
  subNiches?: string[]
  opportunities?: string[]
  threats?: string[]

  // Content metrics
  contentScore?: number        // 0–100 content quality
  seoScore?: number
  engagementScore?: number
  depthScore?: number
  contentGaps?: ContentGap[]
  keywords?: KeywordData[]
  aiAngles?: string[]

  // Competitor data
  competitors?: CompetitorData[]
  marketPosition?: string
}

export interface ContentGap {
  topic: string
  demand: number    // 0–100
  supply: number    // 0–100 (lower = bigger gap)
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
  url?: string
}

export type PanelMode = 'brain' | 'editor' | 'ai' | null

export interface AppState {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedNode: GraphNode | null
  panelMode: PanelMode
  sidebarOpen: boolean
  aiOpen: boolean
  searchQuery: string
  addNode: (node: Omit<GraphNode, 'id'>) => void
  updateNode: (id: string, updates: Partial<GraphNode>) => void
  deleteNode: (id: string) => void
  addLink: (source: string, target: string) => void
  selectNode: (node: GraphNode | null) => void
  setPanelMode: (mode: PanelMode) => void
  setSidebarOpen: (open: boolean) => void
  setAiOpen: (open: boolean) => void
  setSearchQuery: (q: string) => void
}
