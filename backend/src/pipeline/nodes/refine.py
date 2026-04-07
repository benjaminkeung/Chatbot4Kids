import json
from langchain_core.prompts import ChatPromptTemplate

from pipeline.state import PipelineState
from services.config_loader import get_llm_editor, load_filters


def build_system_prompt(filters: dict) -> str:
    rules = []
    rules.append(f"Rewrite the text so a child reading at {filters['reading_level']} can understand it.")

    if filters.get("remove_follow_up_questions"):
        rules.append("Remove any follow-up questions or prompts for further discussion.")

    for category in filters.get("blocked_categories", []):
        rules.append(f"Remove or neutralise any content related to: {category}.")

    for rule in filters.get("custom_rules", []):
        rules.append(rule)

    rules_text = "\n".join(f"- {r}" for r in rules)
    return (
        "You are a child-safety editor. Apply ALL of the following rules to the text provided:\n"
        f"{rules_text}\n\n"
        'Respond ONLY with valid JSON in this exact format: {{"refined_text": "...", "safe": true|false}}\n'
        'Set "safe" to false ONLY if the original content is so inappropriate that no safe version is possible.\n'
        'The "refined_text" value must be the numbered-paragraph formatted response as plain text.'
    )


async def refine_and_filter(state: PipelineState) -> PipelineState:
    filters = load_filters()
    system_prompt = build_system_prompt(filters)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{text}"),
    ])

    chain = prompt | get_llm_editor()
    result = await chain.ainvoke({"text": state["llm_responder_response"]})

    # result.content may be a string or a list of content parts
    raw = result.content
    if isinstance(raw, list):
        raw = " ".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw)

    # Strip markdown code fences if the model wraps the JSON
    content = raw.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        parsed = json.loads(content)
        refined_text = parsed.get("refined_text", "")
        safe = parsed.get("safe", True)
    except json.JSONDecodeError:
        refined_text = raw
        safe = True

    return {**state, "llm_editor_response": refined_text, "safe": safe}
