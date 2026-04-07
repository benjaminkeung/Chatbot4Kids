# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Chatbot4Kids** is a kid-safe AI chatbot with a multi-stage LLM agent pipeline. A child types a question; the system generates a response, refines it for age-appropriateness, filters sensitive content, and produces an illustrative image — all before showing anything to the child. The app is designed to run on a **Raspberry Pi** (ARM), so all LLM inference is remote (API calls only — no local models).

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (Kid UI)                          │
│   React SPA — chat window, history sidebar, AI label        │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST / SSE streaming
┌────────────────────────▼─────────────────────────────────────┐
│              FastAPI Backend  (backend/src/)                 │
│  • POST /api/chat          — triggers agent pipeline         │
│  • GET  /api/history       — list / load sessions           │
│  • GET  /api/config/model  — returns active model label     │
│  • GET|PUT /api/admin/*    — config & logs (token-guarded)  │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│           LangGraph Agent Pipeline  (backend/src/pipeline/)  │
│                                                              │
│  [kid_prompt]                                                │
│      │                                                       │
│      ▼                                                       │
│  Node 1 — LLM-1  (configurable: OpenAI / Gemini)            │
│      │    generate initial factual response                 │
│      ▼                                                       │
│  Node 2 — LLM-2  (content refiner + safety filter)          │
│      │    • simplify to reading level in filters.json       │
│      │    • strip violence / sexual / disturbing content    │
│      │    • remove follow-up questions                      │
│      │    • if entirely unsafe → emit safe fallback         │
│      ▼                                                       │
│  Node 3 — LLM-3  (image generation: DALL-E 3 / Imagen)      │
│      │    derive concise image prompt from refined text     │
│      ▼                                                       │
│  [final_response]  { text, image_url } → streamed to client │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                    Storage Layer                             │
│  • SQLite  data/chatbot.db     — sessions, messages, logs   │
│  • config/llm_config.json      — LLM per node (admin-only)  │
│  • config/filters.json         — content-filter rule set    │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend API | **FastAPI** + **Uvicorn** | async, ARM wheels available |
| Agent orchestration | **LangGraph** | stateful graph, streaming, pure-Python, ARM-safe |
| LLM provider SDKs | `openai`, `google-generativeai` | remote API only — no local inference |
| Image generation | DALL-E 3 (default) or Imagen via Gemini | remote API, no GPU needed |
| Database | **SQLite** via `SQLAlchemy` + `aiosqlite` | zero-server, file-based, low RAM |
| Frontend | **React** (Vite) + **Tailwind CSS** | build on dev machine; serve static files from Pi |
| Admin interface | Same FastAPI process, `/api/admin/*`, `ADMIN_TOKEN` env guard | no extra process |

> **Raspberry Pi rule**: never add a dependency that requires a local GPU or runs ML inference in-process. All intelligence comes from remote API calls.

---

## Directory Layout

```
Chatbot4Kids/
├── backend/
│   ├── src/
│   │   ├── server/          # FastAPI app, routes, admin auth middleware
│   │   ├── pipeline/        # LangGraph graph + node definitions
│   │   ├── models/          # SQLAlchemy ORM (Session, Message, Log)
│   │   └── services/        # db_service, log_service, config_loader
│   ├── config/
│   │   ├── llm_config.json  # active provider+model per node
│   │   └── filters.json     # content filter rules
│   ├── data/
│   │   └── chatbot.db       # SQLite (git-ignored)
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/      # ChatWindow, HistorySidebar, MessageBubble, ModelLabel
    │   ├── pages/           # ChatPage
    │   └── api/             # axios wrappers
    ├── package.json
    └── vite.config.ts
```

---

## Agent Pipeline — LangGraph Design

The pipeline is a **linear StateGraph** with typed state:

```python
class PipelineState(TypedDict):
    session_id: str
    kid_prompt: str
    llm1_response: str
    llm2_response: str      # refined, kid-safe text
    image_prompt: str
    image_url: str
    safe: bool              # set by Node 2; False short-circuits to fallback
    error: Optional[str]
```

Graph edges: `generate_response` → `refine_and_filter` → (conditional: safe?) → `generate_image` or `safe_fallback`.

Node 2 returns structured JSON `{"refined_text": "...", "safe": true}` so the conditional edge can branch without a second LLM call.

---

## Key Configuration Files

### `config/llm_config.json`
Edited by admin only. Controls provider and model per pipeline node.
```json
{
  "llm1": { "provider": "openai",  "model": "gpt-4o" },
  "llm2": { "provider": "openai",  "model": "gpt-4o-mini" },
  "llm3": { "provider": "openai",  "model": "dall-e-3" }
}
```
Supported providers: `"openai"`, `"gemini"`.

### `config/filters.json`
Drives LLM-2's system prompt dynamically. Add rules without touching Python code.
```json
{
  "reading_level": "grade 4",
  "max_words": 150,
  "remove_follow_up_questions": true,
  "blocked_categories": ["violence", "sexual_content", "horror", "drugs", "gambling"],
  "custom_rules": [
    "Replace all scientific jargon with everyday words a 9-year-old would know.",
    "Use short sentences."
  ]
}
```

---

## Data Flow (step-by-step)

1. Child submits prompt → `POST /api/chat` `{ session_id, prompt }`.
2. Backend persists raw prompt to SQLite, then invokes the LangGraph pipeline.
3. **Node 1**: LLM-1 generates a factual answer (no safety constraints at this stage).
4. **Node 2**: LLM-2 receives Node 1 output + a system prompt assembled from `filters.json`. Returns `{ refined_text, safe }`. If `safe: false`, pipeline short-circuits to a canned "I can't answer that" message.
5. **Node 3**: LLM-3 derives a short image-generation prompt from the refined text (e.g. "a simple colourful illustration of …") and calls the image API. Returns a URL.
6. `{ text, image_url }` is persisted to SQLite (full log of all three LLM calls) and streamed to the browser via SSE.
7. The Model Label in the UI is fetched from `GET /api/config/model` (read-only; the child cannot change it).
8. Each `session_id` groups messages; the history sidebar lists past sessions so the child can resume.

---

## Development Commands

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Dev server (auto-reload)
uvicorn src.server.main:app --reload --port 8000

# All tests
pytest tests/

# Single test
pytest tests/test_pipeline.py::test_refine_node -v
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # production build → frontend/dist/
npm run lint
```

FastAPI serves `frontend/dist/` as static files in production so only one process runs on the Pi.

### Environment variables (`backend/.env`)
```
OPENAI_API_KEY=
GEMINI_API_KEY=
ADMIN_TOKEN=           # Bearer token for /api/admin/* routes
DATABASE_URL=sqlite+aiosqlite:///./data/chatbot.db
```

---

## Raspberry Pi Deployment

- Build the React frontend on a dev machine (`npm run build`) and copy `dist/` to the Pi.
- Install Python deps on the Pi: `pip install -r requirements.txt` (all packages have ARM wheels).
- Run with: `uvicorn src.server.main:app --host 0.0.0.0 --port 8000`
- Optionally wrap with `systemd` for auto-start on boot.
- SQLite database lives on the Pi's SD card at `data/chatbot.db`.
- **No local ML libraries** (no `torch`, `transformers`, etc.) — the Pi only makes HTTPS calls to OpenAI/Google.

### `requirements.txt` — Pi-safe packages only
```
fastapi
uvicorn[standard]
langgraph
langchain-core
langchain-openai
langchain-google-genai
openai
google-generativeai
sqlalchemy
aiosqlite
python-dotenv
httpx
pydantic
```

---

## Admin Log Access

`GET /api/admin/logs` — paginated log of every interaction: kid prompt, LLM-1 raw response, LLM-2 refined response, image URL, timestamp, session ID.
All `/api/admin/*` routes require `Authorization: Bearer <ADMIN_TOKEN>`.
Filter by date: `?from=2024-01-01&to=2024-12-31`.

`PUT /api/admin/config` — update `llm_config.json` at runtime without restarting the server.
