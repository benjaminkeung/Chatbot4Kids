# Chatbot4Kids

A kid-safe AI chatbot with a multi-stage LLM pipeline. Children ask questions in plain language and receive age-appropriate answers with illustrative images — all content is filtered and refined before anything is shown on screen.

Designed to run on a **Raspberry Pi** (ARM). All AI inference is handled by remote APIs; no local GPU or ML libraries are required.

---

## Features

- **Multi-stage safety pipeline** — every response is generated, refined for age-appropriateness, and filtered for sensitive content before display
- **Automatic image search** — each response is illustrated with a relevant open-license image from OpenVerse
- **Chat history** — past sessions are saved and resumable from the sidebar
- **Admin panel** — token-protected endpoint to review logs and update LLM configuration at runtime
- **Raspberry Pi ready** — lightweight stack with ARM-compatible dependencies only

---

## How It Works

```
Child types a question
        │
        ▼
 Node 1 — LLM generates a factual answer
        │
        ▼
 Node 2 — LLM refines to reading level, strips unsafe content
        │         └─ if unsafe → safe fallback message
        ▼
 Node 3 — LLM extracts keywords → OpenVerse image search
        │
        ▼
 { text + image } streamed to browser
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed breakdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Agent pipeline | LangGraph |
| LLM provider | Google Gemini (via `google-generativeai`) |
| Image search | OpenVerse API (free, no key required) |
| Database | SQLite via SQLAlchemy + aiosqlite |
| Frontend | React + Vite + Tailwind CSS |

---

## Project Structure

```
Chatbot4Kids/
├── backend/
│   ├── src/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── server/routes/       # API routes (chat, history, config, admin)
│   │   ├── pipeline/            # LangGraph graph + nodes
│   │   ├── models/              # SQLAlchemy ORM
│   │   └── services/            # DB, logging, config loader
│   ├── config/
│   │   ├── llm_config.json      # LLM provider + model per node
│   │   └── filters.json         # Content filter rules
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/          # ChatWindow, HistorySidebar, MessageBubble, etc.
    │   ├── pages/
    │   └── api/                 # API client (axios + SSE)
    ├── package.json
    └── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in your GEMINI_API_KEY and ADMIN_TOKEN

uvicorn src.main:app --reload --port 8000
```

### Frontend (development)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Frontend (production build)

```bash
cd frontend
npm run build      # outputs to frontend/dist/
```

FastAPI serves `frontend/dist/` as static files, so only one process is needed in production.

---

## Configuration

### `backend/config/llm_config.json`

Controls which LLM model is used at each pipeline stage:

```json
{
  "llm_responder":  { "provider": "gemini", "model": "gemini-2.0-flash" },
  "llm_editor":     { "provider": "gemini", "model": "gemini-2.0-flash" },
  "llm_illustrator":{ "provider": "gemini", "model": "gemini-2.0-flash" }
}
```

### `backend/config/filters.json`

Controls the content refinement rules applied by the editor LLM:

```json
{
  "reading_level": "grade 6",
  "remove_follow_up_questions": true,
  "blocked_categories": ["violence", "sexual_content", "horror", "drugs", "gambling"],
  "custom_rules": [
    "Use short sentences."
  ]
}
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `ADMIN_TOKEN` | Bearer token for `/api/admin/*` routes |
| `DATABASE_URL` | SQLite connection string (default provided) |

---

## Raspberry Pi Deployment

1. **Build the frontend** on your dev machine:
   ```bash
   cd frontend && npm run build
   ```

2. **Copy files to the Pi:**
   ```bash
   rsync -avz --exclude '.venv' --exclude '__pycache__' --exclude 'data/' backend/ pi@<PI_IP>:~/chatbot4kids/backend/
   rsync -avz frontend/dist/ pi@<PI_IP>:~/chatbot4kids/frontend/dist/
   ```

3. **On the Pi**, install dependencies and start:
   ```bash
   cd ~/chatbot4kids/backend
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env   # fill in your keys
   mkdir -p data
   PYTHONPATH=src uvicorn src.main:app --host 0.0.0.0 --port 8000
   ```

4. Open `http://<PI_IP>:8000` in a browser.

> No GPU, no local ML libraries. The Pi only makes HTTPS calls to the Gemini API and OpenVerse.

---

## Admin API

All admin routes require `Authorization: Bearer <ADMIN_TOKEN>`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/logs` | GET | Paginated interaction logs. Filter with `?from=&to=` |
| `/api/admin/config` | PUT | Update `llm_config.json` without restarting |

---

## License

MIT
