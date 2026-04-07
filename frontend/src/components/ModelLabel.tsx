import { useEffect, useState } from 'react'
import { getModelLabel } from '../api/client'

interface Props {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export default function ModelLabel({ onToggleSidebar, sidebarOpen }: Props) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    getModelLabel().then((d) => setLabel(d.label))
  }, [])

  return (
    <div className="bg-white border-b border-gray-200 flex items-center px-3 py-2">
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="text-gray-400 hover:text-gray-700 mr-3"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
      </button>
      <span className="flex-1 text-center text-gray-400 text-xs font-medium tracking-wide">
        Powered by {label || '…'}
      </span>
    </div>
  )
}
