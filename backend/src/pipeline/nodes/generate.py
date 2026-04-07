from langchain_core.prompts import ChatPromptTemplate

from pipeline.state import PipelineState
from services.config_loader import get_llm_responder

_SYSTEM_PROMPT = (
    "You are a knowledgeable assistant answering questions for children. "
    "Provide accurate, educational, and thorough answers. "
    "Focus on facts — content safety and formatting will be handled in a later step."
)

_prompt = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM_PROMPT),
    ("human", "{question}"),
])


async def generate_response(state: PipelineState) -> PipelineState:
    chain = _prompt | get_llm_responder()
    result = await chain.ainvoke({"question": state["kid_prompt"]})
    raw = result.content
    if isinstance(raw, list):
        raw = " ".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw)
    return {**state, "llm_responder_response": raw}
