from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_internal_request_context
from app.schemas.tro_ly import TroLyRequest
from app.services.assistant import tro_chuyen

router = APIRouter(
    prefix="/internal/tro-ly",
    tags=["internal:tro-ly"]
)

def _success(
    request_id: str,
    data: Any,
    metadata: dict[str, Any] | None = None
) -> dict[str, Any]:
    return {
        "request_id": request_id,
        "success": True,
        "data": data,
        "metadata": metadata or {}
    }

@router.post(
    "",
    status_code=status.HTTP_200_OK
)
async def tro_ly(
    body: TroLyRequest,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await tro_chuyen.tro_chuyen(
        body.model_dump(mode="json"),
        context
    )
    return _success(
        context["request_id"],
        data
    )