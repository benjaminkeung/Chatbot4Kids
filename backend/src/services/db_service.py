import json
import uuid

from sqlalchemy import select

from models.db import AsyncSessionLocal, Session, Message


async def create_session(title: str = "New Chat") -> str:
    session_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        db.add(Session(id=session_id, title=title))
        await db.commit()
    return session_id


async def save_message(session_id: str, role: str, text: str, images_json: str = "[]") -> None:
    async with AsyncSessionLocal() as db:
        db.add(Message(session_id=session_id, role=role, text=text, images_json=images_json))
        await db.commit()


async def get_sessions() -> list[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).order_by(Session.created_at.desc()))
        sessions = result.scalars().all()
        return [{"id": s.id, "title": s.title, "created_at": str(s.created_at)} for s in sessions]


async def delete_session(session_id: str) -> bool:
    from sqlalchemy import delete as sql_delete
    async with AsyncSessionLocal() as db:
        session = await db.get(Session, session_id)
        if not session:
            return False
        await db.execute(sql_delete(Message).where(Message.session_id == session_id))
        await db.delete(session)
        await db.commit()
        return True


async def get_messages(session_id: str) -> list[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()
        return [
            {
                "role": m.role,
                "text": m.text,
                "images": json.loads(m.images_json or "[]"),
                "created_at": str(m.created_at),
            }
            for m in messages
        ]
