from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_internal_request_context
from app.schemas.goi_y import GoiYRequest
from app.services.recommendations import tao_ung_vien
from app.services.recommendations.tao_ung_vien import RecommendationContext

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
    recommendation_context = RecommendationContext.tu_dict({
        "context_type": body.context_type,
        "user_id": body.user_id,
        "source_book_id": body.book_id,
        "query": body.query,
        "filters": body.filters,
        "limit": body.limit,
    })
    result = await tao_ung_vien.tao_ung_vien_service.tao_ung_vien(
        recommendation_context,
        user_context=body.user_context,
        limit=body.limit,
    )
    return _success(
        context["request_id"],
        result
    )