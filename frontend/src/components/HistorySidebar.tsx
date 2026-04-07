import { useEffect, useState } from 'react'
import { listSessions } from '../api/client'

const PAGE_SIZE = 10

interface Props {
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
}

export default function HistorySidebar({ activeSessionId, onSelectSession, onNewChat }: Props) {
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    listSessions().then(setSessions)
  }, [])

  const shown = sessions.slice(0, visible)
  const hasMore = visible < sessions.length

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-3 gap-1 shrink-0">
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-2 mb-2"
      >
        <span className="text-lg leading-none">+</span> New Chat
      </button>
      <h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-1 px-2">Past Chats</h2>
      <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
        {shown.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`text-left text-sm rounded-lg px-3 py-2 truncate ${
              s.id === activeSessionId ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {s.title}
          </button>
        ))}
        {hasMore && (
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2 text-left"
          >
            Show more…
          </button>
        )}
      </div>
    </aside>
  )
}
