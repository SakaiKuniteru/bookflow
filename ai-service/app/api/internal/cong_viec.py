from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, Header, status
from app.core.dependencies import get_internal_request_context
from app.schemas.cong_viec import CongViecTaoRequest
from app.services import cong_viec as cong_viec_service

router = APIRouter(
    prefix="/internal/cong-viec",
    tags=["internal:cong-viec"]
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
    status_code=status.HTTP_202_ACCEPTED
)
async def tao_cong_viec(
    body: CongViecTaoRequest,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    ),
    idempotency_key: str | None = Header(
        default=None,
        alias="Idempotency-Key"
    )
) -> dict[str, Any]:
    payload = body.model_dump(mode="json")
    if idempotency_key:
        payload["idempotency_key"] = idempotency_key
    data = await cong_viec_service.tao(
        payload,
        context
    )
    return _success(
        context["request_id"],
        data,
        {
            "accepted": True
        }
    )

@router.get(
    "/{job_id}",
    status_code=status.HTTP_200_OK
)
async def lay_cong_viec(
    job_id: str,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await cong_viec_service.lay(
        job_id,
        context
    )
    return _success(
        context["request_id"],
        data
    )

@router.post(
    "/{job_id}/retry",
    status_code=status.HTTP_202_ACCEPTED
)
async def retry_cong_viec(
    job_id: str,
    context: dict[str, Any] = Depends(
        get_internal_request_context
    )
) -> dict[str, Any]:
    data = await cong_viec_service.retry(
        job_id,
        context
    )
    return _success(
        context["request_id"],
        data,
        {
            "accepted": True
        }
    )