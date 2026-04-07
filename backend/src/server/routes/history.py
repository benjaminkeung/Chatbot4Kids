from fastapi import APIRouter
from services.db_service import get_sessions, get_messages

router = APIRouter()


@router.get("/history")
async def list_sessions():
    return await get_sessions()


@router.get("/history/{session_id}")
async def get_session_messages(session_id: str):
    return await get_messages(session_id)
