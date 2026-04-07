from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from pipeline.graph import pipeline
from services.db_service import save_message, create_session
from services.log_service import write_log

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str | None = None
    prompt: str


@router.post("/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id or await create_session(title=req.prompt[:40])

    await save_message(session_id, role="user", text=req.prompt)

    initial_state = {
        "session_id": session_id,
        "kid_prompt": req.prompt,
        "llm_responder_response": "",
        "llm_editor_response": "",
        "images": [],
        "safe": True,
        "error": None,
    }

    async def event_stream():
        final_state = None
        try:
            async for event in pipeline.astream(initial_state):
                node_name = list(event.keys())[0]
                yield f"data: {json.dumps({'event': 'node_complete', 'node': node_name})}\n\n"
                final_state = list(event.values())[0]
        except Exception as exc:
            yield f"data: {json.dumps({'event': 'error', 'message': str(exc)})}\n\n"
            return

        if final_state:
            images = final_state.get("images", [])
            try:
                await save_message(
                    session_id,
                    role="assistant",
                    text=final_state.get("llm_editor_response", ""),
                    images_json=json.dumps(images),
                )
                await write_log(
                    session_id=session_id,
                    kid_prompt=req.prompt,
                    responder_response=final_state.get("llm_responder_response", ""),
                    editor_response=final_state.get("llm_editor_response", ""),
                    images_json=json.dumps(images),
                )
            except Exception as db_exc:
                import logging
                logging.getLogger(__name__).error("DB write failed: %s", db_exc)
            payload = {
                "event": "done",
                "session_id": session_id,
                "images": images,
            }
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
