from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_internal_request_context
from app.schemas.tro_ly import PhanHoiRequest
from app.services import phan_hoi as phan_hoi_service

router = APIRouter(
    prefix="/internal/phan-hoi",
    tags=["internal:phan-hoi"]
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
    status_code=status.HTTP_201_CREATED
)
async def tao_phan_hoi(
    body: PhanHoiRequest,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await phan_hoi_service.tao(
        body.model_dump(mode="json"),
        context
    )
    return _success(
        context["request_id"],
        data
    )