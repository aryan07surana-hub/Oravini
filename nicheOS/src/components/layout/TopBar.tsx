import { useState } from 'react'
import { Search, Sparkles, PanelLeft, Plus, Command } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../../stores/useStore'

export default function TopBar() {
  const { sidebarOpen, setSidebarOpen, setAiOpen, aiOpen, searchQuery, setSearchQuery, nodes } = useStore()
  const [focused, setFocused] = useState(false)

  const filtered = searchQuery.trim()
    ? nodes.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <div className="flex items-center h-12 px-3 gap-3 border-b border-white/[0.06] flex-shrink-0 relative z-30">
      {/* sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="btn-ghost p-1.5 rounded-lg"
        title="Toggle sidebar"
      >
        <PanelLeft size={16} className={sidebarOpen ? 'text-purple-400' : 'text-[var(--text-muted)]'} />
      </button>

      {/* logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="relative w-6 h-6">
          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-base)]" />
          </div>
          <div className="absolute inset-0 rounded-full animate-breathe"
            style={{ boxShadow: '0 0 12px rgba(124,58,237,0.6)' }} />
        </div>
        <span className="text-sm font-semibold text-gradient-purple hidden sm:block">NicheOS</span>
      </div>

      {/* global search */}
      <div className="flex-1 max-w-xl relative">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
            focused
              ? 'bg-white/[0.05] border-purple-500/40'
              : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.1]'
          }`}
        >
          <Search size={13} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            placeholder="Search your knowledge graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
          <div className="hidden sm:flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.06] font-mono">⌘</kbd>
            <kbd className="px-1 py-0.5 rounded bg-white/[0.06] font-mono">K</kbd>
          </div>
        </div>

        <AnimatePresence>
          {focused && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1 left-0 right-0 glass rounded-xl overflow-hidden z-50 shadow-2xl"
            >
              {filtered.slice(0, 6).map((node) => (
                <button
                  key={node.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                  onMouseDown={() => {
                    const { selectNode } = useStore.getState()
                    selectNode(node)
                    setSearchQuery('')
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: {
                        brain: '#8b5cf6', niche: '#7c3aed', content: '#06b6d4',
                        insight: '#f59e0b', competitor: '#ef4444', keyword: '#10b981',
                      }[node.type],
                    }}
                  />
                  <span className="text-xs text-[var(--text-primary)] flex-1">{node.label}</span>
                  <span className="text-[10px] text-[var(--text-muted)] capitalize">{node.type}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* add node quick action */}
        <AddNodeButton />

        {/* AI button */}
        <button
          onClick={() => setAiOpen(!aiOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            aiOpen
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'btn-ghost'
          }`}
          style={aiOpen ? { boxShadow: '0 0 16px rgba(124,58,237,0.3)' } : {}}
        >
          <Sparkles size={13} />
          <span className="hidden sm:block">Ask AI</span>
        </button>
      </div>
    </div>
  )
}

function AddNodeButton() {
  const [open, setOpen] = useState(false)
  const { addNode } = useStore()

  const types = [
    { type: 'niche', label: 'New Niche', color: '#7c3aed' },
    { type: 'content', label: 'New Content', color: '#06b6d4' },
    { type: 'insight', label: 'New Insight', color: '#f59e0b' },
    { type: 'keyword', label: 'New Keyword', color: '#10b981' },
  ] as const

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-ghost p-1.5">
        <Plus size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1 glass rounded-xl overflow-hidden z-50 w-44 shadow-2xl"
          >
            {types.map(({ type, label, color }) => (
              <button
                key={type}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                onClick={() => {
                  addNode({ label: label.replace('New ', '') + ' ' + Math.floor(Math.random() * 99), type })
                  setOpen(false)
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-[var(--text-primary)]">{label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
