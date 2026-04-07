from typing import Optional
from typing_extensions import TypedDict


class PipelineState(TypedDict):
    session_id: str
    kid_prompt: str
    llm_responder_response: str
    llm_editor_response: str    # refined, kid-safe text — structured as numbered paragraphs
    images: list            # [{text: str, image_url: str}, ...] one entry per paragraph
    safe: bool              # set by editor; False triggers safe fallback
    error: Optional[str]
