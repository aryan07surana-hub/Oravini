import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  Search, Plus, ChevronRight, ChevronDown, Star, FileText, Folder, FolderOpen,
  X, Bold, Italic, Code, Highlighter, Heading1, Heading2, List, ListOrdered,
  CheckSquare, Quote, Network, Calendar, Trash2, MoreHorizontal,
  PanelRight, PanelRightClose, Send, Sparkles, Zap, GitBranch,
  Brain, RefreshCw, AlertCircle, Layers, Link2, Activity,
  Copy, FolderInput, Command, SplitSquareHorizontal, Clock, Tag,
  Eye, EyeOff, ChevronLeft, ArrowRight, Hash, Columns2,
} from 'lucide-react'
import { useVaultStore, type VaultFile } from '@/stores/vaultStore'
import ClientLayout from '@/components/layout/ClientLayout'
import { trackFeature } from '@/hooks/use-track-activity'

/* ─── Design tokens ─── */
const GOLD   = '#d4b461'
const TEAL   = '#2dd4bf'
const VIOLET = '#a78bfa'
const BASE   = '#06060b'
const PANEL  = 'rgba(10,10,20,0.95)'
const CARD   = 'rgba(16,16,28,0.97)'
const BORDER = 'rgba(255,255,255,0.07)'
const B2     = 'rgba(255,255,255,0.04)'

/* ─── Fuzzy match ─── */
function fuzzy(str: string, q: string): boolean {
  const s = str.toLowerCase(); const p = q.toLowerCase()
  let i = 0
  for (const c of p) { const idx = s.indexOf(c, i); if (idx === -1) return false; i = idx + 1 }
  return true
}

/* ─── Reading time ─── */
function readingTime(content: string): string {
  const words = content.trim().split(/\s+/).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

/* ─── WikiLink + Embed extension ─── */
const VaultLinksExt = Extension.create({
  name: 'vaultLinks',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('vaultLinks'),
        props: {
          decorations(state) {
            const { doc } = state; const decs: Decoration[] = []
            const wikiRe = /(!?)\[\[([^\]]+)\]\]/g
            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              let m; wikiRe.lastIndex = 0
              while ((m = wikiRe.exec(node.text)) !== null) {
                const isEmbed = m[1] === '!'
                decs.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
                  class: isEmbed ? 'vault-embed' : 'vault-wikilink',
                  'data-target': m[2],
                  'data-embed': isEmbed ? '1' : '0',
                }))
              }
            })
            return DecorationSet.create(doc, decs)
          },
          handleDOMEvents: {
            click(_view, event) {
              const t = event.target as HTMLElement
              if (t.classList.contains('vault-wikilink') || t.classList.contains('vault-embed')) {
                const name = t.getAttribute('data-target') ?? ''
                if (name) {
                  const { files, openTab, createFile } = useVaultStore.getState()
                  const found = files.find(f => f.name.replace('.md', '').toLowerCase() === name.toLowerCase())
                  if (found) { openTab(found.id); return true }
                  if (t.classList.contains('vault-wikilink')) {
                    const nf = createFile(name); openTab(nf.id); return true
                  }
                }
              }
              return false
            },
          },
        },
      }),
    ]
  },
})

/* ══════════════════════════════════════════════════════
   COMMAND PALETTE
══════════════════════════════════════════════════════ */
type CmdItem =
  | { kind: 'note'; file: VaultFile }
  | { kind: 'cmd'; id: string; label: string; icon: React.ReactNode; run: () => void }

function CommandPalette({ onClose, onAnalyze, onGaps, onSynthesis, onBehavior }: {
  onClose: () => void
  onAnalyze: () => void
  onGaps: () => void
  onSynthesis: () => void
  onBehavior: () => void
}) {
  const { files, openTab, createFile, createDailyNote, setSplitTab, splitTabId, activeTabId } = useVaultStore()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const CMDS: CmdItem[] = [
    { kind: 'cmd', id: 'new', label: 'New Note', icon: <Plus className="w-3.5 h-3.5" />, run: () => { const f = createFile('Untitled'); openTab(f.id); onClose() } },
    { kind: 'cmd', id: 'daily', label: "Today's Daily Note", icon: <Calendar className="w-3.5 h-3.5" />, run: () => { openTab(createDailyNote().id); onClose() } },
    { kind: 'cmd', id: 'graph', label: 'Open Graph View', icon: <Network className="w-3.5 h-3.5" />, run: () => { window.location.href = '/knowledge-graph'; onClose() } },
    { kind: 'cmd', id: 'split', label: splitTabId ? 'Close Split Pane' : 'Open Split Pane', icon: <Columns2 className="w-3.5 h-3.5" />, run: () => { setSplitTab(splitTabId ? null : activeTabId); onClose() } },
    { kind: 'cmd', id: 'analyze', label: 'Analyze Current Note', icon: <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} />, run: () => { onAnalyze(); onClose() } },
    { kind: 'cmd', id: 'gaps', label: 'Scan Knowledge Gaps', icon: <AlertCircle className="w-3.5 h-3.5" style={{ color: GOLD }} />, run: () => { onGaps(); onClose() } },
    { kind: 'cmd', id: 'synthesis', label: 'Generate Daily Synthesis', icon: <Sparkles className="w-3.5 h-3.5" style={{ color: TEAL }} />, run: () => { onSynthesis(); onClose() } },
    { kind: 'cmd', id: 'behavior', label: 'Behavior Insights', icon: <Activity className="w-3.5 h-3.5" style={{ color: TEAL }} />, run: () => { onBehavior(); onClose() } },
  ]

  const items: CmdItem[] = useMemo(() => {
    if (!q.trim()) return CMDS
    const results: CmdItem[] = []
    CMDS.forEach(c => { if (c.kind === 'cmd' && fuzzy(c.label, q)) results.push(c) })
    files.filter(f => fuzzy(f.name.replace('.md', ''), q)).slice(0, 8).forEach(f => results.push({ kind: 'note', file: f }))
    return results
  }, [q, files])

  useEffect(() => { setIdx(0) }, [q])

  function runItem(item: CmdItem) {
    if (item.kind === 'cmd') item.run()
    else { openTab(item.file.id); onClose() }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && items[idx]) { e.preventDefault(); runItem(items[idx]) }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }} transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="w-[560px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px ${GOLD}10` }}>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Command className="w-4 h-4 shrink-0" style={{ color: '#44445a' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search notes or run a command…"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: '#f0f0fa' }}
          />
          {q && <button onClick={() => setQ('')} style={{ color: '#44445a' }}><X className="w-3.5 h-3.5" /></button>}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: B2, color: '#44445a', border: `1px solid ${BORDER}` }}>esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-1.5">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: '#44445a' }}>No results for "{q}"</div>
          )}
          {items.map((item, i) => {
            const active = i === idx
            if (item.kind === 'cmd') return (
              <button key={item.id} onClick={() => runItem(item)} onMouseEnter={() => setIdx(i)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all duration-100"
                style={{ background: active ? `${GOLD}10` : 'transparent', borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent' }}>
                <span style={{ color: active ? GOLD : '#44445a' }}>{item.icon}</span>
                <span className="text-[13px]" style={{ color: active ? '#f0f0fa' : '#8888aa' }}>{item.label}</span>
              </button>
            )
            return (
              <button key={item.file.id} onClick={() => runItem(item)} onMouseEnter={() => setIdx(i)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all duration-100"
                style={{ background: active ? `${GOLD}08` : 'transparent', borderLeft: active ? `2px solid ${GOLD}50` : '2px solid transparent' }}>
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: active ? `${GOLD}80` : '#2a2a3a' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ color: active ? '#f0f0fa' : '#8888aa' }}>
                    {item.file.name.replace('.md', '')}
                  </div>
                  {item.file.folder && <div className="text-[10px]" style={{ color: '#2a2a3a' }}>{item.file.folder}</div>}
                </div>
                {item.file.starred && <Star className="w-2.5 h-2.5 fill-current shrink-0" style={{ color: GOLD }} />}
              </button>
            )
          })}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: `1px solid ${B2}` }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([k, l]) => (
            <div key={k} className="flex items-center gap-1.5">
              <kbd className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: B2, color: '#44445a', border: `1px solid ${BORDER}` }}>{k}</kbd>
              <span className="text-[10px]" style={{ color: '#2a2a3a' }}>{l}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   FILE ROW (with double-click rename + context menu)
