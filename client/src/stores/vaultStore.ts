import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

export interface VaultFile {
  id: string
  name: string
  folder: string
  content: string
  tags: string[]
  starred: boolean
  nodeId?: string
  properties: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface VaultFolder {
  id: string
  name: string
  open: boolean
}

export type ViewMode = 'graph' | 'editor' | 'split'

const DEFAULT_FOLDERS: VaultFolder[] = [
  { id: 'f-niches',     name: 'Niches',     open: true  },
  { id: 'f-content',    name: 'Content',    open: true  },
  { id: 'f-daily',      name: 'Daily',      open: false },
  { id: 'f-ideas',      name: 'Ideas',      open: false },
  { id: 'f-hooks',      name: 'Hooks',      open: false },
  { id: 'f-research',   name: 'Research',   open: false },
  { id: 'f-recordings', name: 'Recordings', open: false },
]

const WELCOME_FILE: VaultFile = {
  id: 'welcome',
  name: 'Welcome to Cortex.md',
  folder: '',
  content: `# Welcome to Cortex

Your second brain for content — built like Obsidian, powered by live intelligence.

## Getting started

1. **Add a niche** — Click + in the top bar → New Niche. Cortex pulls live intelligence.
2. **Write notes** — Every node has a notepad. Write anything here.
3. **Link ideas** — Type \`[[Note Name]]\` to create a live connection between notes.
4. **Upload files** — Drag and drop \`.md\` files to import your existing notes.
5. **View the graph** — Switch to Graph mode to see all your knowledge connected.

## What makes Cortex different

Unlike Obsidian, every niche node here is backed by **live platform data** — engagement rates, viral scores, content gaps, trending hooks. Your second brain knows what the market knows.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| \`⌘K\` | Command palette |
| \`⌘F\` | Search vault |
| \`⌘N\` | New note |
| \`⌘\\\` | Toggle sidebar |
| \`⌘L\` | Local graph mode |
| \`Esc\` | Deselect / close |

---

*Start by adding your first niche →*
`,
  tags: ['getting-started'],
  starred: true,
  properties: { type: 'guide', status: 'active' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

interface VaultState {
  files: VaultFile[]
  folders: VaultFolder[]
  openTabIds: string[]
  activeTabId: string | null
  splitTabId: string | null
  viewMode: ViewMode
  sidebarWidth: number
  pinnedIds: string[]

  createFile: (name: string, folder?: string, content?: string) => VaultFile
  createFolder: (name: string) => VaultFolder
  updateFile: (id: string, updates: Partial<VaultFile>) => void
  deleteFile: (id: string) => void
  renameFile: (id: string, name: string) => void
  openTab: (id: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string | null) => void
  setSplitTab: (id: string | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleFolder: (id: string) => void
  toggleStar: (id: string) => void
  importMarkdown: (name: string, content: string, folder?: string) => VaultFile
  createDailyNote: () => VaultFile
  searchFiles: (q: string) => VaultFile[]
  getFileById: (id: string) => VaultFile | undefined
  setSidebarWidth: (w: number) => void
  moveToFolder: (id: string, folder: string) => void
  duplicateFile: (id: string) => VaultFile
  getOutgoingLinks: (id: string) => VaultFile[]
  getBacklinks: (id: string) => VaultFile[]
  togglePin: (id: string) => void
}

function parseTags(content: string): string[] {
  const tags: string[] = []
  const tagRegex = /#([a-zA-Z0-9_-]+)/g
  let m
  while ((m = tagRegex.exec(content)) !== null) tags.push(m[1])
  return [...new Set(tags)]
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      files: [WELCOME_FILE],
      folders: DEFAULT_FOLDERS,
      openTabIds: ['welcome'],
      activeTabId: 'welcome',
      splitTabId: null,
      viewMode: 'editor',
      sidebarWidth: 240,
      pinnedIds: [],

      createFile: (name, folder = '', content = '') => {
        const clean = name.endsWith('.md') ? name : `${name}.md`
        const file: VaultFile = {
          id: nanoid(),
          name: clean,
          folder,
          content,
          tags: parseTags(content),
          starred: false,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          files: [...s.files, file],
          openTabIds: s.openTabIds.includes(file.id) ? s.openTabIds : [...s.openTabIds, file.id],
          activeTabId: file.id,
        }))
        return file
      },

      createFolder: (name) => {
        const folder: VaultFolder = { id: nanoid(), name, open: true }
        set((s) => ({ folders: [...s.folders, folder] }))
        return folder
      },

      updateFile: (id, updates) => {
        set((s) => ({
          files: s.files.map((f) =>
            f.id === id
              ? { ...f, ...updates, tags: updates.content ? parseTags(updates.content) : f.tags, updatedAt: new Date().toISOString() }
              : f
          ),
        }))
      },

      deleteFile: (id) => {
        set((s) => ({
          files: s.files.filter((f) => f.id !== id),
          openTabIds: s.openTabIds.filter((t) => t !== id),
          activeTabId: s.activeTabId === id ? s.openTabIds.find((t) => t !== id) ?? null : s.activeTabId,
          splitTabId: s.splitTabId === id ? null : s.splitTabId,
        }))
      },

      renameFile: (id, name) => {
        const clean = name.endsWith('.md') ? name : `${name}.md`
        set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, name: clean } : f) }))
      },

      openTab: (id) => {
        set((s) => ({
          openTabIds: s.openTabIds.includes(id) ? s.openTabIds : [...s.openTabIds, id],
          activeTabId: id,
          viewMode: s.viewMode === 'graph' ? 'editor' : s.viewMode,
        }))
      },

      closeTab: (id) => {
        set((s) => {
          const remaining = s.openTabIds.filter((t) => t !== id)
          return {
            openTabIds: remaining,
            activeTabId: s.activeTabId === id ? (remaining[remaining.length - 1] ?? null) : s.activeTabId,
            splitTabId: s.splitTabId === id ? null : s.splitTabId,
          }
        })
      },

      setActiveTab: (id) => set({ activeTabId: id }),
      setSplitTab: (id) => set({ splitTabId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),

      toggleFolder: (id) => {
        set((s) => ({ folders: s.folders.map((f) => f.id === id ? { ...f, open: !f.open } : f) }))
      },

      toggleStar: (id) => {
        set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, starred: !f.starred } : f) }))
      },

      importMarkdown: (name, content, folder = '') => {
        return get().createFile(name, folder, content)
      },

      createDailyNote: () => {
        const today = new Date()
        const name = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.md`
        const existing = get().files.find((f) => f.name === name && f.folder === 'Daily')
        if (existing) {
          set((s) => ({
            openTabIds: s.openTabIds.includes(existing.id) ? s.openTabIds : [...s.openTabIds, existing.id],
            activeTabId: existing.id,
          }))
          return existing
        }
        return get().createFile(name, 'Daily', `# ${today.toDateString()}\n\n## Today's Focus\n\n\n\n## Notes\n\n\n\n## Ideas\n\n`)
      },

      searchFiles: (q) => {
        const ql = q.toLowerCase()
        return get().files.filter(
          (f) => f.name.toLowerCase().includes(ql) || f.content.toLowerCase().includes(ql) || f.tags.some((t) => t.includes(ql))
        )
      },

      getFileById: (id) => get().files.find((f) => f.id === id),
      setSidebarWidth: (w) => set({ sidebarWidth: w }),

      moveToFolder: (id, folder) => {
        set((s) => ({
          files: s.files.map((f) => f.id === id ? { ...f, folder, updatedAt: new Date().toISOString() } : f),
        }))
      },

      duplicateFile: (id) => {
        const src = get().files.find((f) => f.id === id)
        if (!src) throw new Error('File not found')
        return get().createFile(`${src.name.replace('.md', '')} copy`, src.folder, src.content)
      },

      getOutgoingLinks: (id) => {
        const file = get().files.find((f) => f.id === id)
        if (!file) return []
        const refs = new Set<string>()
        const regex = /\[\[([^\]]+)\]\]/g
        let m
        while ((m = regex.exec(file.content)) !== null) refs.add(m[1].toLowerCase())
        return get().files.filter((f) => refs.has(f.name.replace('.md', '').toLowerCase()))
      },

      togglePin: (id) => {
        set((s) => ({
          pinnedIds: s.pinnedIds.includes(id) ? s.pinnedIds.filter(p => p !== id) : [...s.pinnedIds, id],
        }))
      },

      getBacklinks: (id) => {
        const file = get().files.find((f) => f.id === id)
        if (!file) return []
        const title = file.name.replace('.md', '')
        return get().files.filter((f) => f.id !== id && f.content.includes(`[[${title}]]`))
      },
    }),
    {
      name: 'cortex-vault',
      partialize: (s) => ({
        files: s.files,
        folders: s.folders,
        openTabIds: s.openTabIds,
        activeTabId: s.activeTabId,
        viewMode: s.viewMode,
        sidebarWidth: s.sidebarWidth,
        pinnedIds: s.pinnedIds,
      }),
    }
  )
)
