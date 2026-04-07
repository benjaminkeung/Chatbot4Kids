import { useEffect, useState } from 'react'
import { listSessions, deleteSession } from '../api/client'

const PAGE_SIZE = 10

interface Props {
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onSessionDeleted: (id: string) => void
}

export default function HistorySidebar({ activeSessionId, onSelectSession, onNewChat, onSessionDeleted }: Props) {
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    listSessions().then(setSessions)
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setConfirmId(id)
  }

  const confirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setConfirmId(null)
    setHoveredId(null)
    onSessionDeleted(id)
  }

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmId(null)
  }

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
          <div
            key={s.id}
            className={`relative flex items-center rounded-lg ${
              s.id === activeSessionId ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            onMouseEnter={() => setHoveredId(s.id)}
            onMouseLeave={() => { setHoveredId(null); setConfirmId(null) }}
          >
            {confirmId === s.id ? (
              <div className="flex items-center gap-1 px-2 py-2 w-full">
                <span className="text-xs text-gray-600 flex-1">Delete?</span>
                <button
                  onClick={(e) => confirmDelete(e, s.id)}
                  className="text-xs bg-red-500 text-white rounded px-1.5 py-0.5 hover:bg-red-600"
                >
                  Yes
                </button>
                <button
                  onClick={cancelDelete}
                  className="text-xs bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 hover:bg-gray-300"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onSelectSession(s.id)}
                  className="text-left text-sm px-3 py-2 truncate flex-1 text-gray-700"
                >
                  {s.title}
                </button>
                {hoveredId === s.id && (
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="pr-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                    title="Delete chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
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
