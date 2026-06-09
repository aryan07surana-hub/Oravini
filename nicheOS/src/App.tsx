import TopBar from './components/layout/TopBar'
import Sidebar from './components/layout/Sidebar'
import ContextDrawer from './components/layout/ContextDrawer'
import GraphCanvas from './components/graph/GraphCanvas'
import AIAssistant from './components/ai/AIAssistant'

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        {/* main canvas */}
        <main className="flex-1 relative overflow-hidden">
          <GraphCanvas />
          <AIAssistant />
        </main>
        <ContextDrawer />
      </div>
    </div>
  )
}
