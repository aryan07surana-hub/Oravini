import { motion, AnimatePresence } from 'motion/react'
import { X, Brain, FileEdit, Trash2 } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { NODE_BADGE_COLORS, NODE_LABELS } from '../../data/seed'
import BrainPanel from '../brain/BrainPanel'
import NoteEditor from '../editor/NoteEditor'

export default function ContextDrawer() {
  const { selectedNode, panelMode, setPanelMode, selectNode, deleteNode } = useStore()
  const open = !!selectedNode

  const handleDelete = () => {
    if (selectedNode) {
      deleteNode(selectedNode.id)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="drawer"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          className="flex-shrink-0 h-full border-l border-white/[0.06] flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-panel)', backdropFilter: 'blur(20px)' }}
        >
          {/* drawer header */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`node-badge ${NODE_BADGE_COLORS[selectedNode!.type]}`}>
                    {NODE_LABELS[selectedNode!.type]}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">
                  {selectedNode!.label}
                </h2>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete node"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => selectNode(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* tab switcher */}
            <div className="flex items-center gap-1 mt-3">
              {selectedNode!.intelligence && (
                <TabBtn
                  active={panelMode === 'brain'}
                  onClick={() => setPanelMode('brain')}
                  icon={<Brain size={11} />}
                  label="Brain"
                />
              )}
              <TabBtn
                active={panelMode === 'editor'}
                onClick={() => setPanelMode('editor')}
                icon={<FileEdit size={11} />}
                label="Notes"
              />
            </div>
          </div>

          {/* panel content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {panelMode === 'brain' && selectedNode!.intelligence ? (
                <motion.div
                  key="brain"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="h-full"
                >
                  <BrainPanel node={selectedNode!} />
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="h-full"
                >
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

function TabBtn({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
