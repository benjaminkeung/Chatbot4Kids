from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models.db import init_db
from server.routes import chat, history, config, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Chatbot4Kids", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,    prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(config.router,  prefix="/api")
app.include_router(admin.router,   prefix="/api/admin")

# Serve index.html for SPA routes (e.g. /admin)
_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

@app.get("/admin")
async def admin_spa():
    return FileResponse(_DIST / "index.html")

# Serve React build in production
app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="static")
