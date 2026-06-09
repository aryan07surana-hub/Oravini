import { motion, AnimatePresence } from 'motion/react'
import { Brain, Crosshair, FileText, Lightbulb, Swords, Hash, ChevronRight, Network } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { NODE_COLORS, NODE_BADGE_COLORS } from '../../data/seed'
import type { NodeType, GraphNode } from '../../types'

const TYPE_ICONS: Record<NodeType, React.ReactNode> = {
  brain: <Brain size={12} />,
  niche: <Crosshair size={12} />,
  content: <FileText size={12} />,
  insight: <Lightbulb size={12} />,
  competitor: <Swords size={12} />,
  keyword: <Hash size={12} />,
}

const TYPE_ORDER: NodeType[] = ['brain', 'niche', 'content', 'insight', 'competitor', 'keyword']

export default function Sidebar() {
  const { sidebarOpen, nodes, selectedNode, selectNode } = useStore()

  const grouped = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = nodes.filter((n) => n.type === type)
    return acc
  }, {} as Record<NodeType, GraphNode[]>)

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="flex-shrink-0 h-full border-r border-white/[0.06] flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-panel)', backdropFilter: 'blur(20px)' }}
        >
          {/* header */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Network size={13} className="text-purple-400" />
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Knowledge Graph</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span>{nodes.length} nodes</span>
              <span>·</span>
              <span>{useStore.getState().links.length} connections</span>
            </div>
          </div>

          {/* node list grouped by type */}
          <div className="flex-1 overflow-y-auto py-2">
            {TYPE_ORDER.map((type) => {
              const group = grouped[type]
              if (group.length === 0) return null
              const color = NODE_COLORS[type]
              return (
                <SidebarGroup
                  key={type}
                  type={type}
                  icon={TYPE_ICONS[type]}
                  color={color}
                  nodes={group}
                  selectedId={selectedNode?.id}
                  onSelect={selectNode}
                />
              )
            })}
          </div>

          {/* footer stats */}
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="glass-card p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">Niches tracked</span>
                <span className="text-[10px] font-semibold text-purple-400">
                  {grouped.niche.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">Content pieces</span>
                <span className="text-[10px] font-semibold text-cyan-400">
                  {grouped.content.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-muted)]">Keywords mapped</span>
                <span className="text-[10px] font-semibold text-emerald-400">
                  {grouped.keyword.length}
                </span>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function SidebarGroup({
  type, icon, color, nodes, selectedId, onSelect,
}: {
  type: NodeType
  icon: React.ReactNode
  color: string
  nodes: GraphNode[]
  selectedId?: string
  onSelect: (n: GraphNode) => void
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <span style={{ color }} className="opacity-70">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] capitalize">
          {type}
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-muted)]">{nodes.length}</span>
      </div>
      {nodes.map((node) => (
        <button
          key={node.id}
          onClick={() => onSelect(node)}
          className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-left transition-all duration-150 group ${
            selectedId === node.id
              ? 'bg-white/[0.06] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-white/[0.03] hover:text-[var(--text-primary)]'
          }`}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-150"
            style={{
              background: color,
              boxShadow: selectedId === node.id ? `0 0 6px ${color}` : 'none',
            }}
          />
          <span className="text-xs truncate flex-1">{node.label}</span>
          {selectedId === node.id && (
            <ChevronRight size={10} className="flex-shrink-0 text-[var(--text-muted)]" />
          )}
        </button>
      ))}
    </div>
  )
}
