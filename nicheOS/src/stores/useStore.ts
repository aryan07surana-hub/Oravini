import { create } from 'zustand'
import { SEED_NODES, SEED_LINKS } from '../data/seed'
import { nanoid } from '../lib/utils'
import type { AppState, GraphNode, PanelMode } from '../types'

export const useStore = create<AppState>((set, get) => ({
  nodes: SEED_NODES,
  links: SEED_LINKS,
  selectedNode: null,
  panelMode: null,
  sidebarOpen: true,
  aiOpen: false,
  searchQuery: '',

  addNode: (node) => {
    const newNode: GraphNode = { ...node, id: nanoid() }
    set((s) => ({ nodes: [...s.nodes, newNode] }))
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      selectedNode: s.selectedNode?.id === id
        ? { ...s.selectedNode, ...updates }
        : s.selectedNode,
    }))
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      links: s.links.filter(
        (l) =>
          (typeof l.source === 'string' ? l.source : (l.source as GraphNode).id) !== id &&
          (typeof l.target === 'string' ? l.target : (l.target as GraphNode).id) !== id
      ),
      selectedNode: s.selectedNode?.id === id ? null : s.selectedNode,
      panelMode: s.selectedNode?.id === id ? null : s.panelMode,
    }))
  },

  addLink: (source, target) => {
    const existing = get().links.find(
      (l) =>
        (typeof l.source === 'string' ? l.source : (l.source as GraphNode).id) === source &&
        (typeof l.target === 'string' ? l.target : (l.target as GraphNode).id) === target
    )
    if (!existing) {
      set((s) => ({ links: [...s.links, { source, target, strength: 0.5 }] }))
    }
  },

  selectNode: (node) => {
    set({
      selectedNode: node,
      panelMode: node ? (node.intelligence ? 'intelligence' : 'editor') : null,
    })
  },

  setPanelMode: (mode: PanelMode) => set({ panelMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAiOpen: (open) => set({ aiOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