══════════════════════════════════════════════════════ */
function FileRow({ file, active, onOpen, onDelete, onStar, onDuplicate, onMove }: {
  file: VaultFile; active: boolean
  onOpen: () => void; onDelete: () => void; onStar: () => void
  onDuplicate: () => void; onMove: (folder: string) => void
}) {
  const { folders } = useVaultStore()
  const [hover, setHover] = useState(false)
  const [editing, setEditing] = useState(false)
  const [renameVal, setRenameVal] = useState(file.name.replace('.md', ''))
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)
  const { renameFile } = useVaultStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { setRenameVal(file.name.replace('.md', '')); setTimeout(() => inputRef.current?.select(), 10) } }, [editing])

  function commitRename() {
    if (renameVal.trim() && renameVal.trim() !== file.name.replace('.md', '')) renameFile(file.id, renameVal.trim())
    setEditing(false)
  }

  function onCtx(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setCtx({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        className="relative flex items-center gap-2 py-[5px] px-2 pl-5 rounded-lg cursor-pointer transition-all duration-100 select-none"
        style={{ background: active ? `${GOLD}10` : hover ? 'rgba(255,255,255,0.03)' : 'transparent', borderLeft: active ? `2px solid ${GOLD}60` : '2px solid transparent' }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false) }}
        onClick={editing ? undefined : onOpen}
        onDoubleClick={() => setEditing(true)}
        onContextMenu={onCtx}
      >
        <FileText className="w-3 h-3 shrink-0" style={{ color: active ? GOLD : '#44445a' }} />

        {editing ? (
          <input ref={inputRef} value={renameVal} onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename} onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-transparent text-[12px] outline-none rounded px-1"
            style={{ color: '#f0f0fa', border: `1px solid ${GOLD}50`, background: `${GOLD}0a` }}
          />
        ) : (
          <span className="text-[12px] flex-1 truncate leading-none" style={{ color: active ? '#f0f0fa' : '#8888aa' }}>
            {file.name.replace('.md', '')}
          </span>
        )}

        {!editing && file.starred && <Star className="w-2 h-2 shrink-0 fill-current" style={{ color: GOLD }} />}
        {!editing && hover && (
          <button onClick={e => { e.stopPropagation(); onStar() }} className="p-0.5 rounded transition-colors shrink-0" style={{ color: file.starred ? GOLD : '#44445a' }}>
            <Star className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Context menu */}
      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} items={[
          { label: 'Open', icon: <Eye className="w-3 h-3" />, run: onOpen },
          { label: 'Open in Split', icon: <Columns2 className="w-3 h-3" />, run: () => { useVaultStore.getState().setSplitTab(file.id) } },
          { label: 'Rename', icon: <FileText className="w-3 h-3" />, run: () => setEditing(true) },
          { label: 'Duplicate', icon: <Copy className="w-3 h-3" />, run: onDuplicate },
          { label: file.starred ? 'Unstar' : 'Star', icon: <Star className="w-3 h-3" />, run: onStar },
          { sep: true },
          ...folders.map(fd => ({ label: `Move to ${fd.name}`, icon: <FolderInput className="w-3 h-3" />, run: () => onMove(fd.name) })),
          { sep: true },
          { label: 'Delete', icon: <Trash2 className="w-3 h-3" />, run: onDelete, danger: true },
        ]} />
      )}
    </>
  )
}

/* ─── Context menu ─── */
type MenuItem = { label: string; icon?: React.ReactNode; run: () => void; danger?: boolean } | { sep: true }

