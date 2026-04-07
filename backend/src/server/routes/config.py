from fastapi import APIRouter
from services.config_loader import load_llm_config

router = APIRouter()


@router.get("/config/model")
async def get_model_label():
    cfg = load_llm_config()
    llm = cfg.get("llm_responder", {})
    return {
        "provider": llm.get("provider", ""),
        "model": llm.get("model", ""),
        "label": f"{llm.get('provider', '').capitalize()} {llm.get('model', '')}",
    }
