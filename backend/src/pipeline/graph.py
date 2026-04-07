from langgraph.graph import StateGraph, END

from pipeline.state import PipelineState
from pipeline.nodes.generate import generate_response
from pipeline.nodes.refine import refine_and_filter
from pipeline.nodes.illustrate import generate_images

SAFE_FALLBACK_MESSAGE = "I'm sorry, I can't answer that question. Please ask me something else!"


def safe_fallback(state: PipelineState) -> PipelineState:
    return {**state, "llm_editor_response": SAFE_FALLBACK_MESSAGE, "images": []}


def route_after_refine(state: PipelineState) -> str:
    return "generate_images" if state.get("safe", True) else "safe_fallback"


def build_pipeline() -> StateGraph:
    graph = StateGraph(PipelineState)

    graph.add_node("generate_response", generate_response)
    graph.add_node("refine_and_filter", refine_and_filter)
    graph.add_node("generate_images", generate_images)
    graph.add_node("safe_fallback", safe_fallback)

    graph.set_entry_point("generate_response")
    graph.add_edge("generate_response", "refine_and_filter")
    graph.add_conditional_edges("refine_and_filter", route_after_refine)
    graph.add_edge("generate_images", END)
    graph.add_edge("safe_fallback", END)

    return graph.compile()


pipeline = build_pipeline()
