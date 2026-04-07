import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import PromptInput from './PromptInput'
import { getSessionMessages, sendChat } from '../api/client'

interface ImageParagraph {
  text: string
  image_url: string
}

interface Message {
  role: 'user' | 'assistant'
  text: string
  images?: ImageParagraph[]
  isError?: boolean
}

interface Props {
  sessionId: string | null
  onSessionCreated: (id: string) => void
}

export default function ChatWindow({ sessionId, onSessionCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sessionId) { setMessages([]); return }
    getSessionMessages(sessionId).then((msgs) =>
      setMessages(msgs.map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text, images: m.images })))
    )
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (prompt: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: prompt }])
    setLoading(true)

    sendChat(
      prompt,
      sessionId,
      (label) => setStep(label),
      (result) => {
        const text = result.images.map((p) => p.text).join('\n\n')
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text, images: result.images },
        ])
        setLoading(false)
        setStep('')
        if (!sessionId) onSessionCreated(result.session_id)
      },
      (errorMessage) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: errorMessage, isError: true },
        ])
        setLoading(false)
        setStep('')
      }
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-20 text-lg">Ask me anything!</p>
        )}
        {messages.map((m, i) =>
          m.isError ? (
            <div key={i} className="flex justify-start mb-3">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl px-4 py-3 text-sm max-w-sm flex items-start gap-2">
                <span className="text-lg leading-none">⚠️</span>
                <span>{m.text}</span>
              </div>
            </div>
          ) : (
            <MessageBubble key={i} role={m.role} text={m.text} images={m.images} />
          )
        )}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-gray-400 italic text-sm">
              {step || 'Thinking…'}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <PromptInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
