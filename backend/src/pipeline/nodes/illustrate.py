import asyncio
import re

import httpx

from pipeline.state import PipelineState
from services.config_loader import get_llm_illustrator_model_name

OPENVERSE_API = "https://api.openverse.org/v1/images/"


def _parse_paragraphs(text: str) -> list[str]:
    """Split text on numbered paragraph boundaries (1. / 1) / 1:)."""
    parts = re.split(r'\n(?=\d+[\.\)\:])', text.strip())
    return [p.strip() for p in parts if p.strip()]


async def _extract_keywords(paragraph: str, model_name: str) -> str:
    """Use the LLM to extract 2-3 image search keywords from a paragraph."""
    from google import genai

    import os
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    prompt = (
        "Extract 2 to 3 short search keywords from the text below "
        "that best represent the main topic for a single illustrative image. "
        "Return ONLY the keywords separated by spaces — no explanation, no punctuation.\n\n"
        f"Text: {paragraph[:500]}"
    )

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents=prompt,
            ),
            timeout=20,
        )
        return response.text.strip()
    except (Exception, asyncio.TimeoutError):
        # Fallback: first 3 words of the paragraph (strip number prefix)
        text = re.sub(r'^\d+[\.\)\:]\s*', '', paragraph).strip()
        return ' '.join(text.split()[:3])


async def _search_image(keywords: str) -> str:
    """Query OpenVerse for one safe, open-license image URL.
    Falls back to progressively shorter queries if nothing is found."""
    words = keywords.split()
    # Try full keywords, then drop one word at a time until we get a result
    queries = [' '.join(words[: max(1, len(words) - i)]) for i in range(len(words))]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for query in queries:
                params = {
                    "q": query,
                    "page_size": 3,
                    "mature": "false",
                    "license_type": "all-cc",
                }
                r = await client.get(OPENVERSE_API, params=params)
                r.raise_for_status()
                results = r.json().get("results", [])
                for item in results:
                    url = item.get("url", "")
                    if url:
                        return url
    except Exception:
        pass

    return ""


async def generate_images(state: PipelineState) -> PipelineState:
    paragraphs = _parse_paragraphs(state["llm_editor_response"])
    model_name = get_llm_illustrator_model_name()

    # One LLM call: extract keywords from the full response
    keywords = await _extract_keywords(state["llm_editor_response"], model_name)

    # One image search for the whole response
    image_url = await _search_image(keywords)

    # Attach the image to the first paragraph only; rest have no image
    images = [
        {"text": p, "image_url": image_url if i == 0 else ""}
        for i, p in enumerate(paragraphs)
    ]

    return {**state, "images": images}
