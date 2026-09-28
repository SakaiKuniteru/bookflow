from __future__ import annotations
from typing import Any, Awaitable, Callable

JOB_TYPE = "GENERATE_RECOMMENDATION"
WorkerService = Callable[[dict[str, Any], Callable[[dict[str, Any]], Awaitable[None]], dict[str, Any]], Awaitable[dict[str, Any]]]

def _kiem_tra_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("GENERATE_RECOMMENDATION payload phải là object.")
    if not isinstance(payload.get("context_type"), str) or not payload["context_type"].strip():
        raise ValueError("GENERATE_RECOMMENDATION thiếu context_type.")
    limit = payload.get("limit", 10)
    if not isinstance(limit, int) or limit < 1:
        raise ValueError("GENERATE_RECOMMENDATION limit không hợp lệ.")
    filters = payload.get("filters", {})
    if filters is not None and not isinstance(filters, dict):
        raise ValueError("GENERATE_RECOMMENDATION filters phải là object.")
    if "book_id" in payload and payload["book_id"] is not None and not isinstance(payload["book_id"], (str, int)):
        raise ValueError("GENERATE_RECOMMENDATION book_id không hợp lệ.")
    if "user_id" in payload and payload["user_id"] is not None and not isinstance(payload["user_id"], (str, int)):
        raise ValueError("GENERATE_RECOMMENDATION user_id không hợp lệ.")
    return payload

async def xu_ly(
    job: dict[str, Any],
    dich_vu: WorkerService,
    cap_nhat_tien_do: Callable[[dict[str, Any]], Awaitable[None]],
    worker_context: dict[str, Any],
) -> dict[str, Any]:
    payload = _kiem_tra_payload(job.get("payload"))
    return await dich_vu(payload, cap_nhat_tien_do, worker_context)