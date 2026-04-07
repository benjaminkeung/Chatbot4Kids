import { useEffect, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: '/api/admin' })

// ── Types ──────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string
  session_id: string
  kid_prompt: string
  llm_editor_response: string
  llm_responder_response: string
  created_at: string
}

interface Filters {
  reading_level: string
  remove_follow_up_questions: boolean
  blocked_categories: string[]
  custom_rules: string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ── Login screen ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.get('/logs?page_size=1', { headers: authHeader(token) })
      localStorage.setItem('admin_token', token)
      onLogin(token)
    } catch {
      setError('Invalid token. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-1">Parent & Teacher Access</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your admin token to continue.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Activity Log tab ───────────────────────────────────────────────────────────

function ActivityLog({ token }: { token: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = async (p = 1) => {
    setLoading(true)
    const params: Record<string, string | number> = { page: p, page_size: 20 }
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    const { data } = await api.get('/logs', { headers: authHeader(token), params })
    setLogs(data)
    setPage(p)
    setLoading(false)
  }

  useEffect(() => { fetchLogs(1) }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={() => fetchLogs(1)}
          className="bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-blue-600">
          Search
        </button>
        <button onClick={() => { setFromDate(''); setToDate(''); fetchLogs(1) }}
          className="text-gray-500 text-sm hover:text-gray-700">
          Clear
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No activity found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                  <p className="text-sm font-medium text-gray-800">
                    <span className="text-gray-400 mr-1">Q:</span>{log.kid_prompt}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    <span className="text-gray-400 mr-1">A:</span>{log.llm_editor_response}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
                >
                  {expandedId === log.id ? 'Less' : 'More'}
                </button>
              </div>
              {expandedId === log.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Full refined answer</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.llm_editor_response}</p>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-2">Raw AI response (unfiltered)</p>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">{log.llm_responder_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex gap-2 items-center">
        <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">← Prev</button>
        <span className="text-sm text-gray-400">Page {page}</span>
        <button disabled={logs.length < 20} onClick={() => fetchLogs(page + 1)}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">Next →</button>
      </div>
    </div>
  )
}

// ── Content Settings tab ───────────────────────────────────────────────────────

function ContentSettings({ token }: { token: string }) {
  const [filters, setFilters] = useState<Filters | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newRule, setNewRule] = useState('')

  useEffect(() => {
    api.get('/config', { headers: authHeader(token) }).then(({ data }) => {
      setFilters(data.filters)
      setLoading(false)
    })
  }, [])

  const save = async () => {
    if (!filters) return
    setSaving(true)
    await api.put('/config/filters', { filters }, { headers: authHeader(token) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !filters) return <p className="text-gray-400 text-sm">Loading…</p>

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Reading level */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Reading Level</label>
        <select
          value={filters.reading_level}
          onChange={(e) => setFilters({ ...filters, reading_level: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {['grade 1','grade 2','grade 3','grade 4','grade 5','grade 6',
            'grade 7','grade 8','grade 9','grade 10','grade 11','grade 12'].map((g) => (
            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Remove follow-up questions */}
      <div className="flex items-center gap-3">
        <input
          id="remove-followup"
          type="checkbox"
          checked={filters.remove_follow_up_questions}
          onChange={(e) => setFilters({ ...filters, remove_follow_up_questions: e.target.checked })}
          className="w-4 h-4 accent-blue-500"
        />
        <label htmlFor="remove-followup" className="text-sm text-gray-700">Remove follow-up questions from responses</label>
      </div>

      {/* Blocked categories */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Blocked Categories</label>
        <div className="flex flex-wrap gap-2">
          {filters.blocked_categories.map((cat) => (
            <span key={cat} className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-xs">
              {cat}
              <button
                onClick={() => setFilters({ ...filters, blocked_categories: filters.blocked_categories.filter((c) => c !== cat) })}
                className="hover:text-red-900 font-bold"
              >×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add category…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCategory.trim()) {
                setFilters({ ...filters, blocked_categories: [...filters.blocked_categories, newCategory.trim()] })
                setNewCategory('')
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => {
              if (newCategory.trim()) {
                setFilters({ ...filters, blocked_categories: [...filters.blocked_categories, newCategory.trim()] })
                setNewCategory('')
              }
            }}
            className="bg-gray-100 text-gray-700 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-200"
          >Add</button>
        </div>
      </div>

      {/* Custom rules */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Custom Rules</label>
        {filters.custom_rules.map((rule, i) => (
          <div key={i} className="flex gap-2 items-start">
            <p className="text-sm text-gray-600 flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{rule}</p>
            <button
              onClick={() => setFilters({ ...filters, custom_rules: filters.custom_rules.filter((_, j) => j !== i) })}
              className="text-gray-400 hover:text-red-500 mt-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a custom rule…"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newRule.trim()) {
                setFilters({ ...filters, custom_rules: [...filters.custom_rules, newRule.trim()] })
                setNewRule('')
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => {
              if (newRule.trim()) {
                setFilters({ ...filters, custom_rules: [...filters.custom_rules, newRule.trim()] })
                setNewRule('')
              }
            }}
            className="bg-gray-100 text-gray-700 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-200"
          >Add</button>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="self-start bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
      >
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────

type Tab = 'logs' | 'settings'

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'))
  const [tab, setTab] = useState<Tab>('logs')

  if (!token) return <LoginScreen onLogin={setToken} />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Parent & Teacher Dashboard</h1>
          <p className="text-xs text-gray-400">Chatbot4Kids admin panel</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-blue-500 hover:text-blue-700">← Back to chat</a>
          <button
            onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >Sign out</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-6">
          {([['logs', 'Activity Log'], ['settings', 'Content Settings']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="px-6 py-6 max-w-4xl">
        {tab === 'logs' && <ActivityLog token={token} />}
        {tab === 'settings' && <ContentSettings token={token} />}
      </main>
    </div>
  )
}