function ContextMenu({ x, y, onClose, items }: { x: number; y: number; onClose: () => void; items: MenuItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Element)) onClose() }
    document.addEventListener('mousedown', h, true)
    return () => document.removeEventListener('mousedown', h, true)
  }, [onClose])

  const vx = Math.min(x, window.innerWidth - 180)
  const vy = Math.min(y, window.innerHeight - 300)

  return (
    <div ref={ref} className="fixed z-[300] rounded-xl overflow-hidden shadow-2xl py-1"
      style={{ left: vx, top: vy, background: CARD, border: `1px solid ${BORDER}`, minWidth: 168, boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
      {items.map((item, i) =>
        'sep' in item ? (
          <div key={i} className="my-1 mx-2" style={{ height: 1, background: B2 }} />
        ) : (
          <button key={i} onClick={() => { item.run(); onClose() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-left transition-colors hover:bg-white/[0.04]"
            style={{ color: item.danger ? '#f87171' : '#c4c4d8' }}>
            <span style={{ color: item.danger ? '#f87171' : '#44445a' }}>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   FOLDER SECTION (with create folder UI)
══════════════════════════════════════════════════════ */
function FolderSection({ name, files, activeId, onOpen, onDelete, onStar, onDuplicate, onMove }: {
  name: string; files: VaultFile[]; activeId: string | null
  onOpen: (id: string) => void; onDelete: (id: string) => void; onStar: (id: string) => void
  onDuplicate: (id: string) => void; onMove: (id: string, folder: string) => void
}) {
  const { folders, toggleFolder, createFile, openTab } = useVaultStore()
  const folder = folders.find(f => f.name === name)
  const open = folder?.open ?? true
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  function handleCreate() {
    if (!newName.trim()) return
    const f = createFile(newName.trim(), name)
    openTab(f.id); setNewName(''); setCreating(false)
  }

  return (
    <div className="mb-0.5">
      <div className="flex items-center group">
        <button onClick={() => folder && toggleFolder(folder.id)}
          className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg transition-all duration-100 hover:bg-white/[0.03]">
          {open ? <FolderOpen className="w-3 h-3 shrink-0" style={{ color: `${GOLD}80` }} /> : <Folder className="w-3 h-3 shrink-0" style={{ color: `${GOLD}50` }} />}
          <span className="text-[10px] font-semibold uppercase tracking-widest flex-1 text-left" style={{ color: '#44445a' }}>{name}</span>
          <span className="text-[10px]" style={{ color: '#2a2a3a' }}>{files.length}</span>
          {open ? <ChevronDown className="w-2.5 h-2.5" style={{ color: '#2a2a3a' }} /> : <ChevronRight className="w-2.5 h-2.5" style={{ color: '#2a2a3a' }} />}
        </button>
        <button onClick={() => setCreating(v => !v)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all mr-1"
          style={{ color: '#44445a' }} title={`New note in ${name}`}>
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            {creating && (
              <div className="pl-5 pr-2 py-1">
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                  placeholder="Note name…" className="w-full rounded-md py-1 px-2 text-[11px] outline-none"
                  style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}40`, color: '#f0f0fa' }} />
              </div>
            )}
            {files.map(file => (
              <FileRow key={file.id} file={file} active={activeId === file.id}
                onOpen={() => onOpen(file.id)} onDelete={() => onDelete(file.id)} onStar={() => onStar(file.id)}
                onDuplicate={() => onDuplicate(file.id)} onMove={folder => onMove(file.id, folder)} />
            ))}
            {files.length === 0 && !creating && <div className="px-5 py-1 text-[10px]" style={{ color: '#2a2a3a' }}>Empty</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   VAULT HEALTH
══════════════════════════════════════════════════════ */
function VaultHealth({ files }: { files: VaultFile[] }) {
  const stats = useMemo(() => {
    const existingTitles = new Set(files.map(f => f.name.replace('.md', '').toLowerCase()))
    const wikiRe = /\[\[([^\]]+)\]\]/g
    let totalLinks = 0; const refTitles = new Set<string>()
    for (const f of files) { let m; wikiRe.lastIndex = 0; while ((m = wikiRe.exec(f.content)) !== null) { totalLinks++; refTitles.add(m[1].toLowerCase()) } }
    const orphans = files.filter(f => !files.some(o => o.id !== f.id && o.content.includes(`[[${f.name.replace('.md', '')}]]`))).length
    const broken = [...refTitles].filter(r => !existingTitles.has(r)).length
    const score = Math.max(0, Math.min(100, Math.round(
      (files.length > 0 ? 20 : 0) + Math.min(40, totalLinks * 4) +
      (orphans === 0 ? 20 : Math.max(0, 20 - orphans * 4)) +
      (broken === 0 ? 20 : Math.max(0, 20 - broken * 5))
    )))
    return { total: files.length, totalLinks, orphans, broken, score }
  }, [files])

  const barColor = stats.score >= 70 ? '#4ade80' : stats.score >= 40 ? GOLD : '#f87171'

  return (
    <div className="px-3 py-3" style={{ borderTop: `1px solid ${B2}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#44445a' }}>Vault Health</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: barColor }}>{stats.score}<span className="text-[9px] font-normal" style={{ color: '#44445a' }}>/100</span></span>
      </div>
      <div className="w-full h-[3px] rounded-full mb-2" style={{ background: B2 }}>
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${barColor}88, ${barColor})` }}
          initial={{ width: 0 }} animate={{ width: `${stats.score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px]" style={{ color: '#44445a' }}>{stats.total} notes</span>
        <span className="text-[10px]" style={{ color: '#44445a' }}>{stats.totalLinks} links</span>
        {stats.orphans > 0 && <span className="text-[10px]" style={{ color: '#f59e0b' }}>{stats.orphans} orphans</span>}
        {stats.broken > 0 && <span className="text-[10px]" style={{ color: '#f87171' }}>{stats.broken} broken</span>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SIDEBAR (with drag & drop + folder create)
══════════════════════════════════════════════════════ */
function VaultSidebar({ width, onResizeStart, onCmd }: {
  width: number; onResizeStart: (e: React.MouseEvent) => void; onCmd: () => void
}) {
  const { files, folders, activeTabId, openTab, deleteFile, toggleStar, createFile, createDailyNote, searchFiles, importMarkdown, createFolder, duplicateFile, moveToFolder } = useVaultStore()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFolder, setNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const starred = files.filter(f => f.starred)
  const allFolderNames = [
    ...folders.map(f => f.name),
    ...[...new Set(files.map(f => f.folder).filter(Boolean))].filter(f => !folders.find(fd => fd.name === f)),
  ]
  const displayFiles = search.trim() ? searchFiles(search) : null

  function handleCreate() {
    if (!newName.trim()) return
    openTab(createFile(newName.trim()).id); setNewName(''); setCreating(false)
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return
    createFolder(newFolderName.trim()); setNewFolderName(''); setNewFolder(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.name.endsWith('.md')) return
    const reader = new FileReader()
    reader.onload = ev => {
      const content = ev.target?.result as string
      importMarkdown(file.name, content)
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ width, minWidth: 180, maxWidth: 420, background: PANEL, backdropFilter: 'blur(20px)', borderRight: `1px solid ${BORDER}` }}
      className="flex flex-col shrink-0 relative"
      onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}>

      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-r-none rounded-lg pointer-events-none"
          style={{ background: `${GOLD}12`, border: `2px dashed ${GOLD}50` }}>
          <div className="text-center">
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: `${GOLD}80` }} />
            <p className="text-[12px] font-medium" style={{ color: GOLD }}>Drop .md to import</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 pt-3.5 pb-3" style={{ borderBottom: `1px solid ${B2}` }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}28` }}>
            <Brain className="w-3.5 h-3.5" style={{ color: GOLD }} />
          </div>
          <span className="text-[13px] font-bold tracking-tight" style={{ color: '#f0f0fa' }}>Cortex</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={onCmd} title="Command Palette (⌘K)"
              className="flex items-center gap-1 px-1.5 py-1 rounded-md transition-all hover:bg-white/[0.04]"
              style={{ color: '#44445a', border: `1px solid ${BORDER}` }}>
              <Command className="w-2.5 h-2.5" />
              <span className="text-[9px] font-mono">⌘K</span>
            </button>
            <button onClick={() => setCreating(true)} title="New note"
              className="px-1.5 py-1 rounded-md transition-all hover:opacity-80"
              style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}>
              <Plus className="w-3 h-3" />
            </button>
            <button onClick={() => { openTab(createDailyNote().id) }} title="Daily note"
              className="px-1.5 py-1 rounded-md transition-all hover:bg-white/[0.04]"
              style={{ border: `1px solid ${BORDER}`, color: '#44445a' }}>
              <Calendar className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#44445a' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vault…"
            className="w-full py-1.5 pl-7 pr-2.5 text-[12px] rounded-lg outline-none transition-all"
            style={{ background: B2, border: `1px solid ${BORDER}`, color: '#f0f0fa' }}
            onFocus={e => (e.target.style.borderColor = `${GOLD}40`)}
            onBlur={e => (e.target.style.borderColor = BORDER)} />
        </div>
      </div>

      {/* New note input */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 overflow-hidden" style={{ borderBottom: `1px solid ${B2}` }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Note name…" className="w-full rounded-lg py-1.5 px-2.5 text-[12px] outline-none"
              style={{ background: `${GOLD}0d`, border: `1px solid ${GOLD}45`, color: '#f0f0fa' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {search.trim() && displayFiles ? (
          <div>
            <div className="px-2 pb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#44445a' }}>
              {displayFiles.length} result{displayFiles.length !== 1 ? 's' : ''}
            </div>
            {displayFiles.map(file => (
              <FileRow key={file.id} file={file} active={activeTabId === file.id}
                onOpen={() => openTab(file.id)} onDelete={() => deleteFile(file.id)} onStar={() => toggleStar(file.id)}
                onDuplicate={() => { const f = duplicateFile(file.id); openTab(f.id) }}
                onMove={folder => moveToFolder(file.id, folder)} />
            ))}
          </div>
        ) : (
          <>
            {starred.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: `${GOLD}70` }}>
                  <Star className="w-2.5 h-2.5 fill-current" style={{ color: GOLD }} /> Starred
                </div>
                {starred.map(file => (
                  <FileRow key={file.id} file={file} active={activeTabId === file.id}
                    onOpen={() => openTab(file.id)} onDelete={() => deleteFile(file.id)} onStar={() => toggleStar(file.id)}
                    onDuplicate={() => { const f = duplicateFile(file.id); openTab(f.id) }}
                    onMove={folder => moveToFolder(file.id, folder)} />
                ))}
                <div className="h-px mx-2 my-1.5" style={{ background: B2 }} />
              </div>
            )}
            {allFolderNames.map(name => (
              <FolderSection key={name} name={name} files={files.filter(f => f.folder === name)} activeId={activeTabId}
                onOpen={id => openTab(id)} onDelete={id => deleteFile(id)} onStar={id => toggleStar(id)}
                onDuplicate={id => { const f = duplicateFile(id); openTab(f.id) }}
                onMove={(id, folder) => moveToFolder(id, folder)} />
            ))}
            {files.filter(f => !f.folder).length > 0 && (
              <FolderSection key="root" name="Notes" files={files.filter(f => !f.folder)} activeId={activeTabId}
                onOpen={id => openTab(id)} onDelete={id => deleteFile(id)} onStar={id => toggleStar(id)}
                onDuplicate={id => { const f = duplicateFile(id); openTab(f.id) }}
                onMove={(id, folder) => moveToFolder(id, folder)} />
            )}

            {/* Create folder */}
            <div className="px-2 mt-2">
              {newFolder ? (
                <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setNewFolder(false); setNewFolderName('') } }}
                  placeholder="Folder name…" className="w-full rounded-md py-1 px-2 text-[11px] outline-none"
                  style={{ background: B2, border: `1px solid ${BORDER}`, color: '#f0f0fa' }} />
              ) : (
                <button onClick={() => setNewFolder(true)}
                  className="flex items-center gap-1.5 text-[10px] transition-colors hover:opacity-80"
                  style={{ color: '#2a2a3a' }}>
                  <Plus className="w-2.5 h-2.5" /> New folder
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <VaultHealth files={files} />
      <div onMouseDown={onResizeStart} className="absolute right-[-3px] top-0 bottom-0 w-1.5 cursor-col-resize z-10" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TAB BAR
══════════════════════════════════════════════════════ */
function TabBar({ rightOpen, onToggleRight, splitTabId, onToggleSplit }: {
  rightOpen: boolean; onToggleRight: () => void
  splitTabId: string | null; onToggleSplit: () => void
}) {
  const { openTabIds, activeTabId, files, openTab, closeTab } = useVaultStore()
  const tabs = openTabIds.map(id => files.find(f => f.id === id)).filter(Boolean) as VaultFile[]

  return (
    <div className="flex items-center shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(6,6,11,0.85)', minHeight: 38 }}>
      {tabs.map(tab => {
        const active = tab.id === activeTabId
        const isSplit = tab.id === splitTabId
        return (
          <div key={tab.id} onClick={() => openTab(tab.id)}
            className="flex items-center gap-1.5 px-3 h-[38px] cursor-pointer shrink-0 transition-all duration-100"
            style={{ borderRight: `1px solid ${BORDER}`, borderBottom: active ? `2px solid ${GOLD}` : isSplit ? `2px solid ${TEAL}50` : '2px solid transparent', background: active ? `${GOLD}06` : 'transparent' }}>
            <FileText className="w-2.5 h-2.5" style={{ color: active ? GOLD : isSplit ? TEAL : '#44445a' }} />
            <span className="text-[12px] max-w-[120px] truncate" style={{ color: active ? '#f0f0fa' : '#8888aa' }}>
              {tab.name.replace('.md', '')}
            </span>
            <button onClick={e => { e.stopPropagation(); closeTab(tab.id) }} className="transition-colors flex items-center" style={{ color: '#44445a' }}>
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )
      })}
      <div className="ml-auto flex items-center gap-1 px-2.5 shrink-0">
        <button onClick={onToggleSplit} title="Toggle split pane"
          className="flex items-center p-1.5 rounded-md transition-all hover:bg-white/[0.04]"
          style={{ color: splitTabId ? TEAL : '#44445a' }}>
          <Columns2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleRight}
          className="flex items-center p-1.5 rounded-md transition-all hover:bg-white/[0.04]"
          style={{ color: rightOpen ? GOLD : '#44445a' }}>
          {rightOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SMART LINK BAR
══════════════════════════════════════════════════════ */
function SmartLinkBar({ file, onInsert }: { file: VaultFile; onInsert: (title: string) => void }) {
  const { files } = useVaultStore()
  const [suggestions, setSuggestions] = useState<VaultFile[]>([])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!file.content || file.content.length < 30) { setSuggestions([]); return }
      const words = new Set(file.content.toLowerCase().split(/\W+/).filter(w => w.length > 4))
      const existing = new Set<string>()
      const re = /\[\[([^\]]+)\]\]/g; let m
      while ((m = re.exec(file.content)) !== null) existing.add(m[1].toLowerCase())
      const scored = files.filter(f => f.id !== file.id && !existing.has(f.name.replace('.md', '').toLowerCase()))
        .map(f => {
          const t = f.name.replace('.md', '').toLowerCase()
          return { f, score: t.split(/\W+/).filter(w => words.has(w)).length + (file.content.toLowerCase().includes(t) ? 3 : 0) }
        }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map(({ f }) => f)
      setSuggestions(scored)
    }, 800)
    return () => clearTimeout(t)
  }, [file.content, files, file.id])

  if (!suggestions.length) return null
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-4 py-1.5 shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${B2}`, background: `${GOLD}04` }}>
      <Link2 className="w-2.5 h-2.5 shrink-0" style={{ color: `${GOLD}60` }} />
      <span className="text-[10px] shrink-0" style={{ color: '#44445a' }}>Link to:</span>
      {suggestions.map(s => (
        <button key={s.id} onClick={() => onInsert(s.name.replace('.md', ''))}
          className="text-[11px] px-2.5 py-0.5 rounded-full shrink-0 transition-all hover:opacity-80"
          style={{ background: `${GOLD}10`, color: `${GOLD}cc`, border: `1px solid ${GOLD}25` }}>
          [[{s.name.replace('.md', '')}]]
        </button>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   INLINE TITLE
══════════════════════════════════════════════════════ */
function InlineTitle({ file }: { file: VaultFile }) {
  const { renameFile } = useVaultStore()
  const [val, setVal] = useState(file.name.replace('.md', ''))
  const [editing, setEditing] = useState(false)

  useEffect(() => { setVal(file.name.replace('.md', '')) }, [file.id, file.name])

  function commit() {
    if (val.trim() && val.trim() !== file.name.replace('.md', '')) renameFile(file.id, val.trim())
    setEditing(false)
  }

  return (
    <div className="px-10 pt-6 pb-2">
      {editing ? (
        <input value={val} onChange={e => setVal(e.target.value)} autoFocus
          onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(file.name.replace('.md', '')); setEditing(false) } }}
          className="w-full bg-transparent outline-none font-bold tracking-tight"
          style={{ fontSize: 26, color: '#f0f0fa', borderBottom: `2px solid ${GOLD}50`, paddingBottom: 4 }} />
      ) : (
        <h1
          onClick={() => setEditing(true)}
          className="font-bold tracking-tight cursor-text transition-colors hover:opacity-80"
          style={{ fontSize: 26, color: '#f0f0fa', lineHeight: 1.25 }}
          title="Click to rename">
          {file.name.replace('.md', '')}
        </h1>
      )}
      <div className="flex items-center gap-3 mt-1.5">
        {file.folder && <span className="text-[10px]" style={{ color: '#2a2a3a' }}>{file.folder}</span>}
        <span className="text-[10px]" style={{ color: '#2a2a3a' }}>{new Date(file.updatedAt).toLocaleDateString()}</span>
        <span className="text-[10px]" style={{ color: '#2a2a3a' }}>{readingTime(file.content)}</span>
        {file.tags.slice(0, 4).map(t => (
          <span key={t} className="text-[10px] flex items-center gap-0.5" style={{ color: `${GOLD}60` }}>
            <Hash className="w-2 h-2" />#{t}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   EDITOR
══════════════════════════════════════════════════════ */
function VaultEditor({ file, editorRef }: { file: VaultFile; editorRef: React.MutableRefObject<any> }) {
  const { updateFile } = useVaultStore()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write… use [[link]] to connect notes, ![[note]] to embed.' }),
      CharacterCount, Highlight.configure({ multicolor: false }), Typography,
      TaskList, TaskItem.configure({ nested: true }), VaultLinksExt,
    ],
    content: file.content,
    onUpdate: ({ editor: ed }) => { updateFile(file.id, { content: ed.getText() }) },
    editorProps: { attributes: { class: 'vault-prose' } },
  }, [file.id])

  useEffect(() => { editorRef.current = editor }, [editor, editorRef])

  const BTNS = [
    { icon: <Bold className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleBold().run(), title: 'Bold (⌘B)' },
    { icon: <Italic className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleItalic().run(), title: 'Italic (⌘I)' },
    { icon: <Code className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleCode().run(), title: 'Code' },
    { icon: <Highlighter className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleHighlight().run(), title: 'Highlight' },
    null,
    { icon: <Heading1 className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run(), title: 'H1' },
    { icon: <Heading2 className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run(), title: 'H2' },
    null,
    { icon: <List className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleBulletList().run(), title: 'Bullet list' },
    { icon: <ListOrdered className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleOrderedList().run(), title: 'Numbered list' },
    { icon: <CheckSquare className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleTaskList().run(), title: 'Task list' },
    { icon: <Quote className="w-3 h-3" />, fn: (e: any) => e.chain().focus().toggleBlockquote().run(), title: 'Quote' },
  ]

  const words = editor?.storage.characterCount?.words() ?? 0
  const chars = editor?.storage.characterCount?.characters() ?? 0

  return (
    <div className="flex flex-col h-full" style={{ background: BASE }}>
      <div className="flex items-center flex-wrap gap-0.5 px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${B2}` }}>
        {BTNS.map((btn, i) =>
          btn === null ? <div key={i} className="w-px h-3.5 mx-1.5" style={{ background: BORDER }} /> : (
            <button key={i} onClick={() => btn.fn(editor)} title={btn.title}
              className="p-1.5 rounded-md transition-all duration-100 hover:bg-white/[0.06]"
              style={{ color: '#44445a' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0f0fa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#44445a')}>
              {btn.icon}
            </button>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <InlineTitle file={file} />
        <div className="px-10 pb-10">
          <style>{`
            .vault-prose { outline:none; color:#c8c8dc; font-size:14.5px; line-height:1.82; min-height:300px; font-family:'Inter',system-ui,sans-serif; }
            .vault-prose h1 { font-size:1.6em; font-weight:700; color:#f0f0fa; margin:1.4em 0 0.4em; letter-spacing:-0.02em; }
            .vault-prose h2 { font-size:1.25em; font-weight:600; color:#e4e4f4; margin:1.4em 0 0.35em; }
            .vault-prose h3 { font-size:1.08em; font-weight:600; color:#ccccde; margin:1.2em 0 0.3em; }
            .vault-prose p { margin-bottom:0.65em; }
            .vault-prose strong { color:#f0f0fa; font-weight:600; }
            .vault-prose em { color:${GOLD}cc; }
            .vault-prose code { background:${GOLD}0d; color:${GOLD}cc; padding:1px 6px; border-radius:4px; font-size:0.86em; border:1px solid ${GOLD}1a; font-family:'JetBrains Mono','Fira Code',monospace; }
            .vault-prose pre { background:rgba(255,255,255,0.025); border:1px solid ${BORDER}; padding:14px 18px; border-radius:12px; overflow-x:auto; margin:1em 0; }
            .vault-prose pre code { background:none; padding:0; border:none; color:#c4c4d8; }
            .vault-prose blockquote { border-left:3px solid ${GOLD}45; padding-left:16px; color:#8888aa; margin:0.8em 0; font-style:italic; }
            .vault-prose ul,.vault-prose ol { padding-left:22px; }
            .vault-prose li { margin-bottom:0.25em; }
            .vault-prose mark { background:${GOLD}1a; color:${GOLD}; padding:0 3px; border-radius:3px; }
            .vault-prose hr { border:none; border-top:1px solid ${BORDER}; margin:1.5em 0; }
            .vault-prose table { width:100%; border-collapse:collapse; font-size:13px; margin:1em 0; }
            .vault-prose th,.vault-prose td { border:1px solid ${BORDER}; padding:7px 12px; }
            .vault-prose th { background:rgba(255,255,255,0.03); font-weight:600; color:#e0e0f0; }
            .vault-prose p.is-editor-empty:first-child::before { content:attr(data-placeholder); color:#1e1e2e; pointer-events:none; height:0; float:left; }
            .vault-wikilink { color:${VIOLET}cc; background:rgba(167,139,250,0.07); border-radius:3px; padding:1px 3px; cursor:pointer; border-bottom:1px dashed ${VIOLET}50; transition:all 0.15s; }
            .vault-wikilink:hover { background:rgba(167,139,250,0.15); color:${VIOLET}; }
            .vault-embed { color:${TEAL}cc; background:rgba(45,212,191,0.07); border-radius:3px; padding:1px 3px; cursor:pointer; border-bottom:1px dashed ${TEAL}50; transition:all 0.15s; }
            .vault-embed:hover { background:rgba(45,212,191,0.14); color:${TEAL}; }
            input[type="checkbox"] { accent-color:${GOLD}; }
          `}</style>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="px-4 py-2 flex items-center gap-4 shrink-0" style={{ borderTop: `1px solid ${B2}` }}>
        <span className="text-[10px] tabular-nums" style={{ color: '#2a2a3a' }}>{words} words</span>
        <span className="text-[10px] tabular-nums" style={{ color: '#2a2a3a' }}>{chars} chars</span>
        <span className="text-[10px]" style={{ color: '#2a2a3a' }}>{readingTime(file.content)}</span>
        <span className="ml-auto text-[10px] flex items-center gap-1" style={{ color: '#4ade8088' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Saved
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════ */
function EmptyEditor({ onNew, onDaily, onCmd }: { onNew: () => void; onDaily: () => void; onCmd: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10" style={{ background: BASE }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}18` }}>
        <Brain className="w-8 h-8" style={{ color: `${GOLD}50` }} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold mb-1.5" style={{ color: '#8888aa' }}>Your second brain</p>
        <p className="text-[12px]" style={{ color: '#44445a' }}>Open a note, start writing, or search your vault</p>
      </div>
      <div className="flex gap-2.5">
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:opacity-80"
          style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}>
          <Plus className="w-3.5 h-3.5" /> New note
        </button>
        <button onClick={onCmd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:bg-white/[0.04]"
          style={{ border: `1px solid ${BORDER}`, color: '#8888aa' }}>
          <Command className="w-3.5 h-3.5" /> ⌘K
        </button>
        <button onClick={onDaily} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:bg-white/[0.04]"
          style={{ border: `1px solid ${BORDER}`, color: '#8888aa' }}>
          <Calendar className="w-3.5 h-3.5" /> Daily
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   LOCAL MINI GRAPH (SVG radial)
══════════════════════════════════════════════════════ */
function LocalGraph({ file }: { file: VaultFile }) {
  const { files, openTab, getOutgoingLinks, getBacklinks } = useVaultStore()
  const outgoing = getOutgoingLinks(file.id)
  const backlinks = getBacklinks(file.id)

  const related = useMemo(() => {
    const seen = new Set<string>(); const result: Array<{ file: VaultFile; type: 'out' | 'back' | 'both' }> = []
    for (const f of outgoing) {
      if (!seen.has(f.id)) { seen.add(f.id); result.push({ file: f, type: 'out' }) }
    }
    for (const f of backlinks) {
      if (seen.has(f.id)) { result.find(r => r.file.id === f.id)!.type = 'both' }
      else { seen.add(f.id); result.push({ file: f, type: 'back' }) }
    }
    return result.slice(0, 10)
  }, [file.id, outgoing, backlinks])

  const W = 260; const H = 180; const cx = W / 2; const cy = H / 2; const R = 70

  const nodes = related.map(({ file: f, type }, i) => {
    const angle = (i / Math.max(related.length, 1)) * 2 * Math.PI - Math.PI / 2
    return { ...f, type, x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R }
  })

  if (related.length === 0) return (
    <div className="flex flex-col items-center justify-center py-6 gap-2">
      <Network className="w-6 h-6" style={{ color: '#2a2a3a' }} />
      <p className="text-[11px]" style={{ color: '#2a2a3a' }}>No connections yet</p>
      <p className="text-[10px]" style={{ color: '#1e1e2e' }}>Use [[Note Name]] to link notes</p>
    </div>
  )

  return (
    <svg width={W} height={H} className="w-full">
      {/* Edges */}
      {nodes.map(n => (
        <line key={n.id} x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke={n.type === 'both' ? TEAL : n.type === 'out' ? `${GOLD}60` : `${VIOLET}50`}
          strokeWidth={1} strokeDasharray={n.type === 'back' ? '3,3' : undefined} />
      ))}

      {/* Center node */}
      <circle cx={cx} cy={cy} r={12} fill={`${GOLD}20`} stroke={GOLD} strokeWidth={1.5} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill={GOLD}>●</text>

      {/* Connected nodes */}
      {nodes.map(n => {
        const col = n.type === 'both' ? TEAL : n.type === 'out' ? GOLD : VIOLET
        const label = n.name.replace('.md', '').slice(0, 12) + (n.name.length > 15 ? '…' : '')
        return (
          <g key={n.id} onClick={() => openTab(n.id)} style={{ cursor: 'pointer' }}>
            <circle cx={n.x} cy={n.y} r={7} fill={`${col}15`} stroke={`${col}70`} strokeWidth={1} />
            <text x={n.x} y={n.y + 16} textAnchor="middle" fontSize={8} fill={`${col}90`}>{label}</text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(8,${H - 30})`}>
        <circle cx={4} cy={4} r={3} fill={`${GOLD}20`} stroke={GOLD} strokeWidth={1} />
        <text x={10} y={8} fontSize={7} fill="#44445a">outgoing</text>
        <circle cx={4} cy={14} r={3} fill={`${VIOLET}15`} stroke={`${VIOLET}70`} strokeWidth={1} />
        <text x={10} y={18} fontSize={7} fill="#44445a">backlink</text>
        <circle cx={4} cy={24} r={3} fill={`${TEAL}15`} stroke={`${TEAL}70`} strokeWidth={1} />
        <text x={10} y={28} fontSize={7} fill="#44445a">both</text>
      </g>
    </svg>
  )
}

/* ══════════════════════════════════════════════════════
   INFO PANEL (Properties + Outgoing + Backlinks + Local Graph)
══════════════════════════════════════════════════════ */
function InfoPanel({ file }: { file: VaultFile }) {
  const { openTab, getOutgoingLinks, getBacklinks } = useVaultStore()
  const outgoing = getOutgoingLinks(file.id)
  const backlinks = getBacklinks(file.id)
  const tags = file.tags ?? []
  const props = Object.entries(file.properties ?? {})
  const [section, setSection] = useState<'graph' | 'links' | 'meta'>('graph')

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 px-3 pt-3 gap-1">
        {[['graph', 'Graph'], ['links', 'Links'], ['meta', 'Meta']] .map(([id, label]) => (
          <button key={id} onClick={() => setSection(id as any)}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all"
            style={{ background: section === id ? `${GOLD}15` : 'transparent', color: section === id ? GOLD : '#44445a', border: section === id ? `1px solid ${GOLD}30` : '1px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {section === 'graph' && (
          <div>
            <LocalGraph file={file} />
            {(outgoing.length > 0 || backlinks.length > 0) && (
              <p className="text-[10px] mt-2 text-center" style={{ color: '#2a2a3a' }}>
                {outgoing.length} outgoing · {backlinks.length} backlinks · click to navigate
              </p>
            )}
          </div>
        )}

        {section === 'links' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#44445a' }}>
                <ArrowRight className="w-2.5 h-2.5" style={{ color: GOLD }} /> Outgoing ({outgoing.length})
              </div>
              {outgoing.length === 0 ? <p className="text-[11px]" style={{ color: '#2a2a3a' }}>No outgoing links</p> : (
                <div className="flex flex-col gap-1.5">
                  {outgoing.map(f => (
                    <button key={f.id} onClick={() => openTab(f.id)}
                      className="flex items-center gap-2 text-left w-full px-2.5 py-2 rounded-xl transition-all hover:bg-white/[0.03]"
                      style={{ background: B2, border: `1px solid ${BORDER}` }}>
                      <FileText className="w-2.5 h-2.5 shrink-0" style={{ color: `${GOLD}70` }} />
                      <span className="text-[11px] truncate" style={{ color: '#8888aa' }}>{f.name.replace('.md', '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#44445a' }}>
                <ChevronLeft className="w-2.5 h-2.5" style={{ color: VIOLET }} /> Backlinks ({backlinks.length})
              </div>
              {backlinks.length === 0 ? <p className="text-[11px]" style={{ color: '#2a2a3a' }}>No notes link here</p> : (
                <div className="flex flex-col gap-1.5">
                  {backlinks.map(f => (
                    <button key={f.id} onClick={() => openTab(f.id)}
                      className="flex items-center gap-2 text-left w-full px-2.5 py-2 rounded-xl transition-all hover:bg-white/[0.03]"
                      style={{ background: B2, border: `1px solid ${BORDER}` }}>
                      <FileText className="w-2.5 h-2.5 shrink-0" style={{ color: `${VIOLET}70` }} />
                      <span className="text-[11px] truncate" style={{ color: '#8888aa' }}>{f.name.replace('.md', '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {section === 'meta' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#44445a' }}>Properties</div>
              <div className="flex flex-col gap-1.5">
                {[['Created', new Date(file.createdAt).toLocaleDateString()], ['Modified', new Date(file.updatedAt).toLocaleDateString()], ['Folder', file.folder || '/'], ['Words', file.content.trim().split(/\s+/).length.toString()], ['Read time', readingTime(file.content)], ...props].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-0.5">
                    <span className="text-[11px]" style={{ color: '#44445a' }}>{k}</span>
                    <span className="text-[11px]" style={{ color: '#8888aa' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {tags.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: '#44445a' }}>
                  <Hash className="w-2.5 h-2.5" /> Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}10`, color: `${GOLD}cc`, border: `1px solid ${GOLD}22` }}>#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SUGGESTED NOTE CARD
══════════════════════════════════════════════════════ */
function SuggestedNoteCard({ suggestion, onCreate, onDismiss }: {
  suggestion: { title: string; folder: string; content: string }
  onCreate: () => void; onDismiss: () => void
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3 mt-2" style={{ background: `${TEAL}07`, border: `1px solid ${TEAL}22` }}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: `${TEAL}80` }}>Suggested Note</div>
          <div className="text-[12px] font-semibold" style={{ color: '#f0f0fa' }}>{suggestion.title}</div>
          {suggestion.folder && <div className="text-[10px] mt-0.5" style={{ color: '#44445a' }}>{suggestion.folder}</div>}
        </div>
        <button onClick={onDismiss} style={{ color: '#44445a' }}><X className="w-3 h-3" /></button>
      </div>
      <button onClick={onCreate}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
        style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}35`, color: TEAL }}>
        <Plus className="w-3 h-3" /> Create this note
      </button>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   CORTEX AGENT PANEL
══════════════════════════════════════════════════════ */
type AgentMessage = { role: 'user' | 'assistant'; content: string }
type Suggestion = { title: string; folder: string; content: string }

function CortexAgentPanel({ file, triggerAction }: { file: VaultFile | null; triggerAction: string | null }) {
  const { files, createFile, openTab } = useVaultStore()
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [gaps, setGaps] = useState<any>(null)
  const [gapsLoading, setGapsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'analyze' | 'gaps'>('chat')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages, loading])

  // External triggers from command palette
  useEffect(() => {
    if (!triggerAction) return
    if (triggerAction === 'analyze') { setActiveTab('analyze'); analyzeNote() }
    if (triggerAction === 'gaps') { setActiveTab('gaps'); findGaps() }
    if (triggerAction === 'synthesis') runDailySynthesis()
  }, [triggerAction])

  const vaultPayload = { files: files.map(f => ({ name: f.name, folder: f.folder, tags: f.tags, content: f.content.slice(0, 400), updatedAt: f.updatedAt })) }

  async function sendMessage(userMsg?: string) {
    const text = userMsg ?? input.trim()
    if (!text || loading) return
    setInput('')
    const newMessages: AgentMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages); setLoading(true); setSuggestion(null)
    try {
      const r = await fetch('/api/vault/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, currentNote: file ? { name: file.name, content: file.content, folder: file.folder, tags: file.tags } : undefined, vault: vaultPayload }),
      })
      const data = await r.json()
      const reply: string = data.reply ?? data.message ?? 'Error'
      const suggMatch = reply.match(/```suggestion\s*([\s\S]*?)```/)
      if (suggMatch) { try { setSuggestion(JSON.parse(suggMatch[1].trim())) } catch {} }
      setMessages([...newMessages, { role: 'assistant', content: reply.replace(/```suggestion[\s\S]*?```/g, '').trim() }])
    } catch { setMessages([...newMessages, { role: 'assistant', content: 'Connection error.' }]) }
    finally { setLoading(false) }
  }

  async function analyzeNote() {
    if (!file || analysisLoading) return
    setAnalysisLoading(true); setAnalysis(null)
    try {
      const r = await fetch('/api/vault/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: { name: file.name, content: file.content, tags: file.tags }, vault: vaultPayload }) })
      setAnalysis(await r.json())
    } catch { setAnalysis({ insight: 'Analysis failed.' }) }
    finally { setAnalysisLoading(false) }
  }

  async function findGaps() {
    if (gapsLoading) return
    setGapsLoading(true); setGaps(null)
    try {
      const r = await fetch('/api/vault/gaps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault: { files: files.map(f => ({ name: f.name, folder: f.folder, content: f.content.slice(0, 600), tags: f.tags })) } }) })
      setGaps(await r.json())
    } catch { setGaps({ missingNotes: [] }) }
    finally { setGapsLoading(false) }
  }

  async function runDailySynthesis() {
    setLoading(true)
    try {
      const r = await fetch('/api/vault/daily-synthesis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault: { files: files.map(f => ({ name: f.name, content: f.content, updatedAt: f.updatedAt, folder: f.folder })) } }) })
      const data = await r.json()
      openTab(createFile(data.title, 'Daily', data.content).id)
    } catch {}
    finally { setLoading(false) }
  }

  const QUICK = [
    { label: 'Expand this', icon: <Layers className="w-3 h-3" />, msg: "Expand on the ideas in this note. What's missing?" },
    { label: 'Find connections', icon: <GitBranch className="w-3 h-3" />, msg: 'What connections exist between this and my vault?' },
    { label: "What's missing?", icon: <AlertCircle className="w-3 h-3" />, msg: 'What knowledge gaps do you see? What should I write next?' },
    { label: 'Daily synthesis', icon: <Sparkles className="w-3 h-3" />, fn: runDailySynthesis },
  ]

  const TABS = [{ id: 'chat', label: 'Chat' }, { id: 'analyze', label: 'Analyze' }, { id: 'gaps', label: 'Gaps' }] as const

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all"
            style={{ color: activeTab === t.id ? TEAL : '#44445a', borderBottom: activeTab === t.id ? `2px solid ${TEAL}` : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {messages.length === 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${TEAL}14`, border: `1px solid ${TEAL}28` }}>
                  <Brain className="w-3.5 h-3.5" style={{ color: TEAL }} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold" style={{ color: '#f0f0fa' }}>Cortex Agent</div>
                  <div className="text-[10px]" style={{ color: '#44445a' }}>Your AI second brain</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {QUICK.map(a => (
                  <button key={a.label} onClick={() => a.fn ? a.fn() : sendMessage(a.msg)} disabled={loading}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ background: B2, border: `1px solid ${BORDER}`, color: '#8888aa' }}>
                    <span style={{ color: TEAL }}>{a.icon}</span>
                    <span className="text-[12px]">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="max-w-[92%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: `${GOLD}15`, border: `1px solid ${GOLD}28`, color: '#f0f0fa', borderBottomRightRadius: 6 }
                    : { background: B2, border: `1px solid ${BORDER}`, color: '#c4c4d8', borderBottomLeftRadius: 6 }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex">
                <div className="px-3 py-2.5 rounded-2xl" style={{ background: B2, border: `1px solid ${BORDER}`, borderBottomLeftRadius: 6 }}>
                  <div className="flex gap-1 items-center">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 0.9, repeat: Infinity, delay }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {suggestion && (
              <SuggestedNoteCard suggestion={suggestion}
                onCreate={() => { openTab(createFile(suggestion.title, suggestion.folder, suggestion.content).id); setSuggestion(null) }}
                onDismiss={() => setSuggestion(null)} />
            )}
          </div>
          {messages.length > 0 && (
            <div className="px-3 pt-1 pb-1 flex flex-wrap gap-1 shrink-0">
              {QUICK.slice(0, 3).map(a => (
                <button key={a.label} onClick={() => a.fn ? a.fn() : sendMessage(a.msg)} disabled={loading}
                  className="text-[10px] px-2 py-0.5 rounded-full transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: B2, color: '#8888aa', border: `1px solid ${BORDER}` }}>{a.label}</button>
              ))}
            </div>
          )}
          <div className="px-3 pb-3 pt-2 shrink-0">
            <div className="flex gap-2 items-end rounded-2xl px-3 py-2.5" style={{ background: B2, border: `1px solid ${BORDER}` }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Ask Cortex…" rows={1}
                style={{ resize: 'none', minHeight: 20, maxHeight: 80, color: '#f0f0fa', background: 'transparent' }}
                className="flex-1 text-[12px] placeholder:text-[#2a2a3a] outline-none leading-relaxed" />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl transition-all disabled:opacity-30 hover:opacity-80"
                style={{ background: TEAL, color: BASE }}>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analyze' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {!file ? <p className="text-[12px]" style={{ color: '#44445a' }}>Open a note to analyze it.</p> : (
            <>
              <button onClick={analyzeNote} disabled={analysisLoading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}28`, color: GOLD }}>
                {analysisLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {analysisLoading ? 'Analyzing…' : `Analyze "${file.name.replace('.md', '')}"`}
              </button>
              {analysis && (
                <div className="flex flex-col gap-4">
                  {analysis.insight && (
                    <div className="p-3.5 rounded-xl" style={{ background: `${TEAL}06`, border: `1px solid ${TEAL}18` }}>
                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: `${TEAL}70` }}>Insight</div>
                      <p className="text-[12px] leading-relaxed" style={{ color: '#c4c4d8' }}>{analysis.insight}</p>
                    </div>
                  )}
                  {analysis.suggestedTags?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#44445a' }}>Suggested Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.suggestedTags.map((t: string) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}10`, color: `${GOLD}cc`, border: `1px solid ${GOLD}22` }}>#{t}</span>)}
                      </div>
                    </div>
                  )}
                  {analysis.suggestedLinks?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#44445a' }}>Link To</div>
                      <div className="flex flex-col gap-1.5">
                        {analysis.suggestedLinks.map((t: string) => <span key={t} className="text-[11px] px-2.5 py-1.5 rounded-lg font-mono" style={{ background: 'rgba(167,139,250,0.05)', color: `${VIOLET}bb`, border: `1px solid rgba(167,139,250,0.12)` }}>[[{t}]]</span>)}
                      </div>
                    </div>
                  )}
                  {analysis.gaps?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#44445a' }}>Gaps</div>
                      {analysis.gaps.map((g: string) => (
                        <div key={g} className="flex items-start gap-2 text-[11px] mb-1.5" style={{ color: '#8888aa' }}>
                          <AlertCircle className="w-3 h-3 shrink-0 mt-px" style={{ color: '#f59e0b' }} />{g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'gaps' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <button onClick={findGaps} disabled={gapsLoading}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25`, color: GOLD }}>
            {gapsLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
            {gapsLoading ? 'Scanning…' : 'Scan Knowledge Gaps'}
          </button>
          {gaps && (
            <div className="flex flex-col gap-4">
              {gaps.nextToWrite && (
                <div className="p-3.5 rounded-xl" style={{ background: `${GOLD}07`, border: `1px solid ${GOLD}20` }}>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: `${GOLD}70` }}>Write Next</div>
                  <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#f0f0fa' }}>{gaps.nextToWrite.title}</div>
                  <div className="text-[10px] mb-2.5" style={{ color: '#44445a' }}>{gaps.nextToWrite.folder}</div>
                  <button onClick={() => openTab(createFile(gaps.nextToWrite.title, gaps.nextToWrite.folder, gaps.nextToWrite.starterContent || '').id)}
                    className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}32`, color: GOLD }}>Create →</button>
                </div>
              )}
              {gaps.missingNotes?.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#44445a' }}>Missing Notes</div>
                  <div className="flex flex-col gap-2">
                    {gaps.missingNotes.map((n: any) => (
                      <div key={n.title} className="p-3 rounded-xl" style={{ background: B2, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium truncate" style={{ color: '#e0e0f0' }}>{n.title}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: '#44445a' }}>{n.folder} · {n.why}</div>
                          </div>
                          <button onClick={() => openTab(createFile(n.title, n.folder, `# ${n.title}\n\n`).id)}
                            className="text-[10px] shrink-0 px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                            style={{ background: `${GOLD}12`, color: `${GOLD}bb`, border: `1px solid ${GOLD}22` }}>Create</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {gaps.missingLinks?.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#44445a' }}>Broken WikiLinks</div>
                  <div className="flex flex-wrap gap-1.5">
                    {gaps.missingLinks.slice(0, 8).map((link: string) => (
                      <span key={link} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background: 'rgba(248,113,113,0.06)', color: '#f87171aa', border: '1px solid rgba(248,113,113,0.15)' }}>[[{link}]]</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   RIGHT PANEL
══════════════════════════════════════════════════════ */
type RightTab = 'agent' | 'info'

function RightPanel({ file, agentTrigger }: { file: VaultFile | null; agentTrigger: string | null }) {
  const [tab, setTab] = useState<RightTab>('agent')
  return (
    <div className="flex flex-col h-full" style={{ background: PANEL }}>
      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => setTab('agent')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all"
          style={{ color: tab === 'agent' ? TEAL : '#44445a', borderBottom: tab === 'agent' ? `2px solid ${TEAL}` : '2px solid transparent' }}>
          <Brain className="w-2.5 h-2.5" /> Agent
        </button>
        <button onClick={() => setTab('info')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all"
          style={{ color: tab === 'info' ? GOLD : '#44445a', borderBottom: tab === 'info' ? `2px solid ${GOLD}` : '2px solid transparent' }}>
          <Network className="w-2.5 h-2.5" /> Info
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'agent'
          ? <CortexAgentPanel file={file} triggerAction={agentTrigger} />
          : file ? <InfoPanel file={file} /> : <div className="p-4 text-[12px]" style={{ color: '#44445a' }}>Open a note to see info.</div>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN VAULT
══════════════════════════════════════════════════════ */
export default function Vault() {
  const { files, activeTabId, splitTabId, openTab, createFile, createDailyNote, updateFile, setSplitTab } = useVaultStore()
  const [rightOpen, setRightOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [agentTrigger, setAgentTrigger] = useState<string | null>(null)
  const [behaviorLoading, setBehaviorLoading] = useState(false)
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWRef = useRef(240)
  const editorRef = useRef<any>(null)
  const splitEditorRef = useRef<any>(null)

  const activeFile = activeTabId ? files.find(f => f.id === activeTabId) ?? null : null
  const splitFile = splitTabId ? files.find(f => f.id === splitTabId) ?? null : null

  // ⌘K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v) }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true; startXRef.current = e.clientX; startWRef.current = sidebarWidth
  }, [sidebarWidth])

  useEffect(() => {
    function onMove(e: MouseEvent) { if (!resizingRef.current) return; setSidebarWidth(Math.max(180, Math.min(420, startWRef.current + e.clientX - startXRef.current))) }
    function onUp() { resizingRef.current = false }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function insertLink(title: string) {
    const editor = editorRef.current
    if (!editor) return
    editor.chain().focus().insertContent(`[[${title}]]`).run()
    if (activeFile) updateFile(activeFile.id, { content: editor.getText() })
  }

  async function handleBehaviorInsights() {
    setBehaviorLoading(true); trackFeature('/vault', 'behavior_insights_requested')
    try {
      const r = await fetch('/api/activity/vault-synthesis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 14 }) })
      const data = await r.json()
      if (data.title && data.content) openTab(createFile(data.title, data.folder || 'Daily', data.content).id)
    } catch {}
    finally { setBehaviorLoading(false) }
  }

  function triggerAgent(action: string) {
    if (!rightOpen) setRightOpen(true)
    setAgentTrigger(null)
    setTimeout(() => setAgentTrigger(action), 50)
  }

  return (
    <ClientLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: BASE, fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Command Palette */}
        <AnimatePresence>
          {cmdOpen && (
            <CommandPalette
              onClose={() => setCmdOpen(false)}
              onAnalyze={() => triggerAgent('analyze')}
              onGaps={() => triggerAgent('gaps')}
              onSynthesis={() => triggerAgent('synthesis')}
              onBehavior={handleBehaviorInsights} />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center px-5 h-[46px] shrink-0 gap-4"
          style={{ background: 'rgba(6,6,11,0.96)', borderBottom: `1px solid ${BORDER}`, backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}28` }}>
              <Brain className="w-3.5 h-3.5" style={{ color: GOLD }} />
            </div>
            <span className="text-[13px] font-bold tracking-tight" style={{ color: '#f0f0fa' }}>Cortex Vault</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${GOLD}0d`, color: `${GOLD}70`, border: `1px solid ${GOLD}18` }}>Second Brain</span>
          </div>

          {activeFile && (
            <div className="flex items-center gap-1 text-[11px]" style={{ color: '#2a2a3a' }}>
              <ChevronRight className="w-3 h-3" />
              {activeFile.folder && <><span>{activeFile.folder}</span><ChevronRight className="w-3 h-3" /></>}
              <span style={{ color: '#8888aa' }}>{activeFile.name.replace('.md', '')}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCmdOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
              style={{ background: B2, border: `1px solid ${BORDER}`, color: '#44445a' }}>
              <Command className="w-3 h-3" />
              <span className="font-mono text-[10px]">⌘K</span>
            </button>
            <button onClick={handleBehaviorInsights} disabled={behaviorLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: 'rgba(45,212,191,0.07)', border: `1px solid rgba(45,212,191,0.22)`, color: TEAL }}>
              {behaviorLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
              Insights
            </button>
            <a href="/knowledge-graph"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 no-underline"
              style={{ background: B2, border: `1px solid ${BORDER}`, color: '#8888aa' }}>
              <Network className="w-3 h-3" /> Graph
            </a>
            <button onClick={() => { openTab(createFile('Untitled').id); trackFeature('/vault', 'note_created') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
              style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}>
              <Plus className="w-3 h-3" /> New Note
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <VaultSidebar width={sidebarWidth} onResizeStart={handleResizeStart} onCmd={() => setCmdOpen(true)} />

          <div className="flex flex-col flex-1 overflow-hidden">
            <TabBar rightOpen={rightOpen} onToggleRight={() => setRightOpen(v => !v)}
              splitTabId={splitTabId} onToggleSplit={() => setSplitTab(splitTabId ? null : activeTabId)} />

            <div className="flex flex-1 overflow-hidden">
              {/* Editor(s) */}
              <div className="flex flex-1 overflow-hidden">
                {/* Primary editor */}
                <div className={`flex flex-col overflow-hidden ${splitFile ? 'flex-1' : 'flex-1'}`}
                  style={{ borderRight: splitFile ? `1px solid ${BORDER}` : undefined }}>
                  <AnimatePresence mode="wait">
                    {activeFile ? (
                      <motion.div key={activeFile.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="flex-1 overflow-hidden flex flex-col">
                        <AnimatePresence>
                          {activeFile && <SmartLinkBar key="sl" file={activeFile} onInsert={insertLink} />}
                        </AnimatePresence>
                        <VaultEditor file={activeFile} editorRef={editorRef} />
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex">
                        <EmptyEditor onNew={() => openTab(createFile('Untitled').id)} onDaily={() => openTab(createDailyNote().id)} onCmd={() => setCmdOpen(true)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Split pane */}
                <AnimatePresence>
                  {splitFile && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: '50%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden flex flex-col shrink-0" style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}`, background: `${TEAL}05` }}>
                        <Columns2 className="w-3 h-3" style={{ color: `${TEAL}60` }} />
                        <span className="text-[11px] font-medium flex-1 truncate" style={{ color: '#8888aa' }}>{splitFile.name.replace('.md', '')}</span>
                        <button onClick={() => setSplitTab(null)} style={{ color: '#44445a' }}><X className="w-3 h-3" /></button>
                      </div>
                      <VaultEditor file={splitFile} editorRef={splitEditorRef} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right panel */}
              <AnimatePresence>
                {rightOpen && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 290, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="shrink-0 overflow-hidden" style={{ borderLeft: `1px solid ${BORDER}` }}>
                    <div className="w-[290px] h-full flex flex-col overflow-hidden">
                      <RightPanel file={activeFile} agentTrigger={agentTrigger} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}
