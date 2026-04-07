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

export async function deleteSession(sessionId: string) {
  await api.delete(`/history/${sessionId}`)
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

function friendlyError(raw: string): string {
  if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE'))
    return "I'm a little busy right now. Please try again in a moment!"
  if (raw.includes('API key expired') || raw.includes('API_KEY_INVALID'))
    return "There's a configuration issue. Please ask your teacher or parent to check the settings."
  if (raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED'))
    return "I've answered a lot of questions today! Please try again later."
  if (raw.includes('timeout') || raw.includes('ReadTimeout'))
    return "That took too long to answer. Please try again."
  return "Something went wrong. Please try asking again!"
}

export function sendChat(
  prompt: string,
  sessionId: string | null,
  onStep: (label: string) => void,
  onDone: (result: { session_id: string; images: { text: string; image_url: string }[] }) => void,
  onError: (message: string) => void
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
        if (payload.event === 'error') onError(friendlyError(payload.message ?? ''))
      }
    }
  }).catch(() => onError("Couldn't reach the server. Please check your connection."))
}
