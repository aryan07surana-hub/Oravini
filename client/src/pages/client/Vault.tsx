import { useState, useCallback, useRef, useEffect } from 'react'
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
  CheckSquare, Quote, Network, Calendar, Trash2, Edit3, MoreHorizontal,
  BookOpen, Zap, Columns, PanelRight, PanelRightClose,
} from 'lucide-react'
import { useVaultStore, type VaultFile } from '@/stores/vaultStore'
import ClientLayout from '@/components/layout/ClientLayout'

const BG = '#0b0b14'
const PANEL = '#0f0f1a'
const BORDER = 'rgba(255,255,255,0.07)'
const TEXT = '#e2e2f0'
const MUTED = '#6b6b8a'
const ACCENT = '#a78bfa'
const GOLD = '#d4b461'

/* ─── WikiLink extension (opens vault files on click) ─── */
const VaultWikiLinkExt = Extension.create({
  name: 'vaultWikilink',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('vaultWikilink'),
        props: {
          decorations(state) {
            const { doc } = state
            const decs: Decoration[] = []
            const regex = /\[\[([^\]]+)\]\]/g
            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              let m
              regex.lastIndex = 0
              while ((m = regex.exec(node.text)) !== null) {
                decs.push(
                  Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
                    class: 'vault-wikilink',
                    'data-target': m[1],
                  })
                )
              }
            })
            return DecorationSet.create(doc, decs)
          },
          handleDOMEvents: {
            click(_view, event) {
              const t = event.target as HTMLElement
              if (t.classList.contains('vault-wikilink')) {
                const name = t.getAttribute('data-target') ?? ''
                if (name) {
                  const { files, openTab } = useVaultStore.getState()
                  const found = files.find(
                    (f) => f.name.replace('.md', '').toLowerCase() === name.toLowerCase()
                  )
                  if (found) { openTab(found.id); return true }
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

/* ─── File tree node ─── */
function FileRow({
  file,
  active,
  onOpen,
  onDelete,
  onStar,
}: {
  file: VaultFile
  active: boolean
  onOpen: () => void
  onDelete: () => void
  onStar: () => void
}) {
  const [hover, setHover] = useState(false)
  const [menu, setMenu] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 20px',
        borderRadius: 6,
        cursor: 'pointer',
        background: active ? `${ACCENT}18` : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        position: 'relative',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenu(false) }}
      onClick={onOpen}
    >
      <FileText size={12} style={{ color: active ? ACCENT : MUTED, flexShrink: 0 }} />
      <span
        style={{
          fontSize: 12,
          color: active ? TEXT : '#aaa',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {file.name.replace('.md', '')}
      </span>
      {file.starred && <Star size={9} style={{ color: GOLD, flexShrink: 0 }} />}
      {hover && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onStar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: file.starred ? GOLD : MUTED }}
          >
            <Star size={10} />
          </button>
          <button
            onClick={() => setMenu(!menu)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: MUTED }}
          >
            <MoreHorizontal size={10} />
          </button>
          {menu && (
            <div
              style={{
                position: 'absolute',
                right: 8,
                top: 22,
                background: '#1a1a2e',
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                zIndex: 100,
                overflow: 'hidden',
                minWidth: 120,
              }}
            >
              <button
                onClick={onDelete}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                  color: '#f87171', fontSize: 12,
                }}
              >
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Folder section ─── */
function FolderSection({
  name,
  files,
  activeId,
  onOpen,
  onDelete,
  onStar,
}: {
  name: string
  files: VaultFile[]
  activeId: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onStar: (id: string) => void
}) {
  const { folders, toggleFolder, createFile } = useVaultStore()
  const folder = folders.find((f) => f.name === name)
  const open = folder?.open ?? true

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => folder && toggleFolder(folder.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, width: '100%',
          padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer',
          color: MUTED, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {open
          ? <FolderOpen size={12} style={{ color: GOLD }} />
          : <Folder size={12} style={{ color: GOLD }} />}
        {name}
        <span style={{ marginLeft: 'auto', color: '#444', fontSize: 10 }}>{files.length}</span>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                active={activeId === file.id}
                onOpen={() => onOpen(file.id)}
                onDelete={() => onDelete(file.id)}
                onStar={() => onStar(file.id)}
              />
            ))}
            {files.length === 0 && (
              <div style={{ padding: '4px 20px', fontSize: 11, color: '#444' }}>
                Empty
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Sidebar ─── */
function VaultSidebar({
  width,
  onResizeStart,
}: {
  width: number
  onResizeStart: (e: React.MouseEvent) => void
}) {
  const {
    files, folders, activeTabId, openTab, deleteFile, toggleStar,
    createFile, createDailyNote, searchFiles, createFolder,
  } = useVaultStore()

  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const starred = files.filter((f) => f.starred)
  const allFolderNames = [
    ...folders.map((f) => f.name),
    ...[...new Set(files.map((f) => f.folder).filter(Boolean))].filter(
      (f) => !folders.find((fd) => fd.name === f)
    ),
  ]

  const displayFiles = search.trim() ? searchFiles(search) : null

  function handleCreate() {
    if (!newName.trim()) return
    const file = createFile(newName.trim())
    openTab(file.id)
    setNewName('')
    setCreating(false)
  }

  return (
    <div
      style={{
        width,
        minWidth: 180,
        maxWidth: 400,
        background: PANEL,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 10px 8px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <BookOpen size={14} style={{ color: ACCENT }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '0.02em' }}>
            Cortex Vault
          </span>
          <button
            onClick={() => setCreating(true)}
            style={{
              marginLeft: 'auto', background: `${ACCENT}20`, border: `1px solid ${ACCENT}40`,
              borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: ACCENT, display: 'flex',
              alignItems: 'center', gap: 3,
            }}
            title="New note"
          >
            <Plus size={11} />
          </button>
          <button
            onClick={() => { const f = createDailyNote(); openTab(f.id) }}
            style={{
              background: `${GOLD}18`, border: `1px solid ${GOLD}40`,
              borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: GOLD, display: 'flex',
              alignItems: 'center',
            }}
            title="Today's daily note"
          >
            <Calendar size={11} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault…"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
              borderRadius: 7, padding: '5px 8px 5px 26px', fontSize: 12, color: TEXT,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* New file input */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}` }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Note name…"
              style={{
                width: '100%', background: 'rgba(167,139,250,0.08)', border: `1px solid ${ACCENT}60`,
                borderRadius: 7, padding: '6px 10px', fontSize: 12, color: TEXT,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {search.trim() && displayFiles ? (
          <div>
            <div style={{ padding: '2px 10px 6px', fontSize: 10, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Results ({displayFiles.length})
            </div>
            {displayFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                active={activeTabId === file.id}
                onOpen={() => openTab(file.id)}
                onDelete={() => deleteFile(file.id)}
                onStar={() => toggleStar(file.id)}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Starred */}
            {starred.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ padding: '2px 10px 4px', fontSize: 10, color: GOLD, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={10} /> Starred
                </div>
                {starred.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    active={activeTabId === file.id}
                    onOpen={() => openTab(file.id)}
                    onDelete={() => deleteFile(file.id)}
                    onStar={() => toggleStar(file.id)}
                  />
                ))}
              </div>
            )}

            {/* Folders */}
            {allFolderNames.map((name) => (
              <FolderSection
                key={name}
                name={name}
                files={files.filter((f) => f.folder === name)}
                activeId={activeTabId}
                onOpen={(id) => openTab(id)}
                onDelete={(id) => deleteFile(id)}
                onStar={(id) => toggleStar(id)}
              />
            ))}

            {/* Root (no folder) */}
            {files.filter((f) => !f.folder).length > 0 && (
              <FolderSection
                key="root"
                name="Notes"
                files={files.filter((f) => !f.folder)}
                activeId={activeTabId}
                onOpen={(id) => openTab(id)}
                onDelete={(id) => deleteFile(id)}
                onStar={(id) => toggleStar(id)}
              />
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 10, color: MUTED }}>{files.length} notes</span>
        <span style={{ fontSize: 10, color: MUTED }}>{allFolderNames.length} folders</span>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute', right: -3, top: 0, bottom: 0, width: 6,
          cursor: 'col-resize', zIndex: 10,
        }}
      />
    </div>
  )
}

/* ─── Tab bar ─── */
function TabBar({ rightOpen, onToggleRight }: { rightOpen: boolean; onToggleRight: () => void }) {
  const { openTabIds, activeTabId, files, openTab, closeTab } = useVaultStore()
  const tabs = openTabIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as VaultFile[]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: `1px solid ${BORDER}`,
        background: '#0c0c18',
        flexShrink: 0,
        overflowX: 'auto',
        minHeight: 36,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => openTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 36, cursor: 'pointer', flexShrink: 0,
              borderRight: `1px solid ${BORDER}`,
              background: active ? `${ACCENT}12` : 'transparent',
              borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
            }}
          >
            <FileText size={11} style={{ color: active ? ACCENT : MUTED }} />
            <span style={{ fontSize: 12, color: active ? TEXT : MUTED, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab.name.replace('.md', '')}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={10} />
            </button>
          </div>
        )
      })}
      <div style={{ marginLeft: 'auto', padding: '0 10px', flexShrink: 0 }}>
        <button
          onClick={onToggleRight}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: rightOpen ? ACCENT : MUTED, display: 'flex', alignItems: 'center' }}
          title={rightOpen ? 'Close properties' : 'Open properties'}
        >
          {rightOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
        </button>
      </div>
    </div>
  )
}

/* ─── Editor ─── */
function VaultEditor({ file }: { file: VaultFile }) {
  const { updateFile } = useVaultStore()

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: 'Write anything… Use [[Note Name]] to link notes.' }),
        CharacterCount,
        Highlight.configure({ multicolor: false }),
        Typography,
        TaskList,
        TaskItem.configure({ nested: true }),
        VaultWikiLinkExt,
      ],
      content: file.content,
      onUpdate: ({ editor: ed }) => {
        updateFile(file.id, { content: ed.getText() })
      },
      editorProps: { attributes: { class: 'vault-prose' } },
    },
    [file.id]
  )

  const BTNS = [
    { icon: <Bold size={12} />, fn: (e: any) => e.chain().focus().toggleBold().run(), title: 'Bold' },
    { icon: <Italic size={12} />, fn: (e: any) => e.chain().focus().toggleItalic().run(), title: 'Italic' },
    { icon: <Code size={12} />, fn: (e: any) => e.chain().focus().toggleCode().run(), title: 'Code' },
    { icon: <Highlighter size={12} />, fn: (e: any) => e.chain().focus().toggleHighlight().run(), title: 'Highlight' },
    null,
    { icon: <Heading1 size={12} />, fn: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run(), title: 'H1' },
    { icon: <Heading2 size={12} />, fn: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run(), title: 'H2' },
    null,
    { icon: <List size={12} />, fn: (e: any) => e.chain().focus().toggleBulletList().run(), title: 'List' },
    { icon: <ListOrdered size={12} />, fn: (e: any) => e.chain().focus().toggleOrderedList().run(), title: 'Ordered' },
    { icon: <CheckSquare size={12} />, fn: (e: any) => e.chain().focus().toggleTaskList().run(), title: 'Tasks' },
    { icon: <Quote size={12} />, fn: (e: any) => e.chain().focus().toggleBlockquote().run(), title: 'Quote' },
  ]

  const words = editor?.storage.characterCount?.words() ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1,
          padding: '6px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
        }}
      >
        {BTNS.map((btn, i) =>
          btn === null ? (
            <div key={i} style={{ width: 1, height: 14, background: BORDER, margin: '0 4px' }} />
          ) : (
            <button
              key={i}
              onClick={() => btn.fn(editor)}
              title={btn.title}
              style={{
                padding: '4px 6px', borderRadius: 5, border: 'none',
                background: 'transparent', color: MUTED, cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget.style.color = TEXT)
                ;(e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget.style.color = MUTED)
                ;(e.currentTarget.style.background = 'transparent')
              }}
            >
              {btn.icon}
            </button>
          )
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        <style>{`
          .vault-prose { outline: none; color: ${TEXT}; font-size: 14px; line-height: 1.75; min-height: 300px; }
          .vault-prose h1 { font-size: 1.7em; font-weight: 700; color: #f0f0fa; margin-bottom: 0.5em; }
          .vault-prose h2 { font-size: 1.3em; font-weight: 600; color: #ddd; margin-bottom: 0.4em; }
          .vault-prose h3 { font-size: 1.1em; font-weight: 600; color: #ccc; margin-bottom: 0.3em; }
          .vault-prose p { margin-bottom: 0.65em; }
          .vault-prose strong { color: #f0f0fa; font-weight: 600; }
          .vault-prose em { color: #a78bfa; }
          .vault-prose code { background: rgba(167,139,250,0.12); color: #c4b5fd; padding: 1px 5px; border-radius: 4px; font-size: 0.87em; }
          .vault-prose pre { background: #1a1a2e; padding: 12px 16px; border-radius: 8px; overflow-x: auto; }
          .vault-prose pre code { background: none; padding: 0; }
          .vault-prose blockquote { border-left: 3px solid #a78bfa; padding-left: 14px; color: #888; margin: 0.5em 0; }
          .vault-prose ul, .vault-prose ol { padding-left: 20px; }
          .vault-prose li { margin-bottom: 0.2em; }
          .vault-prose mark { background: rgba(253,224,71,0.2); color: #fde047; padding: 0 2px; border-radius: 2px; }
          .vault-prose hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 1.2em 0; }
          .vault-prose table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .vault-prose th, .vault-prose td { border: 1px solid rgba(255,255,255,0.08); padding: 6px 10px; text-align: left; }
          .vault-prose th { background: rgba(255,255,255,0.05); font-weight: 600; }
          .vault-prose p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #3a3a5c; pointer-events: none; height: 0; float: left; }
          .vault-wikilink { color: #a78bfa; text-decoration: none; background: rgba(167,139,250,0.1); border-radius: 3px; padding: 0 2px; cursor: pointer; }
          .vault-wikilink:hover { background: rgba(167,139,250,0.2); }
          input[type="checkbox"] { accent-color: #a78bfa; }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '6px 16px', borderTop: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: MUTED }}>{words} words</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#34d399' }}>● Auto-saved</span>
      </div>
    </div>
  )
}

/* ─── Empty editor state ─── */
function EmptyEditor({ onNew, onDaily }: { onNew: () => void; onDaily: () => void }) {
  const { createFile, openTab, createDailyNote } = useVaultStore()
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, color: MUTED, padding: 40,
      }}
    >
      <BookOpen size={40} style={{ color: '#2a2a40' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: '#555', marginBottom: 6 }}>No note open</p>
        <p style={{ fontSize: 12, color: '#333' }}>Select a note from the sidebar or create a new one</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onNew}
          style={{
            padding: '8px 16px', background: `${ACCENT}20`, border: `1px solid ${ACCENT}50`,
            borderRadius: 8, color: ACCENT, fontSize: 13, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={13} /> New note
        </button>
        <button
          onClick={onDaily}
          style={{
            padding: '8px 16px', background: `${GOLD}18`, border: `1px solid ${GOLD}40`,
            borderRadius: 8, color: GOLD, fontSize: 13, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 6,
          }}
        >
          <Calendar size={13} /> Today's note
        </button>
      </div>
    </div>
  )
}

/* ─── Backlinks panel ─── */
function BacklinksPanel({ file }: { file: VaultFile }) {
  const { files, openTab } = useVaultStore()
  const noteName = file.name.replace('.md', '')

  const backlinks = files.filter(
    (f) => f.id !== file.id && f.content.includes(`[[${noteName}]]`)
  )

  const tags = file.tags ?? []
  const props = Object.entries(file.properties ?? {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      {/* Properties */}
      <div>
        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Properties
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: MUTED }}>Created</span>
            <span style={{ color: TEXT }}>{new Date(file.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: MUTED }}>Modified</span>
            <span style={{ color: TEXT }}>{new Date(file.updatedAt).toLocaleDateString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: MUTED }}>Folder</span>
            <span style={{ color: TEXT }}>{file.folder || '/'}</span>
          </div>
          {props.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: MUTED }}>{k}</span>
              <span style={{ color: TEXT, maxWidth: 100, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Tags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10, background: `${ACCENT}18`, color: ACCENT,
                  border: `1px solid ${ACCENT}30`, borderRadius: 10, padding: '2px 7px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks */}
      <div>
        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Backlinks ({backlinks.length})
        </div>
        {backlinks.length === 0 ? (
          <p style={{ fontSize: 11, color: '#333' }}>No notes link here yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {backlinks.map((f) => (
              <button
                key={f.id}
                onClick={() => openTab(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: '6px 8px', cursor: 'pointer', width: '100%',
                }}
              >
                <FileText size={11} style={{ color: ACCENT, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name.replace('.md', '')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Vault page ─── */
export default function Vault() {
  const { files, openTabIds, activeTabId, openTab, createFile, createDailyNote } = useVaultStore()

  const [rightOpen, setRightOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const resizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWRef = useRef(240)

  const activeFile = activeTabId ? files.find((f) => f.id === activeTabId) : null

  // Sidebar resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true
    startXRef.current = e.clientX
    startWRef.current = sidebarWidth
  }, [sidebarWidth])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingRef.current) return
      const delta = e.clientX - startXRef.current
      setSidebarWidth(Math.max(180, Math.min(400, startWRef.current + delta)))
    }
    function onUp() { resizingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function handleNewNote() {
    const file = createFile('Untitled')
    openTab(file.id)
  }

  function handleDailyNote() {
    const file = createDailyNote()
    openTab(file.id)
  }

  return (
    <ClientLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: BG,
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            height: 44,
            borderBottom: `1px solid ${BORDER}`,
            background: '#090912',
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={14} style={{ color: GOLD }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '0.04em' }}>
              CORTEX
            </span>
            <span style={{ fontSize: 10, color: MUTED, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
              Second Brain
            </span>
          </div>

          {activeFile && (
            <span style={{ fontSize: 12, color: MUTED }}>
              {activeFile.folder && <>{activeFile.folder} / </>}
              {activeFile.name.replace('.md', '')}
            </span>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href="/knowledge-graph"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                borderRadius: 7, color: MUTED, fontSize: 11, textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Network size={12} /> Graph View
            </a>
            <button
              onClick={handleNewNote}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                background: `${ACCENT}20`, border: `1px solid ${ACCENT}50`,
                borderRadius: 7, color: ACCENT, fontSize: 11, cursor: 'pointer',
              }}
            >
              <Plus size={12} /> New Note
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <VaultSidebar width={sidebarWidth} onResizeStart={handleResizeStart} />

          {/* Editor area */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <TabBar rightOpen={rightOpen} onToggleRight={() => setRightOpen((v) => !v)} />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Editor */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence mode="wait">
                  {activeFile ? (
                    <motion.div
                      key={activeFile.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    >
                      <VaultEditor file={activeFile} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ flex: 1, display: 'flex' }}
                    >
                      <EmptyEditor onNew={handleNewNote} onDaily={handleDailyNote} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right panel */}
              <AnimatePresence>
                {rightOpen && activeFile && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      borderLeft: `1px solid ${BORDER}`,
                      background: PANEL,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ width: 260, height: '100%', overflowY: 'auto' }}>
                      <BacklinksPanel file={activeFile} />
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
