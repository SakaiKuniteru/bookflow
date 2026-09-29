from __future__ import annotations
from fastapi import APIRouter, Depends
from app.core.dependencies import get_internal_request_context
from app.schemas.tro_ly import TroLyRequest
from app.services.assistant import tro_chuyen
router = APIRouter()
@router.post("")
async def tro_ly(
    body: TroLyRequest,
    request_context: dict = Depends(get_internal_request_context),
):
    payload = body.model_dump(mode="json")
    payload["request_context"] = request_context
    data = await tro_chuyen.tro_chuyen_service.chat(payload)
    return {"request_id": request_context["request_id"], "success": True, "data": data, "metadata": {}}