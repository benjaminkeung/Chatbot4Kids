import { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import HistorySidebar from './components/HistorySidebar'
import ModelLabel from './components/ModelLabel'

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-[#f9f9f9] font-sans">
      {sidebarOpen && (
        <HistorySidebar onSelectSession={setSessionId} activeSessionId={sessionId} onNewChat={() => setSessionId(null)} />
      )}
      <main className="flex flex-col flex-1 overflow-hidden">
        <ModelLabel onToggleSidebar={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />
        <ChatWindow sessionId={sessionId} onSessionCreated={setSessionId} />
      </main>
    </div>
  )
}
