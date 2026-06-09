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
  Bold, Italic, Code, Heading1, Heading2, List, ListOrdered,
  CheckSquare, Quote, Link2, Highlighter, Type,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import type { GraphNode } from '../../types'

// WikiLink decoration extension
const WikiLinkExtension = Extension.create({
  name: 'wikilink',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikilink'),
        props: {
          decorations(state) {
            const { doc } = state
            const decorations: Decoration[] = []
            const regex = /\[\[([^\]]+)\]\]/g

            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              let match
              regex.lastIndex = 0
              while ((match = regex.exec(node.text)) !== null) {
                const from = pos + match.index
                const to = from + match[0].length
                decorations.push(
                  Decoration.inline(from, to, { class: 'wikilink', title: `Open: ${match[1]}` })
                )
              }
            })
            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})

const TOOLBAR_BUTTONS = [
  { icon: <Bold size={12} />, action: (e: any) => e.chain().focus().toggleBold().run(), title: 'Bold' },
  { icon: <Italic size={12} />, action: (e: any) => e.chain().focus().toggleItalic().run(), title: 'Italic' },
  { icon: <Code size={12} />, action: (e: any) => e.chain().focus().toggleCode().run(), title: 'Code' },
  { icon: <Highlighter size={12} />, action: (e: any) => e.chain().focus().toggleHighlight().run(), title: 'Highlight' },
  null, // divider
  { icon: <Heading1 size={12} />, action: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run(), title: 'H1' },
  { icon: <Heading2 size={12} />, action: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run(), title: 'H2' },
  null,
  { icon: <List size={12} />, action: (e: any) => e.chain().focus().toggleBulletList().run(), title: 'Bullet list' },
  { icon: <ListOrdered size={12} />, action: (e: any) => e.chain().focus().toggleOrderedList().run(), title: 'Ordered list' },
  { icon: <CheckSquare size={12} />, action: (e: any) => e.chain().focus().toggleTaskList().run(), title: 'Task list' },
  { icon: <Quote size={12} />, action: (e: any) => e.chain().focus().toggleBlockquote().run(), title: 'Blockquote' },
]

export default function NoteEditor({ node }: { node: GraphNode }) {
  const { updateNode } = useStore()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your thoughts… Use [[Node Name]] to link nodes.' }),
      CharacterCount,
      Highlight.configure({ multicolor: false }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      WikiLinkExtension,
    ],
    content: node.body ?? '',
    onUpdate: ({ editor }) => {
      updateNode(node.id, { body: editor.getHTML() })
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none',
      },
    },
  }, [node.id])

  const charCount = editor?.storage.characterCount?.characters() ?? 0
  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-white/[0.06] flex-wrap flex-shrink-0">
        {TOOLBAR_BUTTONS.map((btn, i) =>
          btn === null ? (
            <div key={i} className="w-px h-4 bg-white/[0.08] mx-1" />
          ) : (
            <button
              key={i}
              onClick={() => btn.action(editor)}
              title={btn.title}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-all"
            >
              {btn.icon}
            </button>
          )
        )}
      </div>

      {/* editor body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <EditorContent editor={editor} />
      </div>

      {/* footer */}
      <div className="px-5 py-2 border-t border-white/[0.06] flex items-center gap-3 flex-shrink-0">
        <span className="text-[10px] text-[var(--text-muted)]">{wordCount} words</span>
        <span className="text-[10px] text-[var(--text-muted)]">·</span>
        <span className="text-[10px] text-[var(--text-muted)]">{charCount} chars</span>
        <span className="ml-auto text-[10px] text-emerald-400">Auto-saved</span>
      </div>
    </div>
  )
}
