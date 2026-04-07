import json
from datetime import date

from sqlalchemy import select

from models.db import AsyncSessionLocal, Log


async def write_log(
    session_id: str,
    kid_prompt: str,
    responder_response: str,
    editor_response: str,
    images_json: str,
) -> None:
    async with AsyncSessionLocal() as db:
        db.add(Log(
            session_id=session_id,
            kid_prompt=kid_prompt,
            llm_responder_response=responder_response,
            llm_editor_response=editor_response,
            images_json=images_json,
        ))
        await db.commit()


async def get_logs(from_date: date | None = None, to_date: date | None = None, page: int = 1, page_size: int = 50) -> list[dict]:
    async with AsyncSessionLocal() as db:
        query = select(Log).order_by(Log.created_at.desc())
        if from_date:
            query = query.where(Log.created_at >= from_date)
        if to_date:
            query = query.where(Log.created_at <= to_date)
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        logs = result.scalars().all()
        return [
            {
                "id": str(l.id),
                "session_id": l.session_id,
                "kid_prompt": l.kid_prompt,
                "llm_responder_response": l.llm_responder_response,
                "llm_editor_response": l.llm_editor_response,
                "images": json.loads(l.images_json or "[]"),
                "created_at": str(l.created_at),
            }
            for l in logs
        ]
