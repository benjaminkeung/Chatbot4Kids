import json
from pathlib import Path
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from server.middleware.admin_auth import require_admin
from services.log_service import get_logs

router = APIRouter(dependencies=[Depends(require_admin)])

CONFIG_DIR = Path(__file__).parent.parent.parent.parent / "config"


@router.get("/logs")
async def logs(
    from_date: date | None = None,
    to_date: date | None = None,
    page: int = 1,
    page_size: int = 50,
):
    return await get_logs(from_date=from_date, to_date=to_date, page=page, page_size=page_size)


@router.get("/config")
async def get_config():
    with open(CONFIG_DIR / "llm_config.json") as f:
        llm = json.load(f)
    with open(CONFIG_DIR / "filters.json") as f:
        filters = json.load(f)
    return {"llm_config": llm, "filters": filters}


class LLMConfigUpdate(BaseModel):
    llm_config: dict


class FiltersUpdate(BaseModel):
    filters: dict


@router.put("/config/llm")
async def update_llm_config(body: LLMConfigUpdate):
    with open(CONFIG_DIR / "llm_config.json", "w") as f:
        json.dump(body.llm_config, f, indent=2)
    return {"status": "updated"}


@router.put("/config/filters")
async def update_filters(body: FiltersUpdate):
    with open(CONFIG_DIR / "filters.json", "w") as f:
        json.dump(body.filters, f, indent=2)
    return {"status": "updated"}
