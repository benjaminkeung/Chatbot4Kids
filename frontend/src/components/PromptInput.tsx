import { useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function PromptInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <div className="flex gap-2 p-3 border-t border-gray-200 bg-white">
      <input
        className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white"
        placeholder="Ask me anything…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={disabled}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white font-semibold rounded-full px-5 py-2"
      >
        Send
      </button>
    </div>
  )
}
