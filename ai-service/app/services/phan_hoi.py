from __future__ import annotations
from typing import Any
from app.core.exceptions import AIValidationException
from app.repositories.phan_hoi import phan_hoi_repository
async def tao(payload: dict[str, Any], request_context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise AIValidationException("Feedback phải là object.")
    return await phan_hoi_repository.tao(
        user_id=payload.get("user_id"),
        conversation_id=payload.get("conversation_id"),
        request_id=request_context.get("request_id"),
        message_id=payload.get("message_id"),
        feedback_type=str(payload.get("feedback_type") or "GENERAL"),
        rating=payload.get("rating"),
        content=payload.get("content"),
        reason=payload.get("reason"),
        metadata={
            **(payload.get("metadata") or {}),
            "request_id": request_context.get("request_id"),
        },
    )