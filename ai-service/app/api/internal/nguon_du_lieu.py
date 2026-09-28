from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_internal_request_context
from app.schemas.nguon_du_lieu import NguonDuLieuTaoRequest
from app.services import nguon_du_lieu as nguon_du_lieu_service

router = APIRouter(
    prefix="/internal/nguon-du-lieu",
    tags=["internal:nguon-du-lieu"]
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
async def tao_nguon_du_lieu(
    body: NguonDuLieuTaoRequest,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await nguon_du_lieu_service.tao(
        body.model_dump(mode="json"),
        context
    )
    return _success(
        context["request_id"],
        data
    )

@router.get(
    "/{source_id}",
    status_code=status.HTTP_200_OK
)
async def lay_nguon_du_lieu(
    source_id: str,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await nguon_du_lieu_service.lay(
        source_id,
        context
    )
    return _success(
        context["request_id"],
        data
    )

@router.post(
    "/{source_id}/invalidate",
    status_code=status.HTTP_200_OK
)
async def invalidate_nguon_du_lieu(
    source_id: str,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await nguon_du_lieu_service.invalidate(
        source_id,
        context
    )
    return _success(
        context["request_id"],
        data
    )