import json
from pathlib import Path

from langchain_google_genai import ChatGoogleGenerativeAI

CONFIG_DIR = Path(__file__).parent.parent.parent / "config"


def load_llm_config() -> dict:
    with open(CONFIG_DIR / "llm_config.json") as f:
        return json.load(f)


def load_filters() -> dict:
    with open(CONFIG_DIR / "filters.json") as f:
        return json.load(f)


def _make_chat_llm(node_key: str):
    cfg = load_llm_config()[node_key]
    provider = cfg["provider"]
    model = cfg["model"]

    if provider == "gemini":
        return ChatGoogleGenerativeAI(model=model, request_timeout=30, max_retries=1)
    raise ValueError(f"Unsupported provider: {provider}")


def get_llm_responder():
    return _make_chat_llm("llm_responder")


def get_llm_editor():
    return _make_chat_llm("llm_editor")


def get_llm_illustrator_model_name() -> str:
    return load_llm_config()["llm_illustrator"]["model"]
