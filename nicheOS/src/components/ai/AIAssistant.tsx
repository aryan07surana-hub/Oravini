import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, X, Send, RotateCcw, ChevronDown } from 'lucide-react'
import { useStore } from '../../stores/useStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STARTER_PROMPTS = [
  'What are my biggest content opportunities?',
  'Which niche has the least competition?',
  'Suggest content angles for AI Productivity',
  'What keywords should I target first?',
  'Summarize my entire knowledge graph',
]

const MOCK_RESPONSES: Record<string, string> = {
  default: `Based on your knowledge graph, here's what I see:

**Top Opportunity**: The "AI + Obsidian workflows" gap (demand: 91, supply: 22) is your highest-signal opening. Zero serious competitors have covered this deeply — and your notes on PKM market research directly support it.

**Recommended first move**: Publish "Second Brain Setup in 2025" — your notes are already 94% depth-scored. Just add the Roam vs Notion vs Obsidian comparison table and it's ready.

**Niche play**: AI Productivity scores 87 opportunity vs 42 saturation. That's a green zone. Go deep before it closes.

Want me to draft an outline for any of these?`,
  opportunity: `Your 3 biggest content gaps right now:

1. **AI + Obsidian workflows** — 91 demand, 22 supply. Gap score: +54. Nobody owns this.
2. **Solopreneur AI stack 2025** — 85 demand, 18 supply. Gap score: +67. Massive upside.
3. **Bootstrapped to $50K MRR stories** — 88 demand, 40 supply. Gap score: +56.

All three can be 2,500-word pillar pieces. Start with #1 — it connects your AI Productivity niche directly to your existing Second Brain content.`,
  competition: `Lowest competition niches in your graph:

**AI Productivity** wins — 42% saturation vs 87 opportunity score. Competitors like Matt Wolfe dominate video but SEO coverage is thin. You can own the written/deep-dive layer.

**SaaS Founders** at 68% saturation is more crowded but your specific angle (AI workflows for bootstrapped founders) has almost no coverage at depth.

Move fast on AI Productivity. It's still early.`,
}

function getMockResponse(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('opportunit')) return MOCK_RESPONSES.opportunity
  if (q.includes('competition') || q.includes('niche')) return MOCK_RESPONSES.competition
  return MOCK_RESPONSES.default
}

export default function AIAssistant() {
  const { aiOpen, setAiOpen, nodes, selectedNode } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (aiOpen) inputRef.current?.focus()
  }, [aiOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = (text: string) => {
    const q = text.trim()
    if (!q || thinking) return
    setMessages((m) => [...m, { role: 'user', content: q }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      setMessages((m) => [...m, { role: 'assistant', content: getMockResponse(q) }])
    }, 900 + Math.random() * 600)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const reset = () => setMessages([])

  return (
    <AnimatePresence>
      {aiOpen && (
        <motion.div
          key="ai"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bottom-5 right-5 z-50 w-[420px] max-h-[600px] glass rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 0 60px rgba(124,58,237,0.2), 0 25px 50px rgba(0,0,0,0.5)' }}
        >
          {/* header */}
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
                <Sparkles size={13} className="text-purple-300" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border border-purple-500/30"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)]">AI Brain</p>
              <p className="text-[10px] text-[var(--text-muted)]">{nodes.length} nodes in context</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={reset} className="btn-ghost p-1.5" title="Clear chat">
                  <RotateCcw size={12} />
                </button>
              )}
              <button onClick={() => setAiOpen(false)} className="btn-ghost p-1.5">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3"
                  >
                    <Sparkles size={20} className="text-purple-300" />
                  </motion.div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Ask your second brain</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedNode ? `Context: ${selectedNode.label}` : 'Full graph context loaded'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="section-label">Quick prompts</p>
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-[var(--text-secondary)]
                        border border-white/[0.06] hover:border-purple-500/30 hover:bg-purple-600/5
                        hover:text-[var(--text-primary)] transition-all duration-150"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                        <Sparkles size={9} className="text-purple-300" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-purple-600/25 text-[var(--text-primary)] border border-purple-500/30'
                          : 'glass text-[var(--text-secondary)]'
                      }`}
                    >
                      <MarkdownText text={msg.content} />
                    </div>
                  </motion.div>
                ))}
                {thinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={9} className="text-purple-300" />
                    </div>
                    <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-purple-400"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* input */}
          <div className="px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
            <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-purple-500/40 transition-all">
              <textarea
                ref={inputRef}
                className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none resize-none placeholder:text-[var(--text-muted)] leading-relaxed"
                placeholder="Ask anything about your graph..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                style={{ maxHeight: 100 }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || thinking}
                className="p-1.5 rounded-lg bg-purple-600 text-white disabled:opacity-30 hover:bg-purple-500 transition-all flex-shrink-0"
              >
                <Send size={11} />
              </button>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 text-center">Enter to send · Shift+Enter for newline</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-[var(--text-primary)] font-semibold">{part.slice(2, -2)}</strong>
        }
        return <span key={i} style={{ whiteSpace: 'pre-line' }}>{part}</span>
      })}
    </>
  )
}
