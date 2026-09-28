from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_internal_request_context
from app.schemas.tim_kiem import TimKiemRequest
from app.services.retrieval import tim_kiem_ket_hop

router = APIRouter(
    prefix="/internal/tim-kiem",
    tags=["internal:tim-kiem"]
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
async def tim_kiem(
    body: TimKiemRequest,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await tim_kiem_ket_hop.tim_kiem(
        body.model_dump(mode="json"),
        context
    )
    return _success(
        context["request_id"],
        data
    )