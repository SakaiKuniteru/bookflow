from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_internal_request_context
from app.schemas.goi_y import GoiYRequest
from app.services.recommendations import tao_ung_vien

router = APIRouter(
    prefix="/internal/goi-y",
    tags=["internal:goi-y"]
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
async def goi_y(
    body: GoiYRequest,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await tao_ung_vien.goi_y(
        body.model_dump(mode="json"),
        context
    )
    return _success(
        context["request_id"],
        data
    )