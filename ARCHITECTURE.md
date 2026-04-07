# Architecture

## Overview

Chatbot4Kids uses a three-node LangGraph pipeline to process every child prompt before anything is shown on screen. The pipeline is designed to be safe-first: content is generated, refined, filtered, then illustrated — in that order.

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (Kid UI)                          │
│   React SPA — chat window, history sidebar, model label     │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST + SSE streaming
┌────────────────────────▼─────────────────────────────────────┐
│              FastAPI Backend  (backend/src/)                 │
│  POST /api/chat          — triggers pipeline                 │
│  GET  /api/history       — list / load sessions             │
│  GET  /api/config/model  — active model label               │
│  GET|PUT /api/admin/*    — config & logs (token-guarded)    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│           LangGraph Pipeline  (backend/src/pipeline/)        │
│                                                              │
│  [kid_prompt]                                                │
│      │                                                       │
│      ▼                                                       │
│  Node 1 — llm_responder                                      │
│      │    Generates a factual answer (no safety filter yet)  │
│      ▼                                                       │
│  Node 2 — llm_editor                                         │
│      │    • Simplifies to target reading level               │
│      │    • Strips blocked content categories                │
│      │    • Formats as numbered paragraphs                   │
│      │    • Returns { refined_text, safe: bool }             │
│      ▼                                                       │
│  safe? ──No──► safe_fallback ("I can't answer that")        │
│      │Yes                                                    │
│      ▼                                                       │
│  Node 3 — llm_illustrator                                    │
│      │    • LLM extracts 2-3 keywords from full response     │
│      │    • OpenVerse API returns one open-license image URL │
│      ▼                                                       │
│  [images: [{text, image_url}, ...]]  → streamed to client   │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                    Storage Layer                             │
│  SQLite  data/chatbot.db   — sessions, messages, logs       │
│  config/llm_config.json    — provider + model per node      │
│  config/filters.json       — content filter rule set        │
└──────────────────────────────────────────────────────────────┘
```

---

## Pipeline State

The LangGraph pipeline passes a typed state dict between nodes:

```python
class PipelineState(TypedDict):
    session_id: str
    kid_prompt: str
    llm_responder_response: str   # raw answer from Node 1
    llm_editor_response: str      # refined, safe text from Node 2
    images: list                  # [{text, image_url}, ...] from Node 3
    safe: bool                    # False triggers safe_fallback branch
    error: Optional[str]
```

Graph edges:

```
generate_response → refine_and_filter → (safe?) → generate_images → END
                                      → (unsafe) → safe_fallback  → END
```

---

## Key Files

```
backend/src/
├── main.py                        # FastAPI app, mounts static files
├── pipeline/
│   ├── graph.py                   # StateGraph definition and compilation
│   ├── state.py                   # PipelineState TypedDict
│   └── nodes/
│       ├── generate.py            # Node 1: LLM responder
│       ├── refine.py              # Node 2: LLM editor + safety filter
│       └── illustrate.py          # Node 3: keyword extraction + image search
├── server/routes/
│   ├── chat.py                    # POST /api/chat (SSE stream)
│   ├── history.py                 # GET /api/history, /api/history/{id}
│   ├── config.py                  # GET /api/config/model
│   └── admin.py                   # GET /api/admin/logs, PUT /api/admin/config
├── models/
│   └── db.py                      # SQLAlchemy ORM: Session, Message, Log
└── services/
    ├── db_service.py              # Async DB helpers
    ├── log_service.py             # Interaction logger
    └── config_loader.py           # Reads llm_config.json, builds LLM instances
```

---

## Content Filter

Node 2's system prompt is assembled dynamically from `config/filters.json`:

```json
{
  "reading_level": "grade 6",
  "remove_follow_up_questions": true,
  "blocked_categories": ["violence", "sexual_content", "horror", "drugs", "gambling"],
  "custom_rules": ["Use short sentences."]
}
```

Node 2 returns structured JSON `{"refined_text": "...", "safe": true|false}`. If `safe` is false, the pipeline short-circuits to a canned fallback without calling Node 3.

---

## Image Search

Node 3 makes exactly two API calls per response:

1. **LLM call** — extracts 2–3 keywords from the full refined response (e.g. `"pokemon trading card"`)
2. **OpenVerse API** — searches for a free, open-license image matching those keywords

If the specific keyword query returns no results, the node retries with progressively shorter queries (dropping one word at a time) until a result is found.

OpenVerse requires no API key and returns Creative Commons licensed images.

---

## Streaming (SSE)

`POST /api/chat` returns a `text/event-stream` response. The client receives:

```
data: {"event": "node_complete", "node": "generate_response"}
data: {"event": "node_complete", "node": "refine_and_filter"}
data: {"event": "node_complete", "node": "generate_images"}
data: {"event": "done", "session_id": "...", "images": [...]}
```

The frontend updates a step label ("Answering…", "Checking for kids…", "Finding images…") as each node completes, then renders the full response when `done` is received.

---

## Database Schema

| Table | Columns |
|---|---|
| `sessions` | `id`, `title`, `created_at` |
| `messages` | `id`, `session_id`, `role`, `text`, `images_json`, `created_at` |
| `logs` | `id`, `session_id`, `kid_prompt`, `llm_responder_response`, `llm_editor_response`, `images_json`, `created_at` |

`images_json` stores a JSON array of `{text, image_url}` pairs, one per paragraph.

---

## Raspberry Pi Considerations

- All packages in `requirements.txt` have ARM-compatible wheels
- No `torch`, `transformers`, or any library requiring a local GPU
- The Pi makes outbound HTTPS calls only: Gemini API + OpenVerse API
- SQLite is used instead of a server database to minimise RAM usage
- The React frontend is pre-built on a dev machine and served as static files by FastAPI
