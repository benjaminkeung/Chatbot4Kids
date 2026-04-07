from fastapi import APIRouter, HTTPException
from services.db_service import get_sessions, get_messages, delete_session

router = APIRouter()


@router.get("/history")
async def list_sessions():
    return await get_sessions()


@router.get("/history/{session_id}")
async def get_session_messages(session_id: str):
    return await get_messages(session_id)


@router.delete("/history/{session_id}")
async def remove_session(session_id: str):
    deleted = await delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}
