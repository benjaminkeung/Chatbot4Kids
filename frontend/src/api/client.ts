import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export async function getModelLabel() {
  const { data } = await api.get('/config/model')
  return data as { provider: string; model: string; label: string }
}

export async function listSessions() {
  const { data } = await api.get('/history')
  return data as { id: string; title: string; created_at: string }[]
}

export async function getSessionMessages(sessionId: string) {
  const { data } = await api.get(`/history/${sessionId}`)
  return data as { role: string; text: string; images: { text: string; image_url: string }[]; created_at: string }[]
}

/**
 * Send a prompt and consume the SSE stream.
 * Calls onDone with the final { session_id, images } payload.
 */
const STEP_LABELS: Record<string, string> = {
  generate_response: 'Answering…',
  refine_and_filter: 'Checking for kids…',
  generate_images:   'Finding images…',
  safe_fallback:     'Applying safety filter…',
}

export function sendChat(
  prompt: string,
  sessionId: string | null,
  onStep: (label: string) => void,
  onDone: (result: { session_id: string; images: { text: string; image_url: string }[] }) => void
) {
  const url = '/api/chat'
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, session_id: sessionId }),
  }).then(async (res) => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = JSON.parse(line.slice(6))
        if (payload.event === 'node_complete') onStep(STEP_LABELS[payload.node] ?? payload.node)
        if (payload.event === 'done') onDone(payload)
      }
    }
  })
}
